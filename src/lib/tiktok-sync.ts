import { formatCacheTtlLabelAsync, shouldUseSyncCacheAsync } from "@/lib/apify-config";
import { scrapeTikTokProfile } from "@/lib/apify-tiktok";
import { assertTikTokTablesReady, saveTikTokProfile } from "@/lib/supabase-storage";

export type SyncTikTokAccountOptions = {
  url: string;
  force?: boolean;
  lastSyncedAt?: string | null;
};

export type SyncTikTokAccountResult =
  | {
      skipped: true;
      cached: true;
      message: string;
    }
  | {
      skipped: false;
      cached: false;
      account: { handle: string; id: string };
      videosProcessed: number;
      videosInserted: number;
      videosUpdated: number;
      apifyCalls: 1;
    };

export async function syncTikTokAccount(options: SyncTikTokAccountOptions): Promise<SyncTikTokAccountResult> {
  await assertTikTokTablesReady();

  if (await shouldUseSyncCacheAsync(options.lastSyncedAt, options.force)) {
    return {
      skipped: true,
      cached: true,
      message: `跳过 Apify：距上次同步未满 ${await formatCacheTtlLabelAsync()}（使用缓存数据）`,
    };
  }

  const profile = await scrapeTikTokProfile(options.url);
  const saved = await saveTikTokProfile(profile);

  return {
    skipped: false,
    cached: false,
    account: { handle: saved.account.handle, id: saved.account.id },
    videosProcessed: saved.videosProcessed,
    videosInserted: saved.videosInserted,
    videosUpdated: saved.videosUpdated,
    apifyCalls: 1,
  };
}
