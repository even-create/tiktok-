export type ApiVideo = {
  id: string;
  title: string;
  video_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
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
};

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatLastSynced(value: string | null) {
  if (!value) return "未同步";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未同步";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    const leftTime = left.posted_at ? new Date(left.posted_at).getTime() : 0;
    const rightTime = right.posted_at ? new Date(right.posted_at).getTime() : 0;
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
