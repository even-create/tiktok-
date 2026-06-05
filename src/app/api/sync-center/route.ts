import { NextResponse } from "next/server";
import {
  buildApiUsageStatus,
  getStartOfTodayIso,
  mapAccountSyncRow,
  persistSyncResults,
} from "@/lib/sync-center";
import { countApifyCallsSince, getRecentSyncLogs, insertSyncLog } from "@/lib/sync-logs";
import { syncAllTrackedAccounts } from "@/lib/sync-all-accounts";
import { syncTikTokAccount } from "@/lib/tiktok-sync";
import { getAccounts } from "@/lib/tiktok-data";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300;

export async function GET() {
  try {
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*, videos(id)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { logs } = await getRecentSyncLogs(80);
    const { count: apifyCallsToday } = await countApifyCallsSince(getStartOfTodayIso());

    const syncLogs = logs.filter((log) => log.status !== "error");
    const errorLogs = logs.filter((log) => log.status === "error");

    return NextResponse.json({
      accounts: (accounts ?? []).map((account) => mapAccountSyncRow(account)),
      syncLogs,
      errorLogs,
      usage: await buildApiUsageStatus(apifyCallsToday),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取同步中心失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      action?: "sync-all" | "sync-one";
      force?: boolean;
      handle?: string;
      syncType?: "manual" | "auto" | "single";
    } | null;

    const action = body?.action ?? "sync-all";
    const force = body?.force === true;
    const syncType = body?.syncType ?? (action === "sync-one" ? "single" : "manual");
    const startedAt = Date.now();

    if (action === "sync-one") {
      const handle = body?.handle?.trim();
      if (!handle) {
        return NextResponse.json({ error: "请提供账号 handle" }, { status: 400 });
      }

      const { data: accounts, error } = await getAccounts();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const account = accounts?.find((item) => item.handle === handle);
      if (!account) {
        return NextResponse.json({ error: "未找到该账号" }, { status: 404 });
      }

      const syncUrl = account.profile_url?.trim() || `https://www.tiktok.com/@${account.handle}`;
      const syncStarted = Date.now();

      try {
        const result = await syncTikTokAccount({
          url: syncUrl,
          force,
          lastSyncedAt: account.last_synced_at,
        });

        const durationMs = Date.now() - syncStarted;

        if (result.skipped) {
          await insertSyncLog({
            accountHandle: handle,
            syncType,
            status: "cached",
            message: result.message,
            durationMs,
          });

          return NextResponse.json({
            ok: true,
            cached: true,
            durationMs: Date.now() - startedAt,
            result: {
              handle,
              ok: true,
              status: "cached" as const,
              cached: true,
              durationMs,
              message: result.message,
            },
          });
        }

        await insertSyncLog({
          accountHandle: handle,
          syncType,
          status: "success",
          message: `处理 ${result.videosProcessed} 条视频`,
          durationMs,
          apifyCalls: result.apifyCalls,
          videosProcessed: result.videosProcessed,
        });

        return NextResponse.json({
          ok: true,
          durationMs: Date.now() - startedAt,
          apifyCalls: result.apifyCalls,
          result: {
            handle,
            ok: true,
            status: "success" as const,
            videosCount: result.videosProcessed,
            durationMs,
            apifyCalls: result.apifyCalls,
          },
        });
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "同步失败";
        await insertSyncLog({
          accountHandle: handle,
          syncType,
          status: "error",
          message: "同步失败",
          durationMs: Date.now() - syncStarted,
          errorDetail: message,
        });

        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const syncResult = await syncAllTrackedAccounts({ force });
    await persistSyncResults(syncResult.results, syncType);

    const { count: apifyCallsToday } = await countApifyCallsSince(getStartOfTodayIso());

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      syncResult,
      usage: await buildApiUsageStatus(apifyCallsToday),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败";
    await insertSyncLog({
      syncType: "manual",
      status: "error",
      message: "批量同步失败",
      errorDetail: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
