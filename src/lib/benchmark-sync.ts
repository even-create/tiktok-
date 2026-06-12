import { isTikHubConfigured } from "@/lib/app-settings";
import { assertBenchmarkTablesReady, saveBenchmarkProfile } from "@/lib/benchmark-storage";
import { scrapeTikTokProfileWithMeta } from "@/lib/providers/TikHubProvider";
import { scrapeDouyinProfile } from "@/lib/providers/douyin";
import { scrapeInstagramProfile } from "@/lib/providers/instagram";
import { scrapeRedditProfile } from "@/lib/providers/reddit";
import { scrapeXiaohongshuProfile } from "@/lib/providers/xiaohongshu";
import { scrapeYoutubeProfile } from "@/lib/providers/youtube";
import { detectPlatform } from "@/lib/providers/platform";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

export type SyncBenchmarkAccountResult = {
  account: { handle: string; id: string };
  videosProcessed: number;
  videosInserted: number;
  videosUpdated: number;
  apifyCalls: number;
};

export async function syncBenchmarkAccount(url: string, ownerId: string): Promise<SyncBenchmarkAccountResult> {
  await assertBenchmarkTablesReady();

  if (!(await isTikHubConfigured())) {
    throw new Error("未配置 TIKHUB_API_KEY，请在 Vercel 环境变量或 Settings 中设置");
  }

  const { profile, apiCalls } = await scrapeProfileForUrl(url);
  const saved = await saveBenchmarkProfile(profile, ownerId);

  if (!saved.account) {
    throw new Error("对标账号保存失败");
  }

  return {
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
