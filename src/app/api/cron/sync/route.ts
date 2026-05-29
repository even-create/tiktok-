import { NextResponse } from "next/server";
import { isTikHubConfigured } from "@/lib/app-settings";
import { persistSyncResults } from "@/lib/sync-center";
import { insertSyncLog } from "@/lib/sync-logs";
import { syncAllTrackedAccounts } from "@/lib/sync-all-accounts";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isTikHubConfigured())) {
    return NextResponse.json({ error: "TIKHUB_API_KEY 未配置" }, { status: 503 });
  }

  const startedAt = Date.now();

  try {
    const syncResult = await syncAllTrackedAccounts({ force: false });
    await persistSyncResults(syncResult.results, "auto");

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      syncResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "自动同步失败";

    try {
      await insertSyncLog({
        syncType: "auto",
        status: "error",
        message: "Vercel Cron 自动同步失败",
        durationMs: Date.now() - startedAt,
        errorDetail: message,
      });
    } catch {
      // ignore if sync_logs missing
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
