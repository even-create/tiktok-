import { NextResponse } from "next/server";
import { fetchSnapshotsForDates, recordAllAccountSnapshots } from "@/lib/account-snapshots";
import { deleteAccountById } from "@/lib/tiktok-data";
import { addDaysToDateKey, getSnapshotDateKey } from "@/lib/snapshot-date";
import { getCurrentUser } from "@/lib/current-user";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const statsScope = new URL(request.url).searchParams.get("statsScope");

  let query = supabase
    .from("accounts")
    .select("*, videos(*)")
    .order("created_at", { ascending: false })
    .order("posted_at", {
      ascending: false,
      referencedTable: "videos",
      nullsFirst: false,
    });

  // Admin sees every account. Members see own accounts by default, or all accounts
  // when statsScope=team (Dashboard team view — read-only aggregate stats).
  if (user?.role === "MEMBER" && statsScope !== "team") {
    query = query.eq("owner_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = data ?? [];
  const todayKey = getSnapshotDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  const snapshotRead = await fetchSnapshotsForDates([todayKey, yesterdayKey]);
  const hasBaselineSnapshot = snapshotRead.rows.length > 0;

  const snapshotWrite = await recordAllAccountSnapshots(
    accounts.map((account) => ({
      id: account.id,
      followers_count: account.followers_count,
      likes_count: account.likes_count,
      total_views: account.total_views,
      video_count: account.video_count,
    })),
  );

  return NextResponse.json({
    accounts,
    growthSnapshots: snapshotRead.rows,
    growthMeta: {
      today: todayKey,
      yesterday: yesterdayKey,
      tableReady: snapshotRead.tableReady && (accounts.length === 0 || snapshotWrite.recorded > 0),
      hasBaselineSnapshot,
      setupHint: !snapshotRead.tableReady
        ? "请在 Supabase 执行 migration：account_daily_snapshots，然后重新 Sync。"
        : !hasBaselineSnapshot
          ? "完成首次 Sync 后，再次 Sync 即可显示较上次同步的增长对比。"
          : null,
    },
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "请提供要删除的账号 id" }, { status: 400 });
  }

  // Members may only delete accounts they own.
  const user = await getCurrentUser();
  if (user?.role === "MEMBER") {
    const { data: target } = await supabase
      .from("accounts")
      .select("owner_id")
      .eq("id", id)
      .maybeSingle();
    if (!target || (target.owner_id ?? "admin") !== user.id) {
      return NextResponse.json({ error: "未找到该账号" }, { status: 404 });
    }
  }

  const { error, count } = await deleteAccountById(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "未找到该账号" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
}
