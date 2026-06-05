import { NextResponse } from "next/server";
import { getAnimeJob } from "@/lib/anime/jobs";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const before = await getAnimeJob(id);
    const job = await syncAnimeJobFromVidmor(id);
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
