import {
  buildViewsTrendPoints,
  filterAccounts,
  formatCompact,
  formatLastSynced,
  getAvailablePlatforms,
  initialsFromName,
  sortAccounts,
  tiktokProfileUrl,
  type AccountSortMode,
  type ApiVideo,
  type TrendPoint,
} from "@/lib/accounts";
import { mapApiVideoToContentVideo } from "@/lib/content-analytics";
import type { Platform } from "@/lib/providers/platform";

export type ApiBenchmarkAccount = {
  id: string;
  owner_id: string;
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
  videos?: ApiVideo[];
};

export type BenchmarkListItem = {
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
  collectsLabel: string;
  lastSyncedLabel: string;
  trendPoints: TrendPoint[];
  videoCount: number;
};

export function mapApiBenchmarkAccount(account: ApiBenchmarkAccount): BenchmarkListItem {
  const displayName = account.display_name?.trim() || account.handle;
  const platform = (account.platform as Platform) || "tiktok";
  const followersCount = account.followers_count ?? 0;
  const likesCount = account.likes_count ?? 0;
  const totalViews = account.total_views ?? 0;
  const engagementRate = Number(account.engagement_rate ?? 0);
  const videoCount = account.video_count ?? account.videos?.length ?? 0;
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
    collectsLabel: formatCompact(collectsCount),
    lastSyncedLabel: formatLastSynced(account.last_synced_at),
    trendPoints: buildViewsTrendPoints(account.videos, 8, platform === "tiktok" || platform === "douyin" || platform === "youtube" ? "views" : "likes"),
    videoCount,
  };
}

export function filterBenchmarkAccounts(accounts: BenchmarkListItem[], query: string) {
  return filterAccounts(
    accounts as unknown as Parameters<typeof filterAccounts>[0],
    query,
  ) as unknown as BenchmarkListItem[];
}

export function sortBenchmarkAccounts(accounts: BenchmarkListItem[], mode: AccountSortMode) {
  return sortAccounts(
    accounts as unknown as Parameters<typeof sortAccounts>[0],
    mode,
  ) as unknown as BenchmarkListItem[];
}

export function getBenchmarkPlatforms(accounts: BenchmarkListItem[]) {
  return getAvailablePlatforms(accounts as unknown as Parameters<typeof getAvailablePlatforms>[0]);
}

export function flattenBenchmarkVideos(account: ApiBenchmarkAccount) {
  const displayName = account.display_name?.trim() || account.handle;
  const platform = (account.platform as Platform) || "tiktok";

  return (account.videos ?? []).map((video) =>
    mapApiVideoToContentVideo(
      video,
      account.id,
      account.handle,
      displayName,
      platform,
      account.profile_url,
      account.avatar_url ?? null,
      "",
    ),
  );
}

export type { AccountSortMode };
