import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import {
  extractAwemeList,
  mapOneVideoPayload,
  mapProfilePayload,
  parseTikTokHandle,
  toNormalizedProfile,
} from "@/lib/providers/tikhub-adapter";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile, UnifiedTikTokVideo } from "@/lib/tiktok/types";

const PROFILE_PATH = "/api/v1/tiktok/app/v3/handler_user_profile";
const USER_POSTS_PATH = "/api/v1/tiktok/app/v3/fetch_user_post_videos_v2";
const ONE_VIDEO_PATH = "/api/v1/tiktok/app/v3/fetch_one_video_v2";

export type TikHubScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

export class TikHubProvider {
  async fetchUserProfile(uniqueId: string) {
    return tikhubRequest({
      path: PROFILE_PATH,
      query: { unique_id: uniqueId },
    });
  }

  async fetchUserPostVideos(params: { secUserId?: string | null; uniqueId: string; count?: number }) {
    return tikhubRequest({
      path: USER_POSTS_PATH,
      query: {
        sec_user_id: params.secUserId ?? undefined,
        unique_id: params.secUserId ? undefined : params.uniqueId,
        max_cursor: 0,
        count: params.count ?? MAX_VIDEOS_PER_SYNC,
        sort_type: 0,
      },
    });
  }

  async fetchOneVideoV2(awemeId: string) {
    return tikhubRequest({
      path: ONE_VIDEO_PATH,
      query: { aweme_id: awemeId },
    });
  }

  /** Enrich videos missing cover or stats via fetch_one_video_v2. */
  async enrichVideosWithDetails(
    videos: ReturnType<typeof mapProfilePayload>["videos"],
    handle: string,
    maxCalls: number,
  ) {
    let calls = 0;
    const enriched = [...videos];

    const priorityIndices = enriched
      .map((video, index) => ({ video, index }))
      .filter(
        ({ video }) =>
          !video.thumbnailUrl ||
          video.views <= 0 ||
          video.likes <= 0 ||
          (video.views > 0 && video.collects <= 0),
      )
      .sort((left, right) => {
        const leftNeedsCollect = left.video.views > 0 && left.video.collects <= 0 ? 1 : 0;
        const rightNeedsCollect = right.video.views > 0 && right.video.collects <= 0 ? 1 : 0;
        const leftScore =
          Number(!left.video.thumbnailUrl) * 4 +
          Number(left.video.views <= 0) * 2 +
          leftNeedsCollect * 3 +
          Number(left.video.likes <= 0);
        const rightScore =
          Number(!right.video.thumbnailUrl) * 4 +
          Number(right.video.views <= 0) * 2 +
          rightNeedsCollect * 3 +
          Number(right.video.likes <= 0);
        return rightScore - leftScore;
      })
      .slice(0, maxCalls)
      .map(({ index }) => index);

    for (const index of priorityIndices) {
      if (calls >= maxCalls) break;

      const video = enriched[index];

      try {
        const payload = await this.fetchOneVideoV2(video.id);
        calls += 1;
        const mapped = mapOneVideoPayload(payload, handle);
        if (mapped) {
          enriched[index] = mergeVideoDetails(video, mapped);
        }
      } catch (error) {
        console.warn(`[tikhub] fetch_one_video_v2 failed for ${video.id}`, error);
      }
    }

    return { videos: enriched, apiCalls: calls };
  }

  /** List endpoints often omit collect_count — fill from fetch_one_video_v2. */
  async enrichVideosCollectCounts(videos: UnifiedTikTokVideo[], handle: string, maxCalls: number) {
    let calls = 0;
    const enriched = [...videos];

    const indices = enriched
      .map((video, index) => ({ video, index }))
      .filter(({ video }) => video.views > 0 && video.collects <= 0)
      .slice(0, maxCalls)
      .map(({ index }) => index);

    for (const index of indices) {
      if (calls >= maxCalls) break;
      const video = enriched[index];

      try {
        const payload = await this.fetchOneVideoV2(video.id);
        calls += 1;
        const mapped = mapOneVideoPayload(payload, handle);
        if (mapped) {
          enriched[index] = mergeVideoDetails(video, mapped);
        }
      } catch (error) {
        console.warn(`[tikhub] collect enrich failed for ${video.id}`, error);
      }
    }

    return { videos: enriched, apiCalls: calls };
  }

  async scrapeProfile(inputUrl: string): Promise<TikHubScrapeResult> {
    const handle = parseTikTokHandle(inputUrl);
    if (!handle) {
      throw new Error("请输入有效的 TikTok 账号链接，例如 https://www.tiktok.com/@username");
    }

    let apiCalls = 0;

    const profilePayload = await this.fetchUserProfile(handle);
    apiCalls += 1;

    const mappedProfile = mapProfilePayload(profilePayload, null, handle);
    const secUserId = mappedProfile.author.id;

    const videosPayload = await this.fetchUserPostVideos({
      secUserId,
      uniqueId: handle,
      count: MAX_VIDEOS_PER_SYNC,
    });
    apiCalls += 1;

    let accountData = mapProfilePayload(profilePayload, videosPayload, handle);

    if (!accountData.videos.length) {
      const listFromProfile = extractAwemeList(profilePayload);
      if (listFromProfile.length) {
        accountData = mapProfilePayload(profilePayload, { aweme_list: listFromProfile }, handle);
      }
    }

    const enrichBudget = Math.min(MAX_VIDEOS_PER_SYNC, accountData.videos.length);
    const enriched = await this.enrichVideosWithDetails(accountData.videos, handle, enrichBudget);
    apiCalls += enriched.apiCalls;
    accountData = { ...accountData, videos: enriched.videos };

    const collectBudget = Math.min(MAX_VIDEOS_PER_SYNC, accountData.videos.length);
    const collectEnriched = await this.enrichVideosCollectCounts(accountData.videos, handle, collectBudget);
    apiCalls += collectEnriched.apiCalls;
    accountData = { ...accountData, videos: collectEnriched.videos };

    if (!accountData.videos.length) {
      throw new Error("TikHub 没有返回视频数据，请确认账号存在且为公开账号。");
    }

    return {
      profile: toNormalizedProfile(accountData, MAX_VIDEOS_PER_SYNC),
      apiCalls,
    };
  }
}

let singleton: TikHubProvider | null = null;

function mergeVideoDetails(existing: UnifiedTikTokVideo, detail: UnifiedTikTokVideo): UnifiedTikTokVideo {
  return {
    ...existing,
    views: detail.views > 0 ? detail.views : existing.views,
    likes: detail.likes > 0 ? detail.likes : existing.likes,
    comments: detail.comments > 0 ? detail.comments : existing.comments,
    shares: detail.shares > 0 ? detail.shares : existing.shares,
    collects: detail.collects,
    thumbnailUrl: detail.thumbnailUrl ?? existing.thumbnailUrl,
    id: existing.id,
    title: existing.title || detail.title,
    url: existing.url ?? detail.url,
    postedAt: existing.postedAt ?? detail.postedAt,
  };
}

export function getTikHubProvider() {
  if (!singleton) {
    singleton = new TikHubProvider();
  }
  return singleton;
}

export async function scrapeTikTokProfile(inputUrl: string) {
  const result = await getTikHubProvider().scrapeProfile(inputUrl);
  return result.profile;
}

export async function scrapeTikTokProfileWithMeta(inputUrl: string) {
  return getTikHubProvider().scrapeProfile(inputUrl);
}
