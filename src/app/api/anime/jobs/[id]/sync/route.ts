import { NextResponse } from "next/server";
import { getAnimeJob } from "@/lib/anime/jobs";
import { submitVideoForJob } from "@/lib/anime/pipeline";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const before = await getAnimeJob(id);

    // Read-only pull first (picks up a finished video for this job's own task id).
    let job = await syncAnimeJobFromVidmor(id);

    // Manual, per-job recovery: if the image is ready but the video was never submitted
    // (e.g. the pipeline run timed out during image polling), push it forward now. This is
    // user-initiated and scoped to a single job, so it cannot resurrect other jobs.
    if (job.status === "running" && job.image_url && !job.video_task_id && !job.video_url) {
      await submitVideoForJob(id);
      job = (await getAnimeJob(id)) ?? job;
    }

    const synced = before?.status !== "success" && job.status === "success" && !!job.video_url;

    return NextResponse.json({
      job,
      synced,
      message: synced
        ? "成片已同步"
        : job.error_message || "暂未在 Vidmor 找到已完成成片，请稍后再试",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500 },
    );
  }
}
