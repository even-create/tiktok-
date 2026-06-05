import { getAnimeJob, updateAnimeJob } from "@/lib/anime/jobs";
import { resumeAnimeJobVideoStage } from "@/lib/anime/pipeline";
import { resolveTaskMediaUrl, vidmorRequest } from "@/lib/vidmor/client";
import { GPT_IMAGE_20, resolveVidmorToken, SEEDANCE_20 } from "@/lib/vidmor/config";

type GenerateListItem = {
  domainId?: string;
  status?: string;
  platRequest?: string;
  platResponse?: string;
  createTime?: string;
  gmtCreate?: string;
};

function parsePlatResponse(platResponse?: string) {
  if (!platResponse?.trim()) {
    return null;
  }

  try {
    return JSON.parse(platResponse) as {
      method?: string;
      data?: {
        status?: string;
        resultUrl?: string;
        videoUrl?: string;
        imageUrl?: string;
        taskResult?: Array<{ url?: string; videoUrl?: string }>;
      };
    };
  } catch {
    return null;
  }
}

function extractMediaUrl(data: {
  resultUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  taskResult?: Array<{ url?: string; videoUrl?: string }>;
}) {
  const taskResult = Array.isArray(data.taskResult) ? data.taskResult : [];
  const firstResult = taskResult[0];

  return (
    data.resultUrl ||
    data.videoUrl ||
    data.imageUrl ||
    firstResult?.url ||
    firstResult?.videoUrl ||
    null
  );
}

function extractVideoUrl(item: GenerateListItem) {
  const plat = parsePlatResponse(item.platResponse);
  const data = plat?.data;
  if (!data) {
    return null;
  }

  return extractMediaUrl(data);
}

function itemCreatedAt(item: GenerateListItem) {
  const raw = item.createTime || item.gmtCreate;
  if (!raw) {
    return 0;
  }

  const parsed = Date.parse(raw.replace(" ", "T"));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isSuccessStatus(status: string) {
  return status === "success" || status === "completed";
}

async function findRecentVideoTask(jobCreatedAt: string, token: string) {
  const result = await vidmorRequest<{ data?: GenerateListItem[] }>({
    path: "/ai/common/generate/list",
    data: { pageNo: 1, pageSize: 40 },
    token,
  });

  if (result.body.code !== 0) {
    return null;
  }

  const jobTime = Date.parse(jobCreatedAt);
  const items = result.body.data?.data ?? [];

  for (const item of items) {
    if (!item.platRequest?.includes("imageToVideo")) {
      continue;
    }

    const createdAt = itemCreatedAt(item);
    if (createdAt && !Number.isNaN(jobTime)) {
      if (createdAt < jobTime - 120_000) {
        continue;
      }
    }

    const videoUrl = extractVideoUrl(item);
    const platStatus = parsePlatResponse(item.platResponse)?.data?.status ?? item.status ?? "";
    if (videoUrl && isSuccessStatus(String(platStatus).toLowerCase())) {
      return {
        taskId: item.domainId ?? null,
        videoUrl,
      };
    }

    if (item.domainId && (item.status === "pending" || item.status === "running" || item.status === "processing")) {
      return {
        taskId: item.domainId,
        videoUrl: null,
      };
    }
  }

  return null;
}

async function tryResolveCompletedVideo(job: NonNullable<Awaited<ReturnType<typeof getAnimeJob>>>, token: string) {
  let videoTaskId = job.video_task_id;
  let resolvedVideoUrl: string | null = null;

  if (videoTaskId) {
    const poll = await resolveTaskMediaUrl(SEEDANCE_20.pollMethod, videoTaskId, token);
    if (isSuccessStatus(poll.status) && poll.mediaUrl) {
      return { videoTaskId, videoUrl: poll.mediaUrl };
    }
  }

  if (job.stage === "image_to_video" || job.image_url) {
    const match = await findRecentVideoTask(job.created_at, token);
    if (match?.taskId) {
      videoTaskId = match.taskId;
      resolvedVideoUrl = match.videoUrl;

      if (!resolvedVideoUrl) {
        const poll = await resolveTaskMediaUrl(SEEDANCE_20.pollMethod, videoTaskId, token);
        if (isSuccessStatus(poll.status) && poll.mediaUrl) {
          resolvedVideoUrl = poll.mediaUrl;
        }
      }
    }
  }

  if (resolvedVideoUrl) {
    return { videoTaskId, videoUrl: resolvedVideoUrl };
  }

  return null;
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
    error_message: null,
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

  const completedVideo = await tryResolveCompletedVideo(job, token);
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

  if (await tryResumeImageStage(job, token)) {
    return (await getAnimeJob(jobId)) ?? job;
  }

  if (job.image_url && !job.video_task_id && !job.video_url) {
    resumeAnimeJobVideoStage(jobId);
    return (await getAnimeJob(jobId)) ?? job;
  }

  if (completedVideo?.videoTaskId && completedVideo.videoTaskId !== job.video_task_id) {
    return updateAnimeJob(jobId, {
      status: "running",
      stage: "image_to_video",
      progress: 85,
      video_task_id: completedVideo.videoTaskId,
      error_message: null,
    });
  }

  return job;
}
