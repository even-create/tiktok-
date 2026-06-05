import { NextResponse } from "next/server";
import { getAnimeJob } from "@/lib/anime/jobs";
import { requireAuth } from "@/lib/workspace/require-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const job = await getAnimeJob(id);

    if (!job) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取任务失败" },
      { status: 500 },
    );
  }
}
