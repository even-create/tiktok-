import { formatCompact, type ApiAccount, type ApiVideo } from "@/lib/accounts";

export type DateRangeFilter = "7d" | "30d" | "all";

export type VideoSortField = "views" | "likes" | "comments";

export type ContentVideo = {
  id: string;
  accountId: string;
  accountHandle: string;
  accountDisplayName: string;
  title: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  retentionRate: number | null;
  engagementRate: number;
  performanceScore: number;
  postedAt: string | null;
  postedLabel: string;
  tags: string[];
  viewsLabel: string;
  likesLabel: string;
  commentsLabel: string;
  sharesLabel: string;
  engagementLabel: string;
};

export type TagStat = {
  tag: string;
  count: number;
  totalViews: number;
  avgEngagement: number;
};

export type ContentAnalyticsStats = {
  videoCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagement: number;
  uniqueTags: number;
};

function calcEngagementRate(likes: number, comments: number, shares: number, views: number) {
  if (views <= 0) return 0;
  return ((likes + comments + shares) / views) * 100;
}

function calcPerformanceScore(views: number, likes: number, comments: number, shares: number, engagementRate: number) {
  return views * (1 + engagementRate / 100) + likes * 2 + comments * 5 + shares * 8;
}

export function extractTagsFromTitle(title: string) {
  const hashtags = title.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const normalized = hashtags.map((tag) => tag.toLowerCase());

  if (normalized.length) {
    return [...new Set(normalized)];
  }

  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .slice(0, 3);

  return [...new Set(words)];
}

function formatPostedAt(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function flattenVideosFromAccounts(accounts: ApiAccount[]): ContentVideo[] {
  const items: ContentVideo[] = [];

  for (const account of accounts) {
    const displayName = account.display_name?.trim() || account.handle;

    for (const video of account.videos ?? []) {
      items.push(mapApiVideoToContentVideo(video, account.id, account.handle, displayName));
    }
  }

  return items;
}

export function mapApiVideoToContentVideo(
  video: ApiVideo & { thumbnail_url?: string | null },
  accountId: string,
  accountHandle: string,
  accountDisplayName: string,
): ContentVideo {
  const viewsCount = video.views_count ?? 0;
  const likesCount = video.likes_count ?? 0;
  const commentsCount = video.comments_count ?? 0;
  const sharesCount = video.shares_count ?? 0;
  const engagementRate = calcEngagementRate(likesCount, commentsCount, sharesCount, viewsCount);

  return {
    id: video.id,
    accountId,
    accountHandle,
    accountDisplayName,
    title: video.title,
    videoUrl: video.video_url,
    thumbnailUrl: video.thumbnail_url ?? null,
    viewsCount,
    likesCount,
    commentsCount,
    sharesCount,
    retentionRate:
      typeof video.retention_rate === "number" && Number.isFinite(video.retention_rate)
        ? video.retention_rate
        : null,
    engagementRate,
    performanceScore: calcPerformanceScore(viewsCount, likesCount, commentsCount, sharesCount, engagementRate),
    postedAt: video.posted_at,
    postedLabel: formatPostedAt(video.posted_at),
    tags: extractTagsFromTitle(video.title),
    viewsLabel: formatCompact(viewsCount),
    likesLabel: formatCompact(likesCount),
    commentsLabel: formatCompact(commentsCount),
    sharesLabel: formatCompact(sharesCount),
    engagementLabel: `${engagementRate.toFixed(2)}%`,
  };
}

export function filterVideosByDateRange(videos: ContentVideo[], range: DateRangeFilter) {
  if (range === "all") return videos;

  const days = range === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return videos.filter((video) => {
    if (!video.postedAt) return false;
    const time = new Date(video.postedAt).getTime();
    return !Number.isNaN(time) && time >= cutoff;
  });
}

export function filterVideosBySearch(videos: ContentVideo[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return videos;

  return videos.filter(
    (video) =>
      video.title.toLowerCase().includes(keyword) ||
      video.accountHandle.toLowerCase().includes(keyword) ||
      video.accountDisplayName.toLowerCase().includes(keyword) ||
      video.tags.some((tag) => tag.includes(keyword)),
  );
}

export function sortVideos(videos: ContentVideo[], field: VideoSortField) {
  const next = [...videos];

  switch (field) {
    case "likes":
      return next.sort((left, right) => right.likesCount - left.likesCount);
    case "comments":
      return next.sort((left, right) => right.commentsCount - left.commentsCount);
    default:
      return next.sort((left, right) => right.viewsCount - left.viewsCount);
  }
}

export function buildContentStats(videos: ContentVideo[]): ContentAnalyticsStats {
  if (!videos.length) {
    return {
      videoCount: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      avgEngagement: 0,
      uniqueTags: 0,
    };
  }

  const totalViews = videos.reduce((sum, video) => sum + video.viewsCount, 0);
  const totalLikes = videos.reduce((sum, video) => sum + video.likesCount, 0);
  const totalComments = videos.reduce((sum, video) => sum + video.commentsCount, 0);
  const totalShares = videos.reduce((sum, video) => sum + video.sharesCount, 0);
  const avgEngagement = videos.reduce((sum, video) => sum + video.engagementRate, 0) / videos.length;
  const tagSet = new Set(videos.flatMap((video) => video.tags));

  return {
    videoCount: videos.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    avgEngagement,
    uniqueTags: tagSet.size,
  };
}

export function buildTagStats(videos: ContentVideo[], limit = 12): TagStat[] {
  const map = new Map<string, { count: number; totalViews: number; engagementSum: number }>();

  for (const video of videos) {
    for (const tag of video.tags) {
      const current = map.get(tag) ?? { count: 0, totalViews: 0, engagementSum: 0 };
      current.count += 1;
      current.totalViews += video.viewsCount;
      current.engagementSum += video.engagementRate;
      map.set(tag, current);
    }
  }

  return [...map.entries()]
    .map(([tag, value]) => ({
      tag,
      count: value.count,
      totalViews: value.totalViews,
      avgEngagement: value.count ? value.engagementSum / value.count : 0,
    }))
    .sort((left, right) => right.count - left.count || right.totalViews - left.totalViews)
    .slice(0, limit);
}

export function pickTopVideos(videos: ContentVideo[], metric: keyof Pick<ContentVideo, "performanceScore" | "viewsCount" | "engagementRate" | "sharesCount">, limit = 5) {
  return [...videos].sort((left, right) => right[metric] - left[metric]).slice(0, limit);
}
