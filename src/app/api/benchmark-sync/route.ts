import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { ADMIN_USER } from "@/lib/session";
import { syncBenchmarkAccount } from "@/lib/benchmark-sync";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = (await getCurrentUser()) ?? ADMIN_USER;
    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const url = body?.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "请输入账号链接" }, { status: 400 });
    }

    const result = await syncBenchmarkAccount({ url, ownerId: user.id, force: true });

    if (result.skipped) {
      return NextResponse.json({
        cached: true,
        message: result.message,
      });
    }

    return NextResponse.json({
      account: result.account,
      videosCount: result.videosProcessed,
      videosInserted: result.videosInserted,
      videosUpdated: result.videosUpdated,
      apifyCalls: result.apifyCalls,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "对标账号同步失败" },
      { status: 500 },
    );
  }
}
