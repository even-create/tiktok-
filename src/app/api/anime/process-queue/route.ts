import { NextResponse } from "next/server";
import { getAnimeJob, listActiveAnimeJobs, listRecentAnimeJobs, resolveMaxConcurrentAnimeJobs } from "@/lib/anime/jobs";
import { tryStartVideoStageOnce } from "@/lib/anime/pipeline";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";
import { getVidmorConfigStatus, isVidmorConfigured } from "@/lib/vidmor/config";

export const maxDuration = 60;

export async function POST() {
  try {
    if (!isVidmorConfigured()) {
      return NextResponse.json({ error: "未配置 Vidmor" }, { status: 400 });
    }

    const queueResult = await processAnimeJobQueue();

    const activeJobs = await listActiveAnimeJobs();
    let synced = 0;

    for (const job of activeJobs) {
      if (job.status !== "running") {
        continue;
      }

      await syncAnimeJobFromVidmor(job.id);
      synced += 1;

      const refreshed = await getAnimeJob(job.id);
      if (refreshed?.status === "running" && refreshed.progress === 60 && refreshed.image_url) {
        await tryStartVideoStageOnce(refreshed.id);
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

export async function GET() {
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
