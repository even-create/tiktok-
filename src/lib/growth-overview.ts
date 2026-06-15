import type { ApiAccount } from "@/lib/accounts";
import { formatCompact } from "@/lib/accounts";
import type { AccountSnapshotRow } from "@/lib/account-snapshots";
import { sumSnapshotTotals } from "@/lib/account-snapshots";
import { addDaysToDateKey, getSnapshotDateKey } from "@/lib/snapshot-date";

export type GrowthTrend = "up" | "down" | "flat" | null;

export type GrowthOverviewMetric = {
  id: string;
  titleZh: string;
  value: string;
  comparePercent: string | null;
  trend: GrowthTrend;
  valueTrend: GrowthTrend;
};

export type GrowthOverviewResult = {
  metrics: GrowthOverviewMetric[];
  dateLabel: string;
};

type CompareResult = {
  percent: string | null;
  trend: GrowthTrend;
};

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

function formatComparePercent(delta: number | null, baselineTotal: number | null): CompareResult {
  if (delta === null) {
    return { percent: null, trend: null };
  }

  if (baselineTotal === null || baselineTotal === 0) {
    if (delta === 0) {
      return { percent: "0%", trend: "flat" };
    }
    return { percent: null, trend: delta > 0 ? "up" : "down" };
  }

  const change = (delta / Math.abs(baselineTotal)) * 100;
  const rounded = Math.round(change);

  if (rounded === 0) {
    return { percent: "0%", trend: "flat" };
  }

  if (rounded > 0) {
    return { percent: `${Math.abs(rounded)}%`, trend: "up" };
  }

  return { percent: `${Math.abs(rounded)}%`, trend: "down" };
}

function resolveBaselineDateKey(
  snapshotsByDate: Map<string, AccountSnapshotRow[]>,
  todayKey: string,
  yesterdayKey: string,
): string | null {
  if (snapshotsByDate.get(todayKey)?.length) return todayKey;
  if (snapshotsByDate.get(yesterdayKey)?.length) return yesterdayKey;
  return null;
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

export function buildGrowthOverview(
  accounts: ApiAccount[],
  snapshots: AccountSnapshotRow[],
): GrowthOverviewResult {
  const todayKey = getSnapshotDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  const snapshotsByDate = new Map<string, AccountSnapshotRow[]>();
  for (const row of snapshots) {
    const bucket = snapshotsByDate.get(row.snapshot_date) ?? [];
    bucket.push(row);
    snapshotsByDate.set(row.snapshot_date, bucket);
  }

  const baselineDateKey = resolveBaselineDateKey(snapshotsByDate, todayKey, yesterdayKey);
  const baselineRows = baselineDateKey ? snapshotsByDate.get(baselineDateKey) ?? [] : [];
  const baselineTotals = sumSnapshotTotals(baselineRows);

  const followersDelta = baselineDateKey
    ? computeDeltaFromSnapshots(accounts, snapshotsByDate, baselineDateKey, "followers")
    : null;
  const viewsDelta = baselineDateKey
    ? computeDeltaFromSnapshots(accounts, snapshotsByDate, baselineDateKey, "views")
    : null;
  const likesDelta = baselineDateKey
    ? computeDeltaFromSnapshots(accounts, snapshotsByDate, baselineDateKey, "likes")
    : null;

  const followersCompare = formatComparePercent(followersDelta, baselineTotals.followers);
  const viewsCompare = formatComparePercent(viewsDelta, baselineTotals.views);
  const likesCompare = formatComparePercent(likesDelta, baselineTotals.likes);

  const metrics: GrowthOverviewMetric[] = [
    {
      id: "followers",
      titleZh: "新增粉丝",
      value: formatSignedDelta(followersDelta),
      comparePercent: followersCompare.percent,
      trend: followersCompare.trend,
      valueTrend: deltaTrend(followersDelta),
    },
    {
      id: "views",
      titleZh: "新增播放",
      value: formatSignedDelta(viewsDelta),
      comparePercent: viewsCompare.percent,
      trend: viewsCompare.trend,
      valueTrend: deltaTrend(viewsDelta),
    },
    {
      id: "likes",
      titleZh: "新增点赞",
      value: formatSignedDelta(likesDelta),
      comparePercent: likesCompare.percent,
      trend: likesCompare.trend,
      valueTrend: deltaTrend(likesDelta),
    },
  ];

  return {
    metrics,
    dateLabel: baselineDateKey ?? todayKey,
  };
}

export type AccountGrowthMetric = {
  key: string;
  label: string;
  value: string;
};

function sumVideoCollects(videos: Array<{ collects_count?: number | null }>) {
  return videos.reduce((sum, video) => sum + (video.collects_count ?? 0), 0);
}

function computeAccountMetricDelta(
  current: number,
  baseline: AccountSnapshotRow | null,
  field: "followers" | "likes" | "views" | "collects",
): number | null {
  if (!baseline) return null;

  const baselineValue =
    field === "followers"
      ? baseline.followers_count ?? 0
      : field === "likes"
        ? baseline.likes_count ?? 0
        : field === "views"
          ? baseline.total_views ?? 0
          : baseline.collects_count ?? 0;

  return current - baselineValue;
}

export function buildAccountGrowthMetrics(
  account: Pick<ApiAccount, "followers_count" | "likes_count" | "total_views">,
  videos: Array<{ collects_count?: number | null }>,
  baseline: AccountSnapshotRow | null,
): AccountGrowthMetric[] {
  const followersDelta = computeAccountMetricDelta(account.followers_count ?? 0, baseline, "followers");
  const viewsDelta = computeAccountMetricDelta(account.total_views ?? 0, baseline, "views");
  const likesDelta = computeAccountMetricDelta(account.likes_count ?? 0, baseline, "likes");
  const collectsDelta = computeAccountMetricDelta(sumVideoCollects(videos), baseline, "collects");

  return [
    { key: "followers", label: "新增粉丝", value: formatSignedDelta(followersDelta) },
    { key: "views", label: "新增播放", value: formatSignedDelta(viewsDelta) },
    { key: "likes", label: "新增点赞", value: formatSignedDelta(likesDelta) },
    { key: "collects", label: "新增收藏", value: formatSignedDelta(collectsDelta) },
  ];
}
