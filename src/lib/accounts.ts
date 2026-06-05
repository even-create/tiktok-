import { formatBeijingTime, getBeijingTimestamp } from "@/lib/format-beijing-time";

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
  followersLabel: string;
  likesLabel: string;
  viewsLabel: string;
  engagementLabel: string;
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

export function buildViewsTrendPoints(videos: ApiVideo[] | undefined, maxPoints = 8): TrendPoint[] {
  if (!videos?.length) return [];

  const sorted = [...videos].sort((left, right) => {
    const leftTime = left.posted_at ? (getBeijingTimestamp(left.posted_at) ?? 0) : 0;
    const rightTime = right.posted_at ? (getBeijingTimestamp(right.posted_at) ?? 0) : 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return (left.views_count ?? 0) - (right.views_count ?? 0);
  });

  return sorted.slice(-maxPoints).map((video, index) => ({
    label: String(index + 1),
    value: video.views_count ?? 0,
  }));
}

export function mapApiAccount(account: ApiAccount): AccountListItem {
  const displayName = account.display_name?.trim() || account.handle;
  const followersCount = account.followers_count ?? 0;
  const likesCount = account.likes_count ?? 0;
  const totalViews = account.total_views ?? 0;
  const engagementRate = Number(account.engagement_rate ?? 0);

  return {
    id: account.id,
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
    followersLabel: formatCompact(followersCount),
    likesLabel: formatCompact(likesCount),
    viewsLabel: formatCompact(totalViews),
    engagementLabel: `${engagementRate.toFixed(1)}%`,
    lastSyncedLabel: formatLastSynced(account.last_synced_at),
    trendPoints: buildViewsTrendPoints(account.videos),
    videoCount: account.video_count ?? account.videos?.length ?? 0,
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

export function sortAccountsByFollowers(accounts: AccountListItem[], enabled: boolean) {
  if (!enabled) return accounts;

  return [...accounts].sort((left, right) => right.followersCount - left.followersCount);
}
