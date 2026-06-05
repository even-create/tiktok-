import { after } from "next/server";
import {
  buildImageCostPayload,
  buildImageToImagePrompt,
  buildImageToVideoPrompt,
  buildVideoCostPayload,
  DEFAULT_IMAGE_PROMPT_TEMPLATE,
  DEFAULT_VIDEO_PROMPT_TEMPLATE,
} from "@/lib/anime/prompts";
import { getAnimeJob, updateAnimeJob } from "@/lib/anime/jobs";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import {
  buildImageToImageRequest,
  buildImageToVideoRequest,
  pollUntilComplete,
  queryCoinCost,
  submitGeneration,
  ensureVidmorReferenceUrl,
} from "@/lib/vidmor/client";
import { getAnimeCharacter, getPublicAssetUrl, resolveVidmorToken, GPT_IMAGE_20, SEEDANCE_20 } from "@/lib/vidmor/config";

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
  const videoTemplate = job.video_prompt_template || DEFAULT_VIDEO_PROMPT_TEMPLATE;
  const videoDuration = job.video_duration || SEEDANCE_20.duration;
  const videoResolution = job.video_resolution || SEEDANCE_20.resolution;

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

  const videoPrompt = buildImageToVideoPrompt(job.action, videoTemplate);
  const videoCost = await queryCoinCost(
    buildVideoCostPayload(videoPrompt, { duration: videoDuration, resolution: videoResolution }),
    token,
  );
  const videoTaskId = await submitGeneration(
    buildImageToVideoRequest({
      prompt: videoPrompt,
      imageUrl: generatedImageUrl,
      costCoin: videoCost,
      duration: videoDuration,
      resolution: videoResolution,
    }),
    token,
  );

  await updateAnimeJob(jobId, {
    stage: "image_to_video",
    progress: 70,
    video_task_id: videoTaskId,
  });

  const generatedVideoUrl = await pollUntilComplete(SEEDANCE_20.pollMethod, videoTaskId, {
    token,
    timeoutMs: 280_000,
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
  });
}

export async function runVideoStageOnly(jobId: string) {
  const job = await getAnimeJob(jobId);
  if (!job) {
    throw new Error("任务不存在");
  }

  if (job.video_url) {
    return;
  }

  if (!job.image_url) {
    throw new Error("缺少生成的图片，无法提交图生视频");
  }

  const token = resolveVidmorToken();
  if (!token) {
    throw new Error("未配置 VIDMOR_TOKEN");
  }

  const videoTemplate = job.video_prompt_template || DEFAULT_VIDEO_PROMPT_TEMPLATE;
  const videoDuration = job.video_duration || SEEDANCE_20.duration;
  const videoResolution = job.video_resolution || SEEDANCE_20.resolution;
  const videoPrompt = buildImageToVideoPrompt(job.action, videoTemplate);

  let videoTaskId = job.video_task_id;
  if (!videoTaskId) {
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

    await updateAnimeJob(jobId, {
      status: "running",
      stage: "image_to_video",
      progress: 70,
      video_task_id: videoTaskId,
      error_message: null,
    });
  }

  const generatedVideoUrl = await pollUntilComplete(SEEDANCE_20.pollMethod, videoTaskId, {
    token,
    timeoutMs: 280_000,
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

export async function runVideoStageSafe(jobId: string) {
  try {
    await runVideoStageOnly(jobId);
  } catch (error) {
    const current = await getAnimeJob(jobId);
    if (current?.status === "success" || current?.video_url) {
      return;
    }

    const raw = error instanceof Error ? error.message : "图生视频失败";
    const isTimeout = /生成超时|timeout/i.test(raw);

    await updateAnimeJob(jobId, {
      status: isTimeout ? "running" : "failed",
      stage: isTimeout ? "image_to_video" : "failed",
      progress: isTimeout ? 85 : undefined,
      error_message: isTimeout
        ? "图生视频仍在 Vidmor 后台生成，系统会自动同步成片。"
        : raw,
    });
  } finally {
    await processAnimeJobQueue();
  }
}

export function resumeAnimeJobVideoStage(jobId: string) {
  after(async () => {
    await runVideoStageSafe(jobId);
  });
}

export async function runAnimePipelineSafe(jobId: string) {
  try {
    await runAnimePipeline(jobId);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "生成失败";
    const isTimeout = /生成超时|timeout/i.test(raw);
    const message = /server internal error/i.test(raw)
      ? "图生图阶段失败：Vidmor 服务端报错（参数或参考图问题）。请重新上传参考图后再试，或在 vidmor.ai 用同模型验证。"
      : isTimeout
        ? "图生视频仍在 Vidmor 后台生成，系统会自动同步成片。"
        : raw;

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
