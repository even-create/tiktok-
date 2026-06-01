import type { ApiAccount, ApiVideo } from "@/lib/accounts";
import { formatCompact } from "@/lib/accounts";
import type { AccountSnapshotRow, AccountSnapshotTotals } from "@/lib/account-snapshots";
import { sumSnapshotTotals } from "@/lib/account-snapshots";
import { addDaysToDateKey, getSnapshotDateKey, isPostedOnDateKey } from "@/lib/snapshot-date";

export type GrowthTrend = "up" | "down" | "flat" | null;

export type GrowthOverviewMetric = {
  id: string;
  titleZh: string;
  value: string;
  comparePercent: string | null;
  trend: GrowthTrend;
  valueTrend: GrowthTrend;
  sparkline: number[];
};

export type GrowthOverviewResult = {
  metrics: GrowthOverviewMetric[];
  dateLabel: string;
};

type CompareResult = {
  percent: string | null;
  trend: GrowthTrend;
};

function formatCountChangePercent(today: number, yesterday: number): CompareResult {
  if (yesterday === 0) {
    if (today === 0) return { percent: "—", trend: "flat" };
    return { percent: "100%", trend: "up" };
  }

  const change = Math.round(((today - yesterday) / yesterday) * 100);
  if (change === 0) return { percent: "0%", trend: "flat" };
  if (change > 0) return { percent: `${change}%`, trend: "up" };
  return { percent: `${Math.abs(change)}%`, trend: "down" };
}

function buildSparkline(trend: GrowthTrend, seed: number) {
  const base = [0.35, 0.42, 0.38, 0.5, 0.48, 0.62, 0.72];
  const offset = (seed % 7) * 0.03;
  const scaled = base.map((point, index) => point + offset + index * 0.04);

  if (trend === "down") {
    return scaled.reverse();
  }

  if (trend === "flat" || trend === null) {
    return scaled.map(() => 0.5);
  }

  return scaled;
}

function formatSignedDelta(value: number | null) {
  if (value === null) return "N/A";
  if (value === 0) return "0";
  const formatted = formatCompact(Math.abs(value));
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

function deltaTrend(value: number | null): GrowthTrend {
  if (value === null) return null;
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function formatComparePercent(todayDelta: number | null, yesterdayDelta: number | null): CompareResult {
  if (todayDelta === null || yesterdayDelta === null) {
    return { percent: null, trend: null };
  }

  if (yesterdayDelta === 0) {
    if (todayDelta === 0) {
      return { percent: "0%", trend: "flat" };
    }
    return { percent: null, trend: todayDelta > 0 ? "up" : "down" };
  }

  const change = ((todayDelta - yesterdayDelta) / Math.abs(yesterdayDelta)) * 100;
  const rounded = Math.round(change);

  if (rounded === 0) {
    return { percent: "0%", trend: "flat" };
  }

  if (rounded > 0) {
    return { percent: `${Math.abs(rounded)}%`, trend: "up" };
  }

  return { percent: `${Math.abs(rounded)}%`, trend: "down" };
}

function snapshotMetricValue(row: AccountSnapshotRow, field: "followers" | "likes" | "views") {
  if (field === "followers") return row.followers_count ?? 0;
  if (field === "likes") return row.likes_count ?? 0;
  return row.total_views ?? 0;
}

function accountMetricValue(account: ApiAccount, field: "followers" | "likes" | "views") {
  if (field === "followers") return account.followers_count ?? 0;
  if (field === "likes") return account.likes_count ?? 0;
  return account.total_views ?? 0;
}

function computeDeltaFromSnapshots(
  accounts: ApiAccount[],
  snapshotsByDate: Map<string, AccountSnapshotRow[]>,
  baselineDateKey: string,
  field: "followers" | "likes" | "views",
): number | null {
  const baselineRows = snapshotsByDate.get(baselineDateKey);
  if (!baselineRows?.length) return null;

  const baselineByAccount = new Map(
    baselineRows.map((row) => [row.account_id, snapshotMetricValue(row, field)]),
  );

  let delta = 0;
  let matched = 0;

  for (const account of accounts) {
    const baseline = baselineByAccount.get(account.id);
    if (baseline === undefined) continue;

    matched += 1;
    delta += accountMetricValue(account, field) - baseline;
  }

  return matched > 0 ? delta : null;
}

function getVideosPostedToday(accounts: ApiAccount[], todayKey: string) {
  const videos: ApiVideo[] = [];

  for (const account of accounts) {
    for (const video of account.videos ?? []) {
      if (isPostedOnDateKey(video.posted_at, todayKey)) {
        videos.push(video);
      }
    }
  }

  return videos;
}

function getActiveAccountCount(accounts: ApiAccount[], todayKey: string) {
  const active = new Set<string>();

  for (const account of accounts) {
    for (const video of account.videos ?? []) {
      if (isPostedOnDateKey(video.posted_at, todayKey)) {
        active.add(account.id);
      }
    }
  }

  return active.size;
}

export function buildGrowthOverview(
  accounts: ApiAccount[],
  snapshots: AccountSnapshotRow[],
): GrowthOverviewResult {
  const todayKey = getSnapshotDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const dayBeforeKey = addDaysToDateKey(todayKey, -2);

  const snapshotsByDate = new Map<string, AccountSnapshotRow[]>();
  for (const row of snapshots) {
    const bucket = snapshotsByDate.get(row.snapshot_date) ?? [];
    bucket.push(row);
    snapshotsByDate.set(row.snapshot_date, bucket);
  }

  const todayFollowers = computeDeltaFromSnapshots(accounts, snapshotsByDate, yesterdayKey, "followers");
  const todayViews = computeDeltaFromSnapshots(accounts, snapshotsByDate, yesterdayKey, "views");
  const todayLikes = computeDeltaFromSnapshots(accounts, snapshotsByDate, yesterdayKey, "likes");

  const yesterdayTotals = sumSnapshotTotals(snapshotsByDate.get(yesterdayKey) ?? []);
  const dayBeforeTotals = sumSnapshotTotals(snapshotsByDate.get(dayBeforeKey) ?? []);
  const yesterdayFollowers =
    snapshotsByDate.get(yesterdayKey)?.length && snapshotsByDate.get(dayBeforeKey)?.length
      ? yesterdayTotals.followers - dayBeforeTotals.followers
      : null;
  const yesterdayViews =
    snapshotsByDate.get(yesterdayKey)?.length && snapshotsByDate.get(dayBeforeKey)?.length
      ? yesterdayTotals.views - dayBeforeTotals.views
      : null;
  const yesterdayLikes =
    snapshotsByDate.get(yesterdayKey)?.length && snapshotsByDate.get(dayBeforeKey)?.length
      ? yesterdayTotals.likes - dayBeforeTotals.likes
      : null;

  const todayVideos = getVideosPostedToday(accounts, todayKey);
  const yesterdayVideos = getVideosPostedToday(accounts, yesterdayKey);
  const activeAccounts = getActiveAccountCount(accounts, todayKey);
  const activeAccountsYesterday = getActiveAccountCount(accounts, yesterdayKey);
  const totalAccounts = accounts.length;
  const avgViewsToday =
    todayVideos.length > 0
      ? todayVideos.reduce((sum, video) => sum + (video.views_count ?? 0), 0) / todayVideos.length
      : null;
  const avgViewsYesterday =
    yesterdayVideos.length > 0
      ? yesterdayVideos.reduce((sum, video) => sum + (video.views_count ?? 0), 0) / yesterdayVideos.length
      : null;

  const followersCompare = formatComparePercent(todayFollowers, yesterdayFollowers);
  const viewsCompare = formatComparePercent(todayViews, yesterdayViews);
  const likesCompare = formatComparePercent(todayLikes, yesterdayLikes);
  const videosCompare = formatCountChangePercent(todayVideos.length, yesterdayVideos.length);
  const activeCompare = formatCountChangePercent(activeAccounts, activeAccountsYesterday);
  const avgViewsCompare = formatCountChangePercent(
    avgViewsToday === null ? 0 : Math.round(avgViewsToday),
    avgViewsYesterday === null ? 0 : Math.round(avgViewsYesterday),
  );

  const metrics: GrowthOverviewMetric[] = [
    {
      id: "followers",
      titleZh: "今日新增粉丝",
      value: formatSignedDelta(todayFollowers),
      comparePercent: followersCompare.percent,
      trend: followersCompare.trend,
      valueTrend: deltaTrend(todayFollowers),
      sparkline: buildSparkline(followersCompare.trend ?? deltaTrend(todayFollowers), 1),
    },
    {
      id: "views",
      titleZh: "今日新增播放",
      value: formatSignedDelta(todayViews),
      comparePercent: viewsCompare.percent,
      trend: viewsCompare.trend,
      valueTrend: deltaTrend(todayViews),
      sparkline: buildSparkline(viewsCompare.trend ?? deltaTrend(todayViews), 2),
    },
    {
      id: "likes",
      titleZh: "今日新增点赞",
      value: formatSignedDelta(todayLikes),
      comparePercent: likesCompare.percent,
      trend: likesCompare.trend,
      valueTrend: deltaTrend(todayLikes),
      sparkline: buildSparkline(likesCompare.trend ?? deltaTrend(todayLikes), 3),
    },
    {
      id: "videos",
      titleZh: "今日发布视频数",
      value: String(todayVideos.length),
      comparePercent: videosCompare.percent,
      trend: videosCompare.trend,
      valueTrend: todayVideos.length > 0 ? "up" : "flat",
      sparkline: buildSparkline(videosCompare.trend, 4),
    },
    {
      id: "active-accounts",
      titleZh: "今日有发视频的账号数",
      value: totalAccounts > 0 ? `${activeAccounts} / ${totalAccounts}` : "0 / 0",
      comparePercent: activeCompare.percent,
      trend: activeCompare.trend,
      valueTrend: activeAccounts > 0 ? "up" : "flat",
      sparkline: buildSparkline(activeCompare.trend, 5),
    },
    {
      id: "avg-views",
      titleZh: "今日发布视频平均播放",
      value: avgViewsToday === null ? (todayVideos.length === 0 ? "0" : "N/A") : formatCompact(avgViewsToday),
      comparePercent: todayVideos.length > 0 ? avgViewsCompare.percent : "—",
      trend: todayVideos.length > 0 ? avgViewsCompare.trend : "flat",
      valueTrend: avgViewsToday && avgViewsToday > 0 ? "up" : "flat",
      sparkline: buildSparkline(avgViewsCompare.trend, 6),
    },
  ];

  return {
    metrics,
    dateLabel: todayKey,
  };
}
