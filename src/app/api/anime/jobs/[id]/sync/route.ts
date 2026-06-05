import { NextResponse } from "next/server";
import { syncAnimeJobFromVidmor } from "@/lib/anime/sync";
import { requireAuth } from "@/lib/workspace/require-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

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
