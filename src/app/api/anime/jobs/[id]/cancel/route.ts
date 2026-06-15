import { NextResponse } from "next/server";
import { cancelAnimeJob } from "@/lib/anime/jobs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const job = await cancelAnimeJob(id);

    return NextResponse.json({
      ok: true,
      job,
      message: "任务已取消",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取消任务失败" },
      { status: 400 },
    );
  }
}
