import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { dig, isRecord, pickString, titleFromText, toNumber, unixToIso } from "@/lib/providers/parse-utils";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const CHANNEL_ID_PATH = "/api/v1/youtube/web/get_channel_id";
const CHANNEL_INFO_PATH = "/api/v1/youtube/web/get_channel_info";
const CHANNEL_VIDEOS_PATH = "/api/v1/youtube/web/get_channel_videos_v2";

export type YoutubeScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

type ParsedChannelInput = {
  channelId: string | null;
  handle: string | null;
  profileUrl: string;
};

function parseChannelInput(input: string): ParsedChannelInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const channelIdFromUrl = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{10,})/i)?.[1];
  if (channelIdFromUrl) {
    return {
      channelId: channelIdFromUrl,
      handle: null,
      profileUrl: `https://www.youtube.com/channel/${channelIdFromUrl}`,
    };
  }

  const handleFromUrl = trimmed.match(/youtube\.com\/@([\w.-]+)/i)?.[1];
  if (handleFromUrl) {
    return {
      channelId: null,
      handle: handleFromUrl,
      profileUrl: `https://www.youtube.com/@${handleFromUrl}`,
    };
  }

  const legacyHandle = trimmed.match(/youtube\.com\/(?:c|user)\/([\w.-]+)/i)?.[1];
  if (legacyHandle) {
    return {
      channelId: null,
      handle: legacyHandle,
      profileUrl: trimmed.startsWith("http") ? trimmed : `https://www.youtube.com/c/${legacyHandle}`,
    };
  }

  const bareHandle = trimmed.match(/^@?([\w.-]{2,})$/)?.[1];
  if (bareHandle && !trimmed.includes("/")) {
    return {
      channelId: null,
      handle: bareHandle,
      profileUrl: `https://www.youtube.com/@${bareHandle}`,
    };
  }

  return null;
}

function extractVideoList(payload: unknown): Record<string, unknown>[] {
  const list = dig(payload, [
    ["items"],
    ["videos"],
    ["data", "items"],
    ["data", "videos"],
    ["data", "list"],
    ["contents"],
    ["data", "contents"],
  ]);

  if (Array.isArray(list)) return list.filter(isRecord);
  return [];
}

function pickThumbnail(item: Record<string, unknown>): string | null {
  const direct = pickString(item.thumbnail, item.thumbnail_url, item.thumbnailUrl);
  if (direct) return direct;

  const fromThumbnails = dig(item, [
    ["thumbnails", "0", "url"],
    ["thumbnail", "thumbnails", "0", "url"],
    ["snippet", "thumbnails", "high", "url"],
    ["snippet", "thumbnails", "medium", "url"],
  ]);
  return pickString(fromThumbnails);
}

function pickPublishedAt(item: Record<string, unknown>): string | null {
  return (
    unixToIso(item.published_at ?? item.publishedAt ?? item.publish_time ?? item.publishTime) ??
    pickString(item.published_time_text, item.publishDate, item.publishedTime)
  );
}

async function resolveChannelId(parsed: ParsedChannelInput, apiCalls: { count: number }): Promise<string> {
  if (parsed.channelId) return parsed.channelId;

  const lookupName = parsed.handle?.startsWith("@") ? parsed.handle : `@${parsed.handle}`;
  const payload = await tikhubRequest<unknown>({
    path: CHANNEL_ID_PATH,
    query: { channel_name: lookupName },
  });
  apiCalls.count += 1;

  const channelId = pickString(
    dig(payload, [
      ["channel_id"],
      ["channelId"],
      ["data", "channel_id"],
      ["data", "channelId"],
      ["data"],
    ]),
  );

  if (!channelId) {
    throw new Error("无法解析 YouTube 频道 ID，请确认链接或 @handle 正确。");
  }

  return channelId;
}

export async function scrapeYoutubeProfile(inputUrl: string): Promise<YoutubeScrapeResult> {
  const parsed = parseChannelInput(inputUrl);
  if (!parsed) {
    throw new Error("请输入有效的 YouTube 频道链接或 @handle，例如 https://www.youtube.com/@MrBeast");
  }

  const apiCalls = { count: 0 };
  const channelId = await resolveChannelId(parsed, apiCalls);

  const infoPayload = await tikhubRequest<unknown>({
    path: CHANNEL_INFO_PATH,
    query: { channel_id: channelId },
  });
  apiCalls.count += 1;

  const infoBlock =
    (dig(infoPayload, [["channel"], ["data", "channel"], ["data", "metadata"], ["data"]]) as Record<string, unknown>) ??
    (isRecord(infoPayload) ? infoPayload : {});

  const handle =
    pickString(
      parsed.handle,
      infoBlock.custom_url,
      infoBlock.customUrl,
      infoBlock.handle,
      infoBlock.username,
      dig(infoBlock, [["channel_handle"], ["channelHandle"]]),
    )?.replace(/^@/, "") ?? channelId;

  const displayName =
    pickString(infoBlock.title, infoBlock.name, infoBlock.channel_name, infoBlock.channelName, handle) ?? handle;

  const avatarUrl = pickString(
    infoBlock.avatar,
    infoBlock.avatar_url,
    infoBlock.avatarUrl,
    dig(infoBlock, [
      ["avatar", "url"],
      ["thumbnails", "0", "url"],
      ["thumbnail", "thumbnails", "0", "url"],
    ]),
  );

  const followers = toNumber(
    infoBlock.subscriber_count ??
      infoBlock.subscriberCount ??
      infoBlock.subscribers ??
      dig(infoBlock, [["subscriberCountText"], ["stats", "subscriberCount"]]),
  );

  const videoCount = toNumber(
    infoBlock.video_count ?? infoBlock.videoCount ?? dig(infoBlock, [["stats", "videoCount"]]),
  );

  const videosPayload = await tikhubRequest<unknown>({
    path: CHANNEL_VIDEOS_PATH,
    query: {
      channel_id: channelId,
      sortBy: "newest",
      contentType: "videos",
      lang: "zh-CN",
    },
  });
  apiCalls.count += 1;

  const videos = extractVideoList(videosPayload).slice(0, MAX_VIDEOS_PER_SYNC).map((item) => {
    const videoId = pickString(item.video_id, item.videoId, item.id, dig(item, [["videoId"]])) ?? "";
    const title = titleFromText(
      pickString(item.title, item.video_title, item.videoTitle, dig(item, [["title", "text"]])),
      "YouTube video",
    );
    const views = toNumber(
      item.view_count ?? item.viewCount ?? item.views ?? dig(item, [["stats", "viewCount"], ["viewCountText"]]),
    );
    const likes = toNumber(
      item.like_count ?? item.likeCount ?? item.likes ?? dig(item, [["stats", "likeCount"]]),
    );
    const comments = toNumber(
      item.comment_count ?? item.commentCount ?? item.comments ?? dig(item, [["stats", "commentCount"]]),
    );

    return {
      tiktokVideoId: videoId || title,
      title,
      videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      thumbnailUrl: pickThumbnail(item),
      viewsCount: views,
      likesCount: likes,
      commentsCount: comments,
      sharesCount: 0,
      collectsCount: 0,
      postedAt: pickPublishedAt(item),
    };
  });

  const totalViews = videos.reduce((sum, video) => sum + video.viewsCount, 0);
  const totalLikes = videos.reduce((sum, video) => sum + video.likesCount, 0);

  return {
    profile: {
      platform: "youtube",
      tiktokUserId: channelId,
      handle,
      displayName,
      profileUrl: parsed.profileUrl.startsWith("http")
        ? parsed.profileUrl
        : `https://www.youtube.com/@${handle}`,
      avatarUrl: avatarUrl ?? null,
      followersCount: followers,
      likesCount: totalLikes,
      videoCount: videoCount || videos.length,
      totalViews,
      engagementRate: 0,
      videos,
    },
    apiCalls: apiCalls.count,
  };
}
