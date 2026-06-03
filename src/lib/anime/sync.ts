import { getAnimeJob, updateAnimeJob } from "@/lib/anime/jobs";
import { pollGenerationStatus, vidmorRequest } from "@/lib/vidmor/client";
import { resolveVidmorToken, SEEDANCE_20 } from "@/lib/vidmor/config";

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
        taskResult?: Array<{ url?: string }>;
      };
    };
  } catch {
    return null;
  }
}

function extractVideoUrl(item: GenerateListItem) {
  const plat = parsePlatResponse(item.platResponse);
  const data = plat?.data;
  if (!data) {
    return null;
  }

  const taskResult = Array.isArray(data.taskResult) ? data.taskResult : [];
  return data.resultUrl || taskResult[0]?.url || null;
}

function itemCreatedAt(item: GenerateListItem) {
  const raw = item.createTime || item.gmtCreate;
  if (!raw) {
    return 0;
  }

  const parsed = Date.parse(raw.replace(" ", "T"));
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function findRecentVideoTask(jobCreatedAt: string, token: string) {
  const result = await vidmorRequest<{ data?: GenerateListItem[] }>({
    path: "/ai/common/generate/list",
    data: { pageNo: 1, pageSize: 20 },
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
      if (createdAt > jobTime + 30 * 60_000) {
        continue;
      }
    }

    const videoUrl = extractVideoUrl(item);
    if (videoUrl && (item.status === "success" || parsePlatResponse(item.platResponse)?.data?.status === "success")) {
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

  let videoTaskId = job.video_task_id;
  let resolvedVideoUrl: string | null = null;

  if (videoTaskId) {
    const poll = await pollGenerationStatus(SEEDANCE_20.pollMethod, videoTaskId, token);
    if ((poll.status === "success" || poll.status === "completed") && poll.mediaUrl) {
      resolvedVideoUrl = poll.mediaUrl;
    }
  } else if (job.stage === "image_to_video" || job.image_url) {
    const match = await findRecentVideoTask(job.created_at, token);
    if (match?.taskId) {
      videoTaskId = match.taskId;
      resolvedVideoUrl = match.videoUrl;

      if (!resolvedVideoUrl) {
        const poll = await pollGenerationStatus(SEEDANCE_20.pollMethod, videoTaskId, token);
        if ((poll.status === "success" || poll.status === "completed") && poll.mediaUrl) {
          resolvedVideoUrl = poll.mediaUrl;
        }
      }
    }
  }

  if (resolvedVideoUrl) {
    return updateAnimeJob(jobId, {
      status: "success",
      stage: "completed",
      progress: 100,
      video_url: resolvedVideoUrl,
      video_task_id: videoTaskId,
    });
  }

  if (videoTaskId && videoTaskId !== job.video_task_id) {
    return updateAnimeJob(jobId, {
      status: "running",
      stage: "image_to_video",
      progress: 85,
      video_task_id: videoTaskId,
    });
  }

  return job;
}
