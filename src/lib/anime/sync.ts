import { getAnimeJob, updateAnimeJob } from "@/lib/anime/jobs";
import { findCompletedVideoBySourceImage, resolveTaskMediaUrl } from "@/lib/vidmor/client";
import { GPT_IMAGE_20, resolveVidmorToken, SEEDANCE_20 } from "@/lib/vidmor/config";

function isSuccessStatus(status: string) {
  return status === "success" || status === "completed";
}

async function pollStoredVideoTask(videoTaskId: string, token: string) {
  const poll = await resolveTaskMediaUrl(SEEDANCE_20.pollMethod, videoTaskId, token);
  if (isSuccessStatus(poll.status) && poll.mediaUrl) {
    return {
      videoTaskId,
      videoUrl: poll.mediaUrl,
    };
  }

  return null;
}

async function findVideoBySourceImage(
  job: NonNullable<Awaited<ReturnType<typeof getAnimeJob>>>,
  token: string,
) {
  if (!job.image_url) {
    return null;
  }

  const match = await findCompletedVideoBySourceImage(job.image_url, job.created_at, token);
  if (!match?.videoUrl) {
    return null;
  }

  return {
    videoTaskId: match.taskId,
    videoUrl: match.videoUrl,
  };
}

async function resolveVideoForJob(
  job: NonNullable<Awaited<ReturnType<typeof getAnimeJob>>>,
  token: string,
) {
  if (job.video_task_id) {
    const fromTaskId = await pollStoredVideoTask(job.video_task_id, token);
    if (fromTaskId) {
      return fromTaskId;
    }
  }

  return findVideoBySourceImage(job, token);
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

  return true;
}

/** Read-only: pull Vidmor status into Tracker without submitting new generations. */
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
    const validated = await resolveVideoForJob(job, token);
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

    await updateAnimeJob(jobId, {
      video_url: null,
      error_message: "已清除不匹配的成片记录，正在等待 Vidmor 同步正确视频…",
    });
    return (await getAnimeJob(jobId)) ?? job;
  }

  if (await tryResumeImageStage(job, token)) {
    return (await getAnimeJob(jobId)) ?? job;
  }

  if (job.image_url && job.video_task_id) {
    await updateAnimeJob(jobId, {
      error_message: "Vidmor 视频仍在生成中，请稍后再同步。",
    });
  } else if (job.image_url && !job.video_url) {
    await updateAnimeJob(jobId, {
      error_message: "漫画图已就绪，等待提交图生视频。",
    });
  }

  return job;
}
