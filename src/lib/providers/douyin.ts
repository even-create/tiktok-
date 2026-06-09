import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { dig, isRecord, pickString, toNumber } from "@/lib/providers/parse-utils";
import { mapProfilePayload, toNormalizedProfile } from "@/lib/providers/tikhub-adapter";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const PROFILE_PATH = "/api/v1/douyin/app/v3/handler_user_profile";
const USER_POSTS_PATH = "/api/v1/douyin/app/v3/fetch_user_post_videos";
// Douyin no longer returns play_count in regular endpoints; this dedicated
// endpoint is the only way to get it (≤50 ids per call, billed once).
const VIDEO_STATS_PATH = "/api/v1/douyin/app/v3/fetch_multi_video_statistics";

export type DouyinScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

function parseSecUserId(input: string): string | null {
  const fromUrl = input.match(/douyin\.com\/user\/([A-Za-z0-9_-]+)/i)?.[1];
  if (fromUrl) return fromUrl;

  const bare = input.trim().match(/^(MS4w[A-Za-z0-9_-]+)$/)?.[1];
  if (bare) return bare;

  return null;
}

type VideoStat = { playCount: number; diggCount: number; shareCount: number };

function extractStatsList(payload: unknown): Record<string, unknown>[] {
  const list = dig(payload, [
    ["statistics_list"],
    ["data", "statistics_list"],
    ["aweme_statistics"],
    ["data", "aweme_statistics"],
    ["statistics"],
    ["data"],
  ]);

  if (Array.isArray(list)) return list.filter(isRecord);
  if (Array.isArray(payload)) return (payload as unknown[]).filter(isRecord);
  return [];
}

/** Fetch real play counts for the given aweme ids (Douyin hides them elsewhere). */
async function fetchPlayCounts(awemeIds: string[]): Promise<Map<string, VideoStat>> {
  const map = new Map<string, VideoStat>();
  if (!awemeIds.length) return map;

  const payload = await tikhubRequest({
    path: VIDEO_STATS_PATH,
    query: { aweme_ids: awemeIds.slice(0, 50).join(",") },
  });

  for (const item of extractStatsList(payload)) {
    const id = pickString(item.aweme_id, item.awemeId, item.group_id, item.aweme_id_str, item.id);
    if (!id) continue;
    map.set(id, {
      playCount: toNumber(item.play_count ?? item.playCount ?? item.vv),
      diggCount: toNumber(item.digg_count ?? item.diggCount),
      shareCount: toNumber(item.share_count ?? item.shareCount),
    });
  }

  return map;
}

/** Follow a v.douyin.com short link to recover the canonical profile URL. */
async function resolveShortLink(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return response.url || null;
  } catch {
    return null;
  }
}

export async function scrapeDouyinProfile(inputUrl: string): Promise<DouyinScrapeResult> {
  let secUserId = parseSecUserId(inputUrl);

  if (!secUserId && /douyin\.com/i.test(inputUrl)) {
    const resolved = await resolveShortLink(inputUrl.trim());
    if (resolved) secUserId = parseSecUserId(resolved);
  }

  if (!secUserId) {
    throw new Error(
      "请输入有效的抖音主页链接，例如 https://www.douyin.com/user/MS4w... 或可解析的 v.douyin.com 短链",
    );
  }

  let apiCalls = 0;

  const profilePayload = await tikhubRequest({
    path: PROFILE_PATH,
    query: { sec_user_id: secUserId },
  });
  apiCalls += 1;

  const videosPayload = await tikhubRequest({
    path: USER_POSTS_PATH,
    query: { sec_user_id: secUserId, max_cursor: 0, count: MAX_VIDEOS_PER_SYNC, sort_type: 0 },
  });
  apiCalls += 1;

  // Douyin's app v3 response mirrors TikTok's, so we reuse the same mapper.
  const accountData = mapProfilePayload(profilePayload, videosPayload, secUserId);

  // Backfill real play counts (and refresh digg/share) via the stats endpoint.
  const recent = accountData.videos.slice(0, MAX_VIDEOS_PER_SYNC);
  const awemeIds = recent.map((video) => video.id).filter(Boolean);
  if (awemeIds.length) {
    try {
      const stats = await fetchPlayCounts(awemeIds);
      apiCalls += 1;
      for (const video of recent) {
        const stat = stats.get(video.id);
        if (!stat) continue;
        if (stat.playCount > 0) video.views = stat.playCount;
        if (stat.diggCount > 0) video.likes = stat.diggCount;
        if (stat.shareCount > 0) video.shares = stat.shareCount;
      }
    } catch (error) {
      console.warn("[douyin] fetch_multi_video_statistics failed", error);
    }
  }
  accountData.videos = recent;

  const normalized = toNormalizedProfile(accountData, MAX_VIDEOS_PER_SYNC, "douyin");

  return {
    profile: {
      ...normalized,
      tiktokUserId: secUserId,
      profileUrl: `https://www.douyin.com/user/${secUserId}`,
      videos: normalized.videos.map((video) => ({
        ...video,
        videoUrl: video.tiktokVideoId
          ? `https://www.douyin.com/video/${video.tiktokVideoId}`
          : video.videoUrl,
      })),
    },
    apiCalls,
  };
}
