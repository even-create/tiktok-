import { NextResponse } from "next/server";
import { fetchSnapshotsForDates, groupSnapshotsByDate } from "@/lib/account-snapshots";
import { buildGrowthOverview } from "@/lib/growth-overview";
import { addDaysToDateKey, getSnapshotDateKey } from "@/lib/snapshot-date";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*, videos(id, views_count, likes_count, posted_at)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const accounts = data ?? [];
    const todayKey = getSnapshotDateKey();
    const yesterdayKey = addDaysToDateKey(todayKey, -1);
    const dayBeforeKey = addDaysToDateKey(todayKey, -2);

    const snapshots = await fetchSnapshotsForDates([yesterdayKey, dayBeforeKey]);
    const overview = buildGrowthOverview(accounts, snapshots);

    return NextResponse.json({
      ...overview,
      snapshotDays: {
        today: todayKey,
        yesterday: yesterdayKey,
        hasYesterday: (groupSnapshotsByDate(snapshots).get(yesterdayKey)?.length ?? 0) > 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "增长概览加载失败";
    return NextResponse.json(
      {
        metrics: buildGrowthOverview([], []).metrics,
        dateLabel: getSnapshotDateKey(),
        error: message,
      },
      { status: 200 },
    );
  }
}
