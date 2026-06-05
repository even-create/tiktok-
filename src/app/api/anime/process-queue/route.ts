import { NextResponse } from "next/server";
import {
  getAnimeJob,
  listActiveAnimeJobs,
  listRecentAnimeJobs,
  resolveMaxConcurrentAnimeJobs,
  updateAnimeJob,
} from "@/lib/anime/jobs";
import { tryStartVideoStageOnce } from "@/lib/anime/pipeline";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";
import { getVidmorConfigStatus, isVidmorConfigured } from "@/lib/vidmor/config";

export const maxDuration = 60;

// Only jobs submitted within this window may be auto-advanced/auto-submitted by the
// background recovery loop. This stops old, stuck jobs from previous sessions from
// being "resurrected" and re-submitted to Vidmor on every poll.
const RECENT_JOB_MS = 20 * 60 * 1000;
// Running jobs older than this that never reached the video stage are aged out so they
// stop polluting the active set (and stop being resurrected).
const STALE_JOB_MS = 40 * 60 * 1000;

export async function POST() {
  try {
    if (!isVidmorConfigured()) {
      return NextResponse.json({ error: "未配置 Vidmor" }, { status: 400 });
    }

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

      // Age out ancient stuck jobs that never reached the video stage so the
      // recovery loop stops re-submitting brand new videos for them.
      if (age > STALE_JOB_MS && !job.video_task_id && !job.video_url) {
        await updateAnimeJob(job.id, {
          status: "failed",
          stage: "failed",
          error_message: "任务长时间未完成，已自动结束，请重新提交。",
        });
        continue;
      }

      await syncAnimeJobFromVidmor(job.id);
      synced += 1;

      // Never auto-submit a new video for old jobs; only freshly submitted tasks.
      if (age > RECENT_JOB_MS) {
        continue;
      }

      const refreshed = await getAnimeJob(job.id);
      if (
        refreshed?.status === "running" &&
        refreshed.progress === 60 &&
        refreshed.image_url &&
        !refreshed.video_task_id &&
        !refreshed.video_url
      ) {
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
