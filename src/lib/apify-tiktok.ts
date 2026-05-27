import { createHash } from "node:crypto";

export type ApifyTikTokVideoItem = {
  id?: string | number | null;
  text?: string | null;
  createTime?: number | null;
  createTimeISO?: string | null;
  webVideoUrl?: string | null;
  diggCount?: number | null;
  shareCount?: number | null;
  playCount?: number | null;
  commentCount?: number | null;
  collectCount?: number | null;
  input?: string | null;
  authorMeta?: {
    id?: string | null;
    name?: string | null;
    nickName?: string | null;
    verified?: boolean | null;
    signature?: string | null;
    avatar?: string | null;
    fans?: number | null;
    heart?: number | null;
    video?: number | null;
    profileUrl?: string | null;
  } | null;
  videoMeta?: {
    coverUrl?: string | null;
    originalCoverUrl?: string | null;
    duration?: number | null;
  } | null;
  error?: string | null;
  errorCode?: string | null;
};

export type NormalizedTikTokProfile = {
  tiktokUserId: string | null;
  handle: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string | null;
  followersCount: number;
  likesCount: number;
  videoCount: number;
  totalViews: number;
  engagementRate: number;
  videos: Array<{
    tiktokVideoId: string;
    title: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    postedAt: string | null;
  }>;
};

const APIFY_ACTOR_ID = "clockworks~tiktok-profile-scraper";

export function parseTikTokHandle(value: string) {
  const clean = value.trim();
  const fromUrl = clean.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i)?.[1];
  const fromHandle = clean.match(/^@?([A-Za-z0-9._]+)$/)?.[1];
  return (fromUrl ?? fromHandle ?? "").replace(/\/$/, "");
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function fallbackVideoId(item: ApifyTikTokVideoItem) {
  const source = item.webVideoUrl ?? item.text ?? JSON.stringify(item);
  return createHash("sha1").update(source).digest("hex");
}

function titleFromText(text?: string | null) {
  const clean = text?.trim();
  if (!clean) return "Untitled TikTok video";
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

export async function scrapeTikTokProfile(inputUrl: string): Promise<NormalizedTikTokProfile> {
  const token = process.env.APIFY_TOKEN;
  const handle = parseTikTokHandle(inputUrl);

  if (!token) {
    throw new Error("Missing APIFY_TOKEN");
  }

  if (!handle) {
    throw new Error("请输入有效的 TikTok 账号链接，例如 https://www.tiktok.com/@username");
  }

  const apifyUrl = new URL(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items`);
  apifyUrl.searchParams.set("token", token);
  apifyUrl.searchParams.set("timeout", "240");

  const response = await fetch(apifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profiles: [handle],
      resultsPerPage: 30,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadSubtitles: false,
      shouldDownloadVideos: false,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Apify 抓取失败：${message || response.statusText}`);
  }

  const items = (await response.json()) as ApifyTikTokVideoItem[];
  const failedItem = items.find((item) => item.error || item.errorCode);

  if (failedItem) {
    throw new Error(failedItem.error ?? failedItem.errorCode ?? "Apify 返回抓取错误");
  }

  if (!items.length) {
    throw new Error("Apify 没有返回视频数据，请确认账号存在且为公开账号。");
  }

  const firstAuthor = items.find((item) => item.authorMeta)?.authorMeta;
  const normalizedHandle = firstAuthor?.name ?? handle;
  const totalViews = items.reduce((sum, item) => sum + toNumber(item.playCount), 0);
  const videoLikes = items.reduce((sum, item) => sum + toNumber(item.diggCount), 0);
  const videoComments = items.reduce((sum, item) => sum + toNumber(item.commentCount), 0);
  const videoShares = items.reduce((sum, item) => sum + toNumber(item.shareCount), 0);
  const engagementRate =
    totalViews > 0 ? Number((((videoLikes + videoComments + videoShares) / totalViews) * 100).toFixed(2)) : 0;

  return {
    tiktokUserId: firstAuthor?.id ?? null,
    handle: normalizedHandle,
    displayName: firstAuthor?.nickName ?? normalizedHandle,
    profileUrl: firstAuthor?.profileUrl ?? `https://www.tiktok.com/@${normalizedHandle}`,
    avatarUrl: firstAuthor?.avatar ?? null,
    followersCount: toNumber(firstAuthor?.fans),
    likesCount: toNumber(firstAuthor?.heart),
    videoCount: toNumber(firstAuthor?.video) || items.length,
    totalViews,
    engagementRate,
    videos: items.map((item) => ({
      tiktokVideoId: String(item.id ?? fallbackVideoId(item)),
      title: titleFromText(item.text),
      videoUrl: item.webVideoUrl ?? null,
      thumbnailUrl: item.videoMeta?.coverUrl ?? item.videoMeta?.originalCoverUrl ?? null,
      viewsCount: toNumber(item.playCount),
      likesCount: toNumber(item.diggCount),
      commentsCount: toNumber(item.commentCount),
      sharesCount: toNumber(item.shareCount),
      postedAt: item.createTimeISO ?? (item.createTime ? new Date(item.createTime * 1000).toISOString() : null),
    })),
  };
}
