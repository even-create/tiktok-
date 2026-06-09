import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { mapProfilePayload, toNormalizedProfile } from "@/lib/providers/tikhub-adapter";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const PROFILE_PATH = "/api/v1/douyin/app/v3/handler_user_profile";
const USER_POSTS_PATH = "/api/v1/douyin/app/v3/fetch_user_post_videos";

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
