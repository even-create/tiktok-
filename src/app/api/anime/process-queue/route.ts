import { NextResponse } from "next/server";
import {
  listActiveAnimeJobs,
  listRecentAnimeJobs,
  resolveMaxConcurrentAnimeJobs,
  updateAnimeJob,
} from "@/lib/anime/jobs";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";
import { getVidmorConfigStatus, isVidmorConfigured } from "@/lib/vidmor/config";

export const maxDuration = 60;

// Running jobs older than this that never reached the video stage are aged out so they
// stop polluting the active set. This loop NEVER submits to Vidmor — it is read-only and
// only pulls completed results back in (via syncAnimeJobFromVidmor).
const STALE_JOB_MS = 40 * 60 * 1000;

export async function POST() {
  try {
    if (!isVidmorConfigured()) {
      return NextResponse.json({ error: "未配置 Vidmor" }, { status: 400 });
    }

    // Start brand-new queued jobs. Each runs its full pipeline (image + single video submit)
    // in its own execution; this loop never initiates a video submission itself.
    const queueResult = await processAnimeJobQueue();

    const activeJobs = await listActiveAnimeJobs();
    const now = Date.now();
    let synced = 0;

    for (const job of activeJobs) {
      if (job.status !== "running") {
        continue;
      }

      const createdAt = Date.parse(job.created_at);
      const age = Number.isNaN(createdAt) ? 0 : now - createdAt;

      // Age out ancient stuck jobs that never reached the video stage.
      if (age > STALE_JOB_MS && !job.video_task_id && !job.video_url) {
        await updateAnimeJob(job.id, {
          status: "failed",
          stage: "failed",
          error_message: "任务长时间未完成，已自动结束，请重新提交。",
        });
        continue;
      }

      // Read-only: pull Vidmor status (poll the job's own video_task_id) without submitting.
      await syncAnimeJobFromVidmor(job.id);
      synced += 1;
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
