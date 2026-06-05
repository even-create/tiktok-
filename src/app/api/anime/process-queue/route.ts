import { NextResponse } from "next/server";
import { listActiveAnimeJobs, listRecentAnimeJobs, resolveMaxConcurrentAnimeJobs } from "@/lib/anime/jobs";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";
import { requireAuth } from "@/lib/workspace/require-auth";
import { getVidmorConfigStatus, isVidmorConfigured } from "@/lib/vidmor/config";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    if (!isVidmorConfigured()) {
      return NextResponse.json({ error: "未配置 Vidmor" }, { status: 400 });
    }

    const queueResult = await processAnimeJobQueue();

    const activeJobs = await listActiveAnimeJobs();
    let synced = 0;

    for (const job of activeJobs) {
      if (job.status === "running" && job.stage === "image_to_video" && !job.video_url) {
        await syncAnimeJobFromVidmor(job.id);
        synced += 1;
      }
    }

    return NextResponse.json({
      ...queueResult,
      synced,
      maxConcurrent: resolveMaxConcurrentAnimeJobs(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "队列处理失败" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    const jobs = await listRecentAnimeJobs(50);
    const config = getVidmorConfigStatus();
    return NextResponse.json({
      jobs,
      configured: config.configured,
      config,
      maxConcurrent: resolveMaxConcurrentAnimeJobs(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取任务失败" },
      { status: 500 },
    );
  }
}
