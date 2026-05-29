import { isTikHubConfigured } from "@/lib/app-settings";
import { scrapeTikTokProfileWithMeta } from "@/lib/providers/TikHubProvider";
import { formatCacheTtlLabelAsync, shouldUseSyncCacheAsync } from "@/lib/sync-config";
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
      /** TikHub API calls for this sync (stored in sync_logs.apify_calls for DB compat). */
      apifyCalls: number;
    };

export async function syncTikTokAccount(options: SyncTikTokAccountOptions): Promise<SyncTikTokAccountResult> {
  await assertTikTokTablesReady();

  if (!(await isTikHubConfigured())) {
    throw new Error("未配置 TIKHUB_API_KEY，请在 Vercel 环境变量或 Settings 中设置");
  }

  if (await shouldUseSyncCacheAsync(options.lastSyncedAt, options.force)) {
    return {
      skipped: true,
      cached: true,
      message: `跳过 TikHub：距上次同步未满 ${await formatCacheTtlLabelAsync()}（使用缓存数据）`,
    };
  }

  const { profile, apiCalls } = await scrapeTikTokProfileWithMeta(options.url);
  const saved = await saveTikTokProfile(profile);

  return {
    skipped: false,
    cached: false,
    account: { handle: saved.account.handle, id: saved.account.id },
    videosProcessed: saved.videosProcessed,
    videosInserted: saved.videosInserted,
    videosUpdated: saved.videosUpdated,
    apifyCalls: apiCalls,
  };
}
