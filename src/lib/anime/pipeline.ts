import {
  buildImageCostPayload,
  buildImageToImagePrompt,
  buildImageToVideoPrompt,
  buildVideoCostPayload,
  DEFAULT_IMAGE_PROMPT_TEMPLATE,
  DEFAULT_VIDEO_PROMPT_TEMPLATE,
} from "@/lib/anime/prompts";
import { claimAnimeVideoSubmit, getAnimeJob, updateAnimeJob } from "@/lib/anime/jobs";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import {
  buildImageToImageRequest,
  buildImageToVideoRequest,
  findCompletedVideoBySourceImage,
  findVideoTaskBySourceImage,
  pollUntilComplete,
  queryCoinCost,
  submitGeneration,
  ensureVidmorReferenceUrl,
} from "@/lib/vidmor/client";
import { getAnimeCharacter, getPublicAssetUrl, resolveVidmorToken, GPT_IMAGE_20, SEEDANCE_20 } from "@/lib/vidmor/config";

/**
 * Submit the image->video generation for a job AT MOST ONCE.
 *
 * Safety guarantees (this is the ONLY place that ever submits a video):
 * - `claimAnimeVideoSubmit` atomically flips progress 60 -> 62, so concurrent callers
 *   (pipeline run + manual sync) can never both submit.
 * - If a completed video already exists on Vidmor for this exact comic image, reuse it.
 * - If a previous attempt already created an in-flight task for this comic image (e.g. the
 *   submit response was lost), reuse that task instead of creating a new one.
 * - `submitGeneration` itself never retries, so a slow/500 response cannot create duplicates.
 *
 * Returns the video task id, or null when the job already has a completed video.
 */
export async function submitVideoForJob(jobId: string): Promise<string | null> {
  const job = await getAnimeJob(jobId);
  if (!job) {
    throw new Error("任务不存在");
  }

  if (job.video_url) {
    return job.video_task_id;
  }

  if (!job.image_url) {
    throw new Error("缺少生成的图片，无法提交图生视频");
  }

  const token = resolveVidmorToken();
  if (!token) {
    throw new Error("未配置 VIDMOR_TOKEN");
  }

  if (job.video_task_id) {
    return job.video_task_id;
  }

  const existingVideo = await findCompletedVideoBySourceImage(job.image_url, job.created_at, token);
  if (existingVideo?.videoUrl) {
    await updateAnimeJob(jobId, {
      status: "success",
      stage: "completed",
      progress: 100,
      video_url: existingVideo.videoUrl,
      video_task_id: existingVideo.taskId,
      error_message: null,
    });
    return null;
  }

  const claimed = await claimAnimeVideoSubmit(jobId);
  if (!claimed) {
    const refreshed = await getAnimeJob(jobId);
    return refreshed?.video_task_id ?? null;
  }

  const inFlight = await findVideoTaskBySourceImage(job.image_url, job.created_at, token);
  let videoTaskId = inFlight?.taskId ?? null;

  if (!videoTaskId) {
    const videoTemplate = job.video_prompt_template || DEFAULT_VIDEO_PROMPT_TEMPLATE;
    const videoDuration = job.video_duration || SEEDANCE_20.duration;
    const videoResolution = job.video_resolution || SEEDANCE_20.resolution;
    const videoPrompt = buildImageToVideoPrompt(job.action, videoTemplate);

    const videoCost = await queryCoinCost(
      buildVideoCostPayload(videoPrompt, { duration: videoDuration, resolution: videoResolution }),
      token,
    );

    videoTaskId = await submitGeneration(
      buildImageToVideoRequest({
        prompt: videoPrompt,
        imageUrl: job.image_url,
        costCoin: videoCost,
        duration: videoDuration,
        resolution: videoResolution,
      }),
      token,
    );
  }

  await updateAnimeJob(jobId, {
    status: "running",
    stage: "image_to_video",
    progress: 70,
    video_task_id: videoTaskId,
    error_message: null,
  });

  return videoTaskId;
}

async function awaitVideoCompletion(jobId: string, videoTaskId: string, token: string) {
  const generatedVideoUrl = await pollUntilComplete(SEEDANCE_20.pollMethod, videoTaskId, {
    token,
    timeoutMs: 240_000,
    onTick: async (status) => {
      if (status === "processing" || status === "pending" || status === "running") {
        await updateAnimeJob(jobId, { progress: 85 });
      }
    },
  });

  await updateAnimeJob(jobId, {
    status: "success",
    stage: "completed",
    progress: 100,
    video_url: generatedVideoUrl,
    error_message: null,
  });
}

export async function runAnimePipeline(jobId: string) {
  const job = await getAnimeJob(jobId);
  if (!job) {
    throw new Error("任务不存在");
  }

  const token = resolveVidmorToken();
  if (!token) {
    throw new Error("未配置 VIDMOR_TOKEN");
  }

  const character = getAnimeCharacter(job.character_id);
  if (!character) {
    throw new Error("未找到角色配置");
  }

  const imageTemplate = job.image_prompt_template || DEFAULT_IMAGE_PROMPT_TEMPLATE;

  await updateAnimeJob(jobId, { status: "running", stage: "uploading", progress: 5 });

  const referenceSourceUrl =
    job.reference_image_url?.trim() || getPublicAssetUrl(character.refImagePath);
  const uploadedReferenceUrl = await ensureVidmorReferenceUrl(referenceSourceUrl, token);

  const imagePrompt = buildImageToImagePrompt(job.action, imageTemplate);
  await updateAnimeJob(jobId, { stage: "image_to_image", progress: 15 });

  const imageCost = await queryCoinCost(buildImageCostPayload(imagePrompt), token);

  const imageTaskId = await submitGeneration(
    buildImageToImageRequest({
      prompt: imagePrompt,
      imageUrl: uploadedReferenceUrl,
      costCoin: imageCost,
    }),
    token,
  );

  await updateAnimeJob(jobId, { progress: 20, image_task_id: imageTaskId });

  const generatedImageUrl = await pollUntilComplete(GPT_IMAGE_20.pollMethod, imageTaskId, {
    token,
    onTick: async (status) => {
      if (status === "processing" || status === "pending" || status === "running") {
        await updateAnimeJob(jobId, { progress: 45 });
      }
      if (status === "success" || status === "completed") {
        await updateAnimeJob(jobId, { progress: 55 });
      }
    },
  });

  await updateAnimeJob(jobId, {
    stage: "image_to_video",
    progress: 60,
    image_url: generatedImageUrl,
  });

  // Submit the video in this same run, immediately after the image is ready, so a job is
  // never left in a "image done, no video" state for a background loop to pick up later.
  const videoTaskId = await submitVideoForJob(jobId);
  if (videoTaskId) {
    await awaitVideoCompletion(jobId, videoTaskId, token);
  }
}

export async function runAnimePipelineSafe(jobId: string) {
  try {
    await runAnimePipeline(jobId);
  } catch (error) {
    const current = await getAnimeJob(jobId);
    if (current?.status === "success" || current?.video_url) {
      return;
    }

    const raw = error instanceof Error ? error.message : "生成失败";
    const isTimeout = /生成超时|timeout/i.test(raw);
    const message = /server internal error/i.test(raw)
      ? "图生图阶段失败：Vidmor 服务端报错（参数或参考图问题）。请重新上传参考图后再试。"
      : isTimeout
        ? "仍在 Vidmor 后台生成，系统会自动同步成片。"
        : raw;

    // A timeout typically happens while polling the video, after the task id is already saved;
    // keep the job running so read-only sync can finish it. Real errors fail the job.
    await updateAnimeJob(jobId, {
      status: isTimeout ? "running" : "failed",
      stage: isTimeout ? "image_to_video" : "failed",
      progress: isTimeout ? 85 : undefined,
      error_message: message,
    });
  } finally {
    await processAnimeJobQueue();
  }
}
