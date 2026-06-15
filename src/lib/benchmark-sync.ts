import { isTikHubConfigured } from "@/lib/app-settings";
import { assertBenchmarkTablesReady, saveBenchmarkProfile } from "@/lib/benchmark-storage";
import { scrapeTikTokProfileWithMeta } from "@/lib/providers/TikHubProvider";
import { scrapeDouyinProfile } from "@/lib/providers/douyin";
import { scrapeInstagramProfile } from "@/lib/providers/instagram";
import { scrapeRedditProfile } from "@/lib/providers/reddit";
import { scrapeXiaohongshuProfile } from "@/lib/providers/xiaohongshu";
import { scrapeYoutubeProfile } from "@/lib/providers/youtube";
import { detectPlatform } from "@/lib/providers/platform";
import { formatCacheTtlLabelAsync, shouldUseSyncCacheAsync } from "@/lib/sync-config";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

export type SyncBenchmarkAccountOptions = {
  url: string;
  ownerId: string;
  force?: boolean;
  lastSyncedAt?: string | null;
};

export type SyncBenchmarkAccountResult =
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
      apifyCalls: number;
    };

export async function syncBenchmarkAccount(
  options: SyncBenchmarkAccountOptions,
): Promise<SyncBenchmarkAccountResult> {
  await assertBenchmarkTablesReady();

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
  const saved = await saveBenchmarkProfile(profile, options.ownerId);

  if (!saved.account) {
    throw new Error("对标账号保存失败");
  }

  return {
    skipped: false,
    cached: false,
    account: { handle: saved.account.handle as string, id: saved.account.id as string },
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
    case "youtube":
      return scrapeYoutubeProfile(url);
    case "reddit":
      return scrapeRedditProfile(url);
    case "tiktok":
      return scrapeTikTokProfileWithMeta(url);
    default:
      throw new Error(
        "无法识别平台链接，请粘贴 抖音 / 小红书 / Instagram / TikTok / YouTube / Reddit 的主页或分享链接。",
      );
  }
}
