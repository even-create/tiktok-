import { NextResponse } from "next/server";
import { canReadAllAccounts } from "@/lib/workspace/account-access";
import { requireAuth } from "@/lib/workspace/require-auth";
import { syncAllTrackedAccounts } from "@/lib/sync-all-accounts";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth(request, "sync:own");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
    const result = await syncAllTrackedAccounts({
      force: body?.force === true,
      workspaceId: auth.user.workspaceId,
      assignedTo: canReadAllAccounts(auth.user) ? undefined : auth.user.id,
    });

    if (result.totalAccounts === 0) {
      return NextResponse.json({
        ...result,
        message: "暂无已追踪账号，请先添加账号。",
      });
    }

    const cacheNote =
      result.cachedCount > 0 ? `，${result.cachedCount} 个使用缓存（未调用 TikHub）` : "";
    const apifyNote = `TikHub 调用 ${result.apifyCalls} 次`;

    return NextResponse.json({
      ...result,
      message:
        result.failedCount === 0
          ? `全部 ${result.successCount} 个账号同步成功${cacheNote}（${apifyNote}）`
          : `${result.successCount} 个成功，${result.failedCount} 个失败${cacheNote}（${apifyNote}）`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量同步失败" },
      { status: 500 },
    );
  }
}
