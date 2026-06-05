import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { ADMIN_USER } from "@/lib/session";
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

    // New accounts are owned by whoever added them (admin or the logged-in member).
    const user = (await getCurrentUser()) ?? ADMIN_USER;

    const result = await syncTikTokAccount({
      url: tiktokUrl,
      force: body?.force === true,
      lastSyncedAt: body?.lastSyncedAt,
      owner: { id: user.id, name: user.name },
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
