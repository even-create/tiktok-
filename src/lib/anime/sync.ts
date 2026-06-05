import { getAnimeJob, updateAnimeJob } from "@/lib/anime/jobs";
import { resumeAnimeJobVideoStage } from "@/lib/anime/pipeline";
import { resolveTaskMediaUrl } from "@/lib/vidmor/client";
import { GPT_IMAGE_20, resolveVidmorToken, SEEDANCE_20 } from "@/lib/vidmor/config";

function isSuccessStatus(status: string) {
  return status === "success" || status === "completed";
}

function normalizeUrlForMatch(url: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname);
  } catch {
    return decodeURIComponent(url.split("?")[0] ?? url);
  }
}

function taskMatchesSourceImage(platRequest: string | undefined, sourceImageUrl: string | null) {
  if (!sourceImageUrl) {
    return true;
  }

  if (!platRequest?.trim()) {
    return false;
  }

  const sourceKey = normalizeUrlForMatch(sourceImageUrl);
  return platRequest.includes(sourceImageUrl) || platRequest.includes(sourceKey);
}

async function resolveVideoForJob(
  job: NonNullable<Awaited<ReturnType<typeof getAnimeJob>>>,
  token: string,
) {
  if (!job.video_task_id) {
    return null;
  }

  const poll = await resolveTaskMediaUrl(SEEDANCE_20.pollMethod, job.video_task_id, token);
  if (!isSuccessStatus(poll.status) || !poll.mediaUrl) {
    return null;
  }

  const platRequest =
    typeof poll.raw === "object" && poll.raw && "platRequest" in poll.raw
      ? String((poll.raw as { platRequest?: string }).platRequest ?? "")
      : "";

  if (!taskMatchesSourceImage(platRequest, job.image_url)) {
    return null;
  }

  return {
    videoTaskId: job.video_task_id,
    videoUrl: poll.mediaUrl,
  };
}

async function tryResumeImageStage(job: NonNullable<Awaited<ReturnType<typeof getAnimeJob>>>, token: string) {
  if (!job.image_task_id || job.image_url) {
    return false;
  }

  const poll = await resolveTaskMediaUrl(GPT_IMAGE_20.pollMethod, job.image_task_id, token);
  if (!isSuccessStatus(poll.status) || !poll.mediaUrl) {
    return false;
  }

  await updateAnimeJob(job.id, {
    status: "running",
    stage: "image_to_video",
    progress: 60,
    image_url: poll.mediaUrl,
    video_url: null,
    video_task_id: null,
    error_message: null,
  });

  resumeAnimeJobVideoStage(job.id);
  return true;
}

async function resetMismatchedVideo(job: NonNullable<Awaited<ReturnType<typeof getAnimeJob>>>) {
  if (!job.image_url) {
    return false;
  }

  await updateAnimeJob(job.id, {
    status: "running",
    stage: "image_to_video",
    progress: 60,
    video_url: null,
    video_task_id: null,
    error_message: "检测到成片与当前漫画图不匹配，正在重新提交图生视频…",
  });

  resumeAnimeJobVideoStage(job.id);
  return true;
}

export async function syncAnimeJobFromVidmor(jobId: string) {
  const job = await getAnimeJob(jobId);
  if (!job) {
    throw new Error("任务不存在");
  }

  if (job.status === "success" || job.status === "failed") {
    return job;
  }

  const token = resolveVidmorToken();
  if (!token) {
    throw new Error("未配置 VIDMOR_TOKEN");
  }

  const completedVideo = await resolveVideoForJob(job, token);
  if (completedVideo?.videoUrl) {
    return updateAnimeJob(jobId, {
      status: "success",
      stage: "completed",
      progress: 100,
      video_url: completedVideo.videoUrl,
      video_task_id: completedVideo.videoTaskId,
      error_message: null,
    });
  }

  if (job.video_url && job.status === "running") {
    const validated = await resolveVideoForJob(
      { ...job, video_task_id: job.video_task_id },
      token,
    );
    if (validated?.videoUrl && validated.videoUrl === job.video_url) {
      return updateAnimeJob(jobId, {
        status: "success",
        stage: "completed",
        progress: 100,
        video_url: validated.videoUrl,
        video_task_id: validated.videoTaskId,
        error_message: null,
      });
    }

    if (await resetMismatchedVideo(job)) {
      return (await getAnimeJob(jobId)) ?? job;
    }
  }

  if (await tryResumeImageStage(job, token)) {
    return (await getAnimeJob(jobId)) ?? job;
  }

  if (job.image_url && !job.video_task_id && !job.video_url) {
    resumeAnimeJobVideoStage(jobId);
    return (await getAnimeJob(jobId)) ?? job;
  }

  return job;
}
