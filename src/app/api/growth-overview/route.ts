import { NextResponse } from "next/server";
import { fetchSnapshotsForDates, groupSnapshotsByDate, recordAllAccountSnapshots } from "@/lib/account-snapshots";
import { buildGrowthOverview } from "@/lib/growth-overview";
import { addDaysToDateKey, getSnapshotDateKey } from "@/lib/snapshot-date";
import { applyAccountListScope } from "@/lib/workspace/account-access";
import { requireAuth } from "@/lib/workspace/require-auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireAuth(request, "analytics:read:own");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    let query = supabase
      .from("accounts")
      .select("*, videos(id, views_count, likes_count, posted_at)")
      .order("created_at", { ascending: false });

    query = applyAccountListScope(query, auth.user);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const accounts = data ?? [];
    const todayKey = getSnapshotDateKey();
    const yesterdayKey = addDaysToDateKey(todayKey, -1);
    const dayBeforeKey = addDaysToDateKey(todayKey, -2);

    await recordAllAccountSnapshots(
      accounts.map((account) => ({
        id: account.id,
        followers_count: account.followers_count,
        likes_count: account.likes_count,
        total_views: account.total_views,
        video_count: account.video_count,
      })),
    );

    const snapshotRead = await fetchSnapshotsForDates([yesterdayKey, dayBeforeKey]);
    const overview = buildGrowthOverview(accounts, snapshotRead.rows);
    const hasYesterday = (groupSnapshotsByDate(snapshotRead.rows).get(yesterdayKey)?.length ?? 0) > 0;

    return NextResponse.json({
      ...overview,
      growthSnapshots: snapshotRead.rows,
      snapshotDays: {
        today: todayKey,
        yesterday: yesterdayKey,
        hasYesterday,
      },
      setupHint: !snapshotRead.tableReady
        ? "请在 Supabase 执行 migration：account_daily_snapshots，然后重新 Sync。"
        : !hasYesterday
          ? "已记录今日快照。明天 Sync 后可显示粉丝/播放/点赞的日增长对比。"
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
