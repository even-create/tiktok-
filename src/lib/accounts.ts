import { formatBeijingTime, getBeijingTimestamp } from "@/lib/format-beijing-time";
import { VIEW_PRIMARY_PLATFORMS, type Platform } from "@/lib/providers/platform";

export type ApiVideo = {
  id: string;
  title: string;
  video_url: string | null;
  thumbnail_url?: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  collects_count?: number | null;
  retention_rate: number | null;
  posted_at: string | null;
};

export type ApiAccount = {
  id: string;
  platform?: string | null;
  handle: string;
  display_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  followers_count: number | null;
  likes_count: number | null;
  total_views: number | null;
  engagement_rate: number | null;
  video_count: number | null;
  last_synced_at: string | null;
  created_at?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  videos?: ApiVideo[];
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type AccountListItem = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string | null;
  initials: string;
  followersCount: number;
  likesCount: number;
  totalViews: number;
  engagementRate: number;
  lastSyncedAt: string | null;
  createdAt: string | null;
  followersLabel: string;
  likesLabel: string;
  viewsLabel: string;
  engagementLabel: string;
  avgLikesLabel: string;
  collectsCount: number;
  collectsLabel: string;
  lastSyncedLabel: string;
  trendPoints: TrendPoint[];
  videoCount: number;
  ownerId: string;
  ownerName: string;
};

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatLastSynced(value: string | null) {
  return formatBeijingTime(value, "未同步");
}

export function initialsFromName(value: string) {
  return (
    value
      .split(/[._\s-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "TT"
  );
}

export function tiktokProfileUrl(handle: string, profileUrl?: string | null) {
  const clean = profileUrl?.trim();
  if (clean) return clean;
  return `https://www.tiktok.com/@${handle}`;
}

export function buildViewsTrendPoints(
  videos: ApiVideo[] | undefined,
  maxPoints = 8,
  metric: "views" | "likes" = "views",
): TrendPoint[] {
  if (!videos?.length) return [];

  const valueOf = (video: ApiVideo) =>
    metric === "likes" ? video.likes_count ?? 0 : video.views_count ?? 0;

  const sorted = [...videos].sort((left, right) => {
    const leftTime = left.posted_at ? (getBeijingTimestamp(left.posted_at) ?? 0) : 0;
    const rightTime = right.posted_at ? (getBeijingTimestamp(right.posted_at) ?? 0) : 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return valueOf(left) - valueOf(right);
  });

  return sorted.slice(-maxPoints).map((video, index) => ({
    label: String(index + 1),
    value: valueOf(video),
  }));
}

export function mapApiAccount(account: ApiAccount): AccountListItem {
  const displayName = account.display_name?.trim() || account.handle;
  const platform = (account.platform as Platform) || "tiktok";
  const isViewPrimary = VIEW_PRIMARY_PLATFORMS.has(platform);
  const followersCount = account.followers_count ?? 0;
  const likesCount = account.likes_count ?? 0;
  const totalViews = account.total_views ?? 0;
  const engagementRate = Number(account.engagement_rate ?? 0);
  const videoCount = account.video_count ?? account.videos?.length ?? 0;
  const avgLikes = videoCount > 0 ? Math.round(likesCount / videoCount) : 0;
  const collectsCount = (account.videos ?? []).reduce((sum, video) => sum + (video.collects_count ?? 0), 0);

  return {
    id: account.id,
    platform,
    handle: account.handle,
    displayName,
    profileUrl: tiktokProfileUrl(account.handle, account.profile_url),
    avatarUrl: account.avatar_url,
    initials: initialsFromName(displayName),
    followersCount,
    likesCount,
    totalViews,
    engagementRate,
    lastSyncedAt: account.last_synced_at,
    createdAt: account.created_at ?? null,
    followersLabel: formatCompact(followersCount),
    likesLabel: formatCompact(likesCount),
    viewsLabel: formatCompact(totalViews),
    engagementLabel: `${engagementRate.toFixed(1)}%`,
    avgLikesLabel: formatCompact(avgLikes),
    collectsCount,
    collectsLabel: formatCompact(collectsCount),
    lastSyncedLabel: formatLastSynced(account.last_synced_at),
    trendPoints: buildViewsTrendPoints(account.videos, 8, isViewPrimary ? "views" : "likes"),
    videoCount,
    ownerId: account.owner_id?.trim() || "admin",
    ownerName: account.owner_name?.trim() || "Even",
  };
}

export function filterAccounts(accounts: AccountListItem[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return accounts;

  return accounts.filter(
    (account) =>
      account.handle.toLowerCase().includes(keyword) ||
      account.displayName.toLowerCase().includes(keyword),
  );
}

export type AccountSortMode = "latest" | "followers" | "views" | "engagement" | "updated";

const PLATFORM_DISPLAY_ORDER: Platform[] = [
  "tiktok",
  "douyin",
  "xiaohongshu",
  "instagram",
  "youtube",
  "reddit",
];

function sortTimestamp(value: string | null) {
  return getBeijingTimestamp(value) ?? 0;
}

export function getAvailablePlatforms(accounts: AccountListItem[]): Platform[] {
  const present = new Set(accounts.map((account) => account.platform));
  return PLATFORM_DISPLAY_ORDER.filter((platform) => present.has(platform));
}

export function sortAccounts(accounts: AccountListItem[], mode: AccountSortMode) {
  const sorted = [...accounts];

  switch (mode) {
    case "followers":
      return sorted.sort((left, right) => right.followersCount - left.followersCount);
    case "views":
      return sorted.sort((left, right) => right.totalViews - left.totalViews);
    case "engagement":
      return sorted.sort((left, right) => right.engagementRate - left.engagementRate);
    case "updated":
      return sorted.sort(
        (left, right) => sortTimestamp(right.lastSyncedAt) - sortTimestamp(left.lastSyncedAt),
      );
    case "latest":
    default:
      return sorted.sort((left, right) => sortTimestamp(right.createdAt) - sortTimestamp(left.createdAt));
  }
}
