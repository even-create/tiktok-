import { NextResponse } from "next/server";
import { canReadAllAccounts } from "@/lib/workspace/account-access";
import { requireAuth } from "@/lib/workspace/require-auth";
import { syncTikTokAccount } from "@/lib/tiktok-sync";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth(request, "sync:own");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

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
      workspaceId: auth.user.workspaceId,
      assignedTo: canReadAllAccounts(auth.user) ? undefined : auth.user.id,
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
