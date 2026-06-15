import { syncBenchmarkAccount } from "@/lib/benchmark-sync";
import { supabase } from "@/lib/supabase";

export type SyncBenchmarkAccountRowResult = {
  handle: string;
  platform: string;
  ok: boolean;
  status: "success" | "cached" | "error";
  cached?: boolean;
  videosCount?: number;
  videosInserted?: number;
  videosUpdated?: number;
  apifyCalls?: number;
  durationMs?: number;
  error?: string;
  message?: string;
};

export type SyncAllBenchmarkAccountsResult = {
  syncedAt: string;
  totalAccounts: number;
  successCount: number;
  failedCount: number;
  cachedCount: number;
  apifyCalls: number;
  totalVideos: number;
  results: SyncBenchmarkAccountRowResult[];
};

export type SyncAllBenchmarkAccountsOptions = {
  force?: boolean;
  /** When set, only sync benchmark accounts owned by this user. */
  ownerId?: string;
};

export async function syncAllBenchmarkAccounts(
  options: SyncAllBenchmarkAccountsOptions = {},
): Promise<SyncAllBenchmarkAccountsResult> {
  let query = supabase.from("benchmark_accounts").select("*").order("created_at", { ascending: false });

  if (options.ownerId) {
    query = query.eq("owner_id", options.ownerId);
  }

  const { data: accounts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!accounts?.length) {
    return {
      syncedAt: new Date().toISOString(),
      totalAccounts: 0,
      successCount: 0,
      failedCount: 0,
      cachedCount: 0,
      apifyCalls: 0,
      totalVideos: 0,
      results: [],
    };
  }

  const results: SyncBenchmarkAccountRowResult[] = [];
  let totalVideos = 0;
  let apifyCalls = 0;
  let cachedCount = 0;

  for (const account of accounts) {
    const syncUrl = account.profile_url?.trim();
    const platform = account.platform ?? "tiktok";
    const handle = account.handle as string;
    const startedAt = Date.now();

    if (!syncUrl) {
      results.push({
        handle,
        platform,
        ok: false,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: "缺少 profile_url，无法同步",
      });
      continue;
    }

    try {
      const result = await syncBenchmarkAccount({
        url: syncUrl,
        ownerId: account.owner_id as string,
        force: options.force,
        lastSyncedAt: account.last_synced_at as string | null,
      });

      const durationMs = Date.now() - startedAt;

      if (result.skipped) {
        cachedCount += 1;
        results.push({
          handle,
          platform,
          ok: true,
          status: "cached",
          cached: true,
          videosCount: 0,
          apifyCalls: 0,
          durationMs,
          message: result.message,
        });
        continue;
      }

      apifyCalls += result.apifyCalls;
      totalVideos += result.videosProcessed;
      results.push({
        handle,
        platform,
        ok: true,
        status: "success",
        cached: false,
        videosCount: result.videosProcessed,
        videosInserted: result.videosInserted,
        videosUpdated: result.videosUpdated,
        apifyCalls: result.apifyCalls,
        durationMs,
      });
    } catch (syncError) {
      results.push({
        handle,
        platform,
        ok: false,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: syncError instanceof Error ? syncError.message : "同步失败",
      });
    }
  }

  const successCount = results.filter((item) => item.ok).length;

  return {
    syncedAt: new Date().toISOString(),
    totalAccounts: accounts.length,
    successCount,
    failedCount: results.length - successCount,
    cachedCount,
    apifyCalls,
    totalVideos,
    results,
  };
}
