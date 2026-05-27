import { NextResponse } from "next/server";
import { syncTikTokAccount } from "@/lib/tiktok-sync";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      url?: string;
      force?: boolean;
      lastSyncedAt?: string | null;
    } | null;
    const tiktokUrl = body?.url?.trim();

    if (!tiktokUrl) {
      return NextResponse.json({ error: "请输入 TikTok 账号链接" }, { status: 400 });
    }

    const result = await syncTikTokAccount({
      url: tiktokUrl,
      force: body?.force === true,
      lastSyncedAt: body?.lastSyncedAt,
    });

    if (result.skipped) {
      return NextResponse.json({
        cached: true,
        skipped: true,
        message: result.message,
        videosCount: 0,
        apifyCalls: 0,
      });
    }

    return NextResponse.json({
      cached: false,
      skipped: false,
      account: result.account,
      videosCount: result.videosProcessed,
      videosInserted: result.videosInserted,
      videosUpdated: result.videosUpdated,
      apifyCalls: result.apifyCalls,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TikTok 同步失败" },
      { status: 500 },
    );
  }
}
