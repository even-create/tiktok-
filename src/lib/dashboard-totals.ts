import { formatCompact, type ApiAccount } from "@/lib/accounts";
import type { AccountSnapshotRow } from "@/lib/account-snapshots";

export type DashboardTotals = {
  followers: string;
  likes: string;
  views: string;
  videos: string;
  avgInteraction: string;
  accountCount: number;
};

export function resolveAccountOwnerId(account: Pick<ApiAccount, "owner_id">) {
  return account.owner_id?.trim() || "admin";
}

export function filterAccountsByOwnerId(accounts: ApiAccount[], ownerId: string) {
  return accounts.filter((account) => resolveAccountOwnerId(account) === ownerId);
}

export function filterSnapshotsForAccounts(
  snapshots: AccountSnapshotRow[],
  accounts: ApiAccount[],
) {
  const accountIds = new Set(accounts.map((account) => account.id));
  return snapshots.filter((row) => accountIds.has(row.account_id));
}

export type DashboardViewMode = "team" | "personal";

export function resolveDashboardAccounts(
  teamAccounts: ApiAccount[],
  viewMode: DashboardViewMode,
  ownerId: string,
) {
  if (viewMode === "team") return teamAccounts;
  return filterAccountsByOwnerId(teamAccounts, ownerId);
}

export function computeDashboardTotals(accounts: ApiAccount[]): DashboardTotals {
  let totalFollowers = 0;
  let totalLikes = 0;
  let totalViews = 0;
  let totalVideos = 0;
  let interactionSum = 0;

  for (const account of accounts) {
    totalFollowers += account.followers_count ?? 0;
    totalLikes += account.likes_count ?? 0;
    totalViews += account.total_views ?? 0;

    for (const video of account.videos ?? []) {
      totalVideos += 1;
      const views = video.views_count ?? 0;
      const likes = video.likes_count ?? 0;
      const comments = video.comments_count ?? 0;
      const shares = video.shares_count ?? 0;
      if (views > 0) {
        interactionSum += ((likes + comments + shares) / views) * 100;
      }
    }
  }

  return {
    followers: formatCompact(totalFollowers),
    likes: formatCompact(totalLikes),
    views: formatCompact(totalViews),
    videos: String(totalVideos),
    avgInteraction: totalVideos > 0 ? `${(interactionSum / totalVideos).toFixed(2)}%` : "0%",
    accountCount: accounts.length,
  };
}
