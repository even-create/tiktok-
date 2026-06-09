import { getSnapshotDateKey } from "@/lib/snapshot-date";
import { supabase } from "@/lib/supabase";

export type AccountSnapshotRow = {
  account_id: string;
  snapshot_date: string;
  followers_count: number;
  likes_count: number;
  total_views: number;
  video_count: number;
  collects_count?: number;
};

export type AccountSnapshotTotals = {
  followers: number;
  likes: number;
  views: number;
  videoCount: number;
};

type SnapshotAccount = {
  id: string;
  followers_count?: number | null;
  likes_count?: number | null;
  total_views?: number | null;
  video_count?: number | null;
  collects_count?: number | null;
};

export function sumSnapshotTotals(rows: AccountSnapshotRow[]): AccountSnapshotTotals {
  return rows.reduce(
    (totals, row) => ({
      followers: totals.followers + (row.followers_count ?? 0),
      likes: totals.likes + (row.likes_count ?? 0),
      views: totals.views + (row.total_views ?? 0),
      videoCount: totals.videoCount + (row.video_count ?? 0),
    }),
    { followers: 0, likes: 0, views: 0, videoCount: 0 },
  );
}

export async function recordAccountDailySnapshot(account: SnapshotAccount) {
  const snapshotDate = getSnapshotDateKey();

  const { error } = await supabase.from("account_daily_snapshots").upsert(
    {
      account_id: account.id,
      snapshot_date: snapshotDate,
      followers_count: account.followers_count ?? 0,
      likes_count: account.likes_count ?? 0,
      total_views: account.total_views ?? 0,
      video_count: account.video_count ?? 0,
      collects_count: account.collects_count ?? 0,
    },
    { onConflict: "account_id,snapshot_date" },
  );

  if (error) {
    console.warn("[account-snapshots] record failed:", error.message);
    return false;
  }

  return true;
}

export async function recordAllAccountSnapshots(accounts: SnapshotAccount[]) {
  if (!accounts.length) return { tableReady: true, recorded: 0 };

  const results = await Promise.all(accounts.map((account) => recordAccountDailySnapshot(account)));

  return {
    tableReady: results.some(Boolean),
    recorded: results.filter(Boolean).length,
  };
}

export async function fetchSnapshotsForDates(dates: string[]) {
  if (!dates.length) {
    return { rows: [] as AccountSnapshotRow[], tableReady: true };
  }

  const { data, error } = await supabase
    .from("account_daily_snapshots")
    .select(
      "account_id, snapshot_date, followers_count, likes_count, total_views, video_count, collects_count",
    )
    .in("snapshot_date", dates);

  if (error) {
    const missingTable =
      error.message.includes("account_daily_snapshots") ||
      error.message.includes("schema cache") ||
      error.code === "42P01";

    if (missingTable) {
      return { rows: [] as AccountSnapshotRow[], tableReady: false };
    }

    if (error.message.includes("collects_count")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("account_daily_snapshots")
        .select("account_id, snapshot_date, followers_count, likes_count, total_views, video_count")
        .in("snapshot_date", dates);

      if (fallbackError) {
        return { rows: [] as AccountSnapshotRow[], tableReady: true };
      }

      return { rows: (fallbackData ?? []) as AccountSnapshotRow[], tableReady: true };
    }

    return { rows: [] as AccountSnapshotRow[], tableReady: true };
  }

  return { rows: (data ?? []) as AccountSnapshotRow[], tableReady: true };
}

export type ViewsSeriesPoint = { date: string; views: number };

/** Daily total-views series for a single account, oldest → newest. Used by the trend chart. */
export async function fetchViewsSeriesForAccount(accountId: string): Promise<ViewsSeriesPoint[]> {
  const { data, error } = await supabase
    .from("account_daily_snapshots")
    .select("snapshot_date, total_views")
    .eq("account_id", accountId)
    .order("snapshot_date", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    date: row.snapshot_date as string,
    views: (row.total_views as number | null) ?? 0,
  }));
}

export function groupSnapshotsByDate(rows: AccountSnapshotRow[]) {
  const map = new Map<string, AccountSnapshotRow[]>();

  for (const row of rows) {
    const dateKey = row.snapshot_date;
    const bucket = map.get(dateKey) ?? [];
    bucket.push(row);
    map.set(dateKey, bucket);
  }

  return map;
}

export async function fetchSnapshotForAccount(accountId: string, snapshotDate: string) {
  const { data, error } = await supabase
    .from("account_daily_snapshots")
    .select(
      "account_id, snapshot_date, followers_count, likes_count, total_views, video_count, collects_count",
    )
    .eq("account_id", accountId)
    .eq("snapshot_date", snapshotDate)
    .maybeSingle();

  if (error) {
    const missingTable =
      error.message.includes("account_daily_snapshots") ||
      error.message.includes("schema cache") ||
      error.code === "42P01";

    if (missingTable) {
      return { row: null as AccountSnapshotRow | null, tableReady: false };
    }

    if (error.message.includes("collects_count")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("account_daily_snapshots")
        .select("account_id, snapshot_date, followers_count, likes_count, total_views, video_count")
        .eq("account_id", accountId)
        .eq("snapshot_date", snapshotDate)
        .maybeSingle();

      if (fallbackError) {
        return { row: null as AccountSnapshotRow | null, tableReady: true };
      }

      return { row: (fallbackData ?? null) as AccountSnapshotRow | null, tableReady: true };
    }

    return { row: null as AccountSnapshotRow | null, tableReady: true };
  }

  return { row: (data ?? null) as AccountSnapshotRow | null, tableReady: true };
}
