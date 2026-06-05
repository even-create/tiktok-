import { NextResponse } from "next/server";
import { fetchSnapshotsForDates, recordAllAccountSnapshots } from "@/lib/account-snapshots";
import { applyAccountListScope, assertAccountWritable } from "@/lib/workspace/account-access";
import { requireAuth } from "@/lib/workspace/require-auth";
import { deleteAccountByHandle } from "@/lib/tiktok-data";
import { addDaysToDateKey, getSnapshotDateKey } from "@/lib/snapshot-date";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireAuth(request, "accounts:read:own");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  let query = supabase
    .from("accounts")
    .select("*, videos(*)")
    .order("created_at", { ascending: false })
    .order("posted_at", {
      ascending: false,
      referencedTable: "videos",
      nullsFirst: false,
    });

  query = applyAccountListScope(query, auth.user);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = data ?? [];
  const todayKey = getSnapshotDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const dayBeforeKey = addDaysToDateKey(todayKey, -2);

  const snapshotWrite = await recordAllAccountSnapshots(
    accounts.map((account) => ({
      id: account.id,
      followers_count: account.followers_count,
      likes_count: account.likes_count,
      total_views: account.total_views,
      video_count: account.video_count,
    })),
  );

  const snapshotRead = await fetchSnapshotsForDates([yesterdayKey, dayBeforeKey]);
  const hasYesterday = snapshotRead.rows.some((row) => row.snapshot_date === yesterdayKey);

  return NextResponse.json({
    accounts,
    growthSnapshots: snapshotRead.rows,
    growthMeta: {
      today: todayKey,
      yesterday: yesterdayKey,
      tableReady: snapshotRead.tableReady && (accounts.length === 0 || snapshotWrite.recorded > 0),
      hasYesterday,
      setupHint: !snapshotRead.tableReady
        ? "请在 Supabase 执行 migration：account_daily_snapshots，然后重新 Sync。"
        : !hasYesterday
          ? "已记录今日快照。明天 Sync 后可显示粉丝/播放/点赞的日增长对比。"
          : null,
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request, "accounts:write:own");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  const handle = new URL(request.url).searchParams.get("handle")?.trim();

  if (!handle) {
    return NextResponse.json({ error: "请提供要删除的账号 handle" }, { status: 400 });
  }

  try {
    await assertAccountWritable(auth.user, handle);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "无权删除该账号" },
      { status: 403 },
    );
  }

  const { error, count } = await deleteAccountByHandle(handle);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "未找到该账号" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, handle });
}
