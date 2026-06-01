import { getSnapshotDateKey } from "@/lib/snapshot-date";
import { supabase } from "@/lib/supabase";

export type AccountSnapshotRow = {
  account_id: string;
  snapshot_date: string;
  followers_count: number;
  likes_count: number;
  total_views: number;
  video_count: number;
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
    },
    { onConflict: "account_id,snapshot_date" },
  );

  if (error && !error.message.includes("account_daily_snapshots")) {
    console.warn("[account-snapshots] record failed:", error.message);
  }
}

export async function fetchSnapshotsForDates(dates: string[]) {
  if (!dates.length) return [] as AccountSnapshotRow[];

  const { data, error } = await supabase
    .from("account_daily_snapshots")
    .select("account_id, snapshot_date, followers_count, likes_count, total_views, video_count")
    .in("snapshot_date", dates);

  if (error) {
    if (error.message.includes("account_daily_snapshots")) {
      return [] as AccountSnapshotRow[];
    }
    throw new Error(error.message);
  }

  return (data ?? []) as AccountSnapshotRow[];
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
