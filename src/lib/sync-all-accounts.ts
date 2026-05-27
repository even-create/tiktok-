import { getAccounts } from "@/lib/tiktok-data";
import { syncTikTokAccount } from "@/lib/tiktok-sync";

export type SyncAccountResult = {
  handle: string;
  ok: boolean;
  cached?: boolean;
  videosCount?: number;
  videosInserted?: number;
  videosUpdated?: number;
  apifyCalls?: number;
  error?: string;
  message?: string;
};

export type SyncAllAccountsResult = {
  syncedAt: string;
  totalAccounts: number;
  successCount: number;
  failedCount: number;
  cachedCount: number;
  apifyCalls: number;
  totalVideos: number;
  results: SyncAccountResult[];
};

export type SyncAllAccountsOptions = {
  force?: boolean;
};

export async function syncAllTrackedAccounts(
  options: SyncAllAccountsOptions = {},
): Promise<SyncAllAccountsResult> {
  const { data: accounts, error } = await getAccounts();

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

  const results: SyncAccountResult[] = [];
  let totalVideos = 0;
  let apifyCalls = 0;
  let cachedCount = 0;

  for (const account of accounts) {
    const syncUrl = account.profile_url?.trim() || `https://www.tiktok.com/@${account.handle}`;

    try {
      const result = await syncTikTokAccount({
        url: syncUrl,
        force: options.force,
        lastSyncedAt: account.last_synced_at,
      });

      if (result.skipped) {
        cachedCount += 1;
        results.push({
          handle: account.handle,
          ok: true,
          cached: true,
          videosCount: 0,
          apifyCalls: 0,
          message: result.message,
        });
        continue;
      }

      apifyCalls += result.apifyCalls;
      totalVideos += result.videosProcessed;
      results.push({
        handle: account.handle,
        ok: true,
        cached: false,
        videosCount: result.videosProcessed,
        videosInserted: result.videosInserted,
        videosUpdated: result.videosUpdated,
        apifyCalls: result.apifyCalls,
      });
    } catch (syncError) {
      results.push({
        handle: account.handle,
        ok: false,
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
