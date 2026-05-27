import { scrapeTikTokProfile } from "@/lib/apify-tiktok";
import { assertTikTokTablesReady, saveTikTokProfile } from "@/lib/supabase-storage";
import { getAccounts } from "@/lib/tiktok-data";

export type SyncAccountResult = {
  handle: string;
  ok: boolean;
  videosCount?: number;
  error?: string;
};

export type SyncAllAccountsResult = {
  syncedAt: string;
  totalAccounts: number;
  successCount: number;
  failedCount: number;
  totalVideos: number;
  results: SyncAccountResult[];
};

export async function syncAllTrackedAccounts(): Promise<SyncAllAccountsResult> {
  await assertTikTokTablesReady();

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
      totalVideos: 0,
      results: [],
    };
  }

  const results: SyncAccountResult[] = [];
  let totalVideos = 0;

  for (const account of accounts) {
    const syncUrl = account.profile_url?.trim() || `https://www.tiktok.com/@${account.handle}`;

    try {
      const profile = await scrapeTikTokProfile(syncUrl);
      const saved = await saveTikTokProfile(profile);
      totalVideos += saved.videosCount;
      results.push({
        handle: account.handle,
        ok: true,
        videosCount: saved.videosCount,
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
    totalVideos,
    results,
  };
}
