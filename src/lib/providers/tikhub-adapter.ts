import { createHash } from "node:crypto";
import { pickAvatarFromRecord, pickAvatarUrl } from "@/lib/providers/parse-utils";
import type { Platform } from "@/lib/providers/platform";
import type { NormalizedTikTokProfile, UnifiedTikTokAccountData, UnifiedTikTokVideo } from "@/lib/tiktok/types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function dig(root: unknown, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = root;
    let ok = true;

    for (const key of path) {
      if (!isRecord(current) && !Array.isArray(current)) {
        ok = false;
        break;
      }
      current = (current as UnknownRecord)[key];
    }

    if (ok && current !== undefined && current !== null) {
      return current;
    }
  }

  return undefined;
}

export function parseTikTokHandle(value: string) {
  const clean = value.trim();
  const fromUrl = clean.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i)?.[1];
  const fromHandle = clean.match(/^@?([A-Za-z0-9._]+)$/)?.[1];
  return (fromUrl ?? fromHandle ?? "").replace(/\/$/, "");
}

function titleFromDesc(desc?: string | null) {
  const clean = desc?.trim();
  if (!clean) return "Untitled TikTok video";
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

function fallbackVideoId(seed: string) {
  return createHash("sha1").update(seed).digest("hex");
}

function parsePostedAt(aweme: UnknownRecord) {
  const createTime = aweme.create_time ?? aweme.createTime;
  if (typeof createTime === "number" && createTime > 0) {
    const ms = createTime > 10_000_000_000 ? createTime : createTime * 1000;
    return new Date(ms).toISOString();
  }

  const iso = pickString(aweme.create_time_iso, aweme.createTimeISO);
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return null;
}

function pickCoverUrl(video: UnknownRecord, aweme: UnknownRecord) {
  const urlLists: unknown[] = [];

  for (const key of ["cover", "origin_cover", "dynamic_cover", "animated_cover"]) {
    for (const block of [video[key], aweme[key]]) {
      if (isRecord(block) && Array.isArray(block.url_list)) {
        urlLists.push(block.url_list);
      }
    }
  }

  urlLists.push(
    dig(video, [
      ["cover", "url_list"],
      ["origin_cover", "url_list"],
      ["dynamic_cover", "url_list"],
      ["animated_cover", "url_list"],
    ]),
    dig(aweme, [
      ["video", "cover", "url_list"],
      ["video", "origin_cover", "url_list"],
      ["video", "dynamic_cover", "url_list"],
    ]),
  );

  return pickAvatarUrl(...urlLists, aweme.cover, aweme.origin_cover, aweme.dynamic_cover);
}

function mergeStatistics(aweme: UnknownRecord): UnknownRecord {
  const blocks = [
    dig(aweme, [["statistics"]]),
    dig(aweme, [["stats"]]),
    dig(aweme, [["statisticsV2"]]),
    dig(aweme, [["statistics_v2"]]),
    dig(aweme, [["aweme_statistics"]]),
    dig(aweme, [["itemInfo", "itemStruct", "stats"]]),
  ];

  const merged: UnknownRecord = {};
  for (const block of blocks) {
    if (isRecord(block)) {
      Object.assign(merged, block);
    }
  }
  return merged;
}

function pickCollectCount(statistics: UnknownRecord, aweme: UnknownRecord) {
  return toNumber(
    statistics.collect_count ??
      statistics.collectCount ??
      statistics.favorite_count ??
      statistics.favoriteCount ??
      statistics.bookmark_count ??
      statistics.bookmarkCount ??
      statistics.save_count ??
      statistics.saveCount ??
      dig(aweme, [["collect_count"], ["collectCount"]]),
  );
}

function mapAwemeToVideo(aweme: UnknownRecord, fallbackHandle: string): UnifiedTikTokVideo | null {
  const statistics = mergeStatistics(aweme);
  const video = (dig(aweme, [["video"]]) as UnknownRecord) ?? {};

  const awemeId = pickString(aweme.aweme_id, aweme.awemeId, aweme.id);
  const desc = pickString(aweme.desc, aweme.title);
  const handle = pickString(dig(aweme, [["author", "unique_id"]]), fallbackHandle) ?? fallbackHandle;

  const id = awemeId ?? fallbackVideoId(`${handle}-${desc ?? JSON.stringify(aweme)}`);

  const cover = pickCoverUrl(video, aweme);

  return {
    id,
    title: titleFromDesc(desc),
    url: awemeId ? `https://www.tiktok.com/@${handle}/video/${awemeId}` : pickString(aweme.share_url, aweme.webVideoUrl),
    thumbnailUrl: cover,
    views: toNumber(statistics.play_count ?? statistics.playCount),
    likes: toNumber(statistics.digg_count ?? statistics.diggCount),
    comments: toNumber(statistics.comment_count ?? statistics.commentCount),
    shares: toNumber(statistics.share_count ?? statistics.shareCount),
    collects: pickCollectCount(statistics, aweme),
    postedAt: parsePostedAt(aweme),
  };
}

export function extractAwemeList(payload: unknown): UnknownRecord[] {
  const list = dig(payload, [
    ["aweme_list"],
    ["awemeList"],
    ["itemList"],
    ["items"],
    ["videos"],
    ["aweme_detail"],
  ]);

  if (Array.isArray(list)) {
    return list.filter(isRecord);
  }

  if (isRecord(list)) {
    return [list];
  }

  const nested = dig(payload, [["data", "aweme_list"], ["data", "itemList"]]);
  if (Array.isArray(nested)) {
    return nested.filter(isRecord);
  }

  if (isRecord(nested)) {
    return [nested];
  }

  return [];
}

export function mapProfilePayload(
  profilePayload: unknown,
  videosPayload: unknown,
  fallbackHandle: string,
): UnifiedTikTokAccountData {
  const user = (dig(profilePayload, [
    ["user"],
    ["user_info"],
    ["userInfo"],
    ["data", "user"],
    ["data", "user_info"],
  ]) as UnknownRecord) ?? (isRecord(profilePayload) ? profilePayload : {});

  const handle =
    pickString(user.unique_id, user.uniqueId, user.username, fallbackHandle) ?? fallbackHandle;

  const author = {
    id: pickString(user.sec_uid, user.secUid, user.uid, user.id),
    handle,
    displayName: pickString(user.nickname, user.nick_name, user.display_name, handle) ?? handle,
    profileUrl: `https://www.tiktok.com/@${handle}`,
    avatarUrl: pickAvatarFromRecord(user),
    followers: toNumber(user.follower_count ?? user.followerCount ?? user.fans),
    likes: toNumber(user.total_favorited ?? user.heartCount ?? user.heart),
    videoCount: toNumber(user.aweme_count ?? user.videoCount ?? user.video),
  };

  const videos = extractAwemeList(videosPayload)
    .map((aweme) => mapAwemeToVideo(aweme, handle))
    .filter((video): video is UnifiedTikTokVideo => Boolean(video))
    .sort((left, right) => {
      const leftTime = left.postedAt ? new Date(left.postedAt).getTime() : 0;
      const rightTime = right.postedAt ? new Date(right.postedAt).getTime() : 0;
      return rightTime - leftTime;
    });

  return { author, videos };
}

export function toNormalizedProfile(
  data: UnifiedTikTokAccountData,
  maxVideos: number,
  platform: Platform = "tiktok",
): NormalizedTikTokProfile {
  const recentVideos = data.videos.slice(0, maxVideos);
  const scrapedViews = recentVideos.reduce((sum, video) => sum + video.views, 0);
  const videoLikes = recentVideos.reduce((sum, video) => sum + video.likes, 0);
  const videoComments = recentVideos.reduce((sum, video) => sum + video.comments, 0);
  const videoShares = recentVideos.reduce((sum, video) => sum + video.shares, 0);
  const engagementRate =
    scrapedViews > 0
      ? Number((((videoLikes + videoComments + videoShares) / scrapedViews) * 100).toFixed(2))
      : 0;

  return {
    platform,
    tiktokUserId: data.author.id,
    handle: data.author.handle,
    displayName: data.author.displayName,
    profileUrl: data.author.profileUrl,
    avatarUrl: data.author.avatarUrl,
    followersCount: data.author.followers,
    likesCount: data.author.likes,
    videoCount: data.author.videoCount || recentVideos.length,
    totalViews: scrapedViews,
    engagementRate,
    videos: recentVideos.map((video) => ({
      tiktokVideoId: video.id,
      title: video.title,
      videoUrl: video.url,
      thumbnailUrl: video.thumbnailUrl,
      viewsCount: video.views,
      likesCount: video.likes,
      commentsCount: video.comments,
      sharesCount: video.shares,
      collectsCount: video.collects,
      postedAt: video.postedAt,
    })),
  };
}

export function mapOneVideoPayload(payload: unknown, fallbackHandle: string) {
  const aweme =
    (dig(payload, [["aweme_detail"], ["aweme"], ["item"], ["video"]]) as UnknownRecord) ??
    (isRecord(payload) ? payload : null);

  if (!aweme) return null;
  return mapAwemeToVideo(aweme, fallbackHandle);
}
