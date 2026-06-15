import { NextResponse } from "next/server";
import { fetchSnapshotsForDates, recordAllAccountSnapshots } from "@/lib/account-snapshots";
import { getCurrentUser } from "@/lib/current-user";
import { buildGrowthOverview } from "@/lib/growth-overview";
import { addDaysToDateKey, getSnapshotDateKey } from "@/lib/snapshot-date";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const user = await getCurrentUser();

    let accountsQuery = supabase
      .from("accounts")
      .select("*, videos(id, views_count, likes_count, posted_at)")
      .order("created_at", { ascending: false });

    if (user?.role === "MEMBER") {
      accountsQuery = accountsQuery.eq("owner_id", user.id);
    }

    const { data, error } = await accountsQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const accounts = data ?? [];
    const todayKey = getSnapshotDateKey();
    const yesterdayKey = addDaysToDateKey(todayKey, -1);

    const snapshotRead = await fetchSnapshotsForDates([todayKey, yesterdayKey]);
    const overview = buildGrowthOverview(accounts, snapshotRead.rows);
    const hasBaselineSnapshot = snapshotRead.rows.length > 0;

    await recordAllAccountSnapshots(
      accounts.map((account) => ({
        id: account.id,
        followers_count: account.followers_count,
        likes_count: account.likes_count,
        total_views: account.total_views,
        video_count: account.video_count,
      })),
    );

    return NextResponse.json({
      ...overview,
      growthSnapshots: snapshotRead.rows,
      snapshotDays: {
        today: todayKey,
        yesterday: yesterdayKey,
        hasBaselineSnapshot,
      },
      setupHint: !snapshotRead.tableReady
        ? "请在 Supabase 执行 migration：account_daily_snapshots，然后重新 Sync。"
        : !hasBaselineSnapshot
          ? "完成首次 Sync 后，再次 Sync 即可显示较上次同步的增长对比。"
          : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "增长概览加载失败";
    return NextResponse.json(
      {
        metrics: buildGrowthOverview([], []).metrics,
        dateLabel: getSnapshotDateKey(),
        growthSnapshots: [],
        error: message,
      },
      { status: 200 },
    );
  }
}
