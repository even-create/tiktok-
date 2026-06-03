import { NextResponse } from "next/server";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const job = await syncAnimeJobFromVidmor(id);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500 },
    );
  }
}
