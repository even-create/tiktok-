import { isTikHubConfigured } from "@/lib/app-settings";
import { scrapeTikTokProfileWithMeta } from "@/lib/providers/TikHubProvider";
import { scrapeDouyinProfile } from "@/lib/providers/douyin";
import { scrapeInstagramProfile } from "@/lib/providers/instagram";
import { scrapeXiaohongshuProfile } from "@/lib/providers/xiaohongshu";
import { detectPlatform } from "@/lib/providers/platform";
import { formatCacheTtlLabelAsync, shouldUseSyncCacheAsync } from "@/lib/sync-config";
import { assertTikTokTablesReady, saveTikTokProfile, type AccountOwner } from "@/lib/supabase-storage";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

export type SyncTikTokAccountOptions = {
  url: string;
  force?: boolean;
  lastSyncedAt?: string | null;
  /** Assigned only when this sync creates a brand-new account. */
  owner?: AccountOwner | null;
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

  const { profile, apiCalls } = await scrapeProfileForUrl(options.url);
  const saved = await saveTikTokProfile(profile, options.owner ?? null);

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

async function scrapeProfileForUrl(
  url: string,
): Promise<{ profile: NormalizedTikTokProfile; apiCalls: number }> {
  const platform = detectPlatform(url);

  switch (platform) {
    case "douyin":
      return scrapeDouyinProfile(url);
    case "xiaohongshu":
      return scrapeXiaohongshuProfile(url);
    case "instagram":
      return scrapeInstagramProfile(url);
    case "tiktok":
      return scrapeTikTokProfileWithMeta(url);
    default:
      throw new Error(
        "无法识别平台链接，请粘贴 抖音 / 小红书 / Instagram / TikTok 的主页或分享链接。",
      );
  }
}
