import { supabase } from "@/lib/supabase";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

type RecordValue = string | number | null;

function removeMissingColumn<T extends Record<string, RecordValue>>(record: T, message?: string) {
  const column = message?.match(/'([^']+)' column/)?.[1];

  if (!column || !(column in record)) {
    return null;
  }

  const nextRecord = { ...record };
  delete nextRecord[column];
  return nextRecord;
}

async function upsertWithMissingColumnRetry<T extends Record<string, RecordValue>>(
  table: string,
  record: T,
  options: { onConflict: string },
) {
  let currentRecord: Record<string, RecordValue> = record;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .upsert(currentRecord, options)
      .select()
      .single();

    if (!error) {
      return { data, skippedColumns: Object.keys(record).filter((key) => !(key in currentRecord)) };
    }

    const nextRecord = removeMissingColumn(currentRecord, error.message);
    if (!nextRecord) {
      throw new Error(error.message);
    }

    currentRecord = nextRecord;
  }

  throw new Error(`${table} 保存失败：缺失字段过多，请重新执行 migration。`);
}

async function upsertManyWithMissingColumnRetry<T extends Record<string, RecordValue>>(
  table: string,
  records: T[],
  options: { onConflict: string },
) {
  if (!records.length) {
    return { skippedColumns: [] };
  }

  const originalColumns = Object.keys(records[0]);
  let currentRecords: Array<Record<string, RecordValue>> = records;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from(table).upsert(currentRecords, options);

    if (!error) {
      return {
        skippedColumns: originalColumns.filter((key) => !(key in currentRecords[0])),
      };
    }

    const column = error.message.match(/'([^']+)' column/)?.[1];
    if (!column || !(column in currentRecords[0])) {
      throw new Error(error.message);
    }

    currentRecords = currentRecords.map((record) => {
      const nextRecord = { ...record };
      delete nextRecord[column];
      return nextRecord;
    });
  }

  throw new Error(`${table} 保存失败：缺失字段过多，请重新执行 migration。`);
}

export async function assertTikTokTablesReady() {
  const [accountsCheck, videosCheck] = await Promise.all([
    supabase.from("accounts").select("id").limit(1),
    supabase.from("videos").select("id").limit(1),
  ]);

  if (accountsCheck.error || videosCheck.error) {
    throw new Error(
      accountsCheck.error?.message ??
        videosCheck.error?.message ??
        "Supabase 表不存在，请先执行 migration 建表。",
    );
  }
}

async function getExistingVideoIdSet(accountId: string) {
  const { data, error } = await supabase
    .from("videos")
    .select("tiktok_video_id")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.tiktok_video_id).filter(Boolean) as string[]);
}

async function recalculateAccountTotals(accountId: string) {
  const { data: videos, error } = await supabase
    .from("videos")
    .select("views_count, likes_count, comments_count, shares_count")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = videos ?? [];
  const totalViews = rows.reduce((sum, row) => sum + (row.views_count ?? 0), 0);
  const totalLikes = rows.reduce((sum, row) => sum + (row.likes_count ?? 0), 0);
  const totalComments = rows.reduce((sum, row) => sum + (row.comments_count ?? 0), 0);
  const totalShares = rows.reduce((sum, row) => sum + (row.shares_count ?? 0), 0);
  const engagementRate =
    totalViews > 0
      ? Number((((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(2))
      : 0;

  await supabase
    .from("accounts")
    .update({
      total_views: totalViews,
      engagement_rate: engagementRate,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  return { totalViews, engagementRate };
}

export async function saveTikTokProfile(profile: NormalizedTikTokProfile) {
  const accountResult = await upsertWithMissingColumnRetry(
    "accounts",
    {
      tiktok_user_id: profile.tiktokUserId,
      handle: profile.handle,
      display_name: profile.displayName,
      profile_url: profile.profileUrl,
      avatar_url: profile.avatarUrl,
      followers_count: profile.followersCount,
      likes_count: profile.likesCount,
      video_count: profile.videoCount,
      total_views: profile.totalViews,
      engagement_rate: profile.engagementRate,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "handle" },
  );

  const account = accountResult.data;

  if (!account) {
    throw new Error("账号保存失败，请确认 Supabase 表已创建。");
  }

  const existingIds = await getExistingVideoIdSet(account.id);

  let videosInserted = 0;
  let videosUpdated = 0;

  const videos = profile.videos.map((video) => {
    if (existingIds.has(video.tiktokVideoId)) {
      videosUpdated += 1;
    } else {
      videosInserted += 1;
    }

    return {
      account_id: account.id,
      tiktok_video_id: video.tiktokVideoId,
      title: video.title,
      video_url: video.videoUrl,
      thumbnail_url: video.thumbnailUrl,
      views_count: video.viewsCount,
      likes_count: video.likesCount,
      comments_count: video.commentsCount,
      shares_count: video.sharesCount,
      posted_at: video.postedAt,
    };
  });

  if (videos.length) {
    await upsertManyWithMissingColumnRetry("videos", videos, {
      onConflict: "account_id,tiktok_video_id",
    });
  }

  await recalculateAccountTotals(account.id);

  const { data: refreshedAccount } = await supabase.from("accounts").select("*").eq("id", account.id).single();

  return {
    account: refreshedAccount ?? account,
    skippedColumns: accountResult.skippedColumns,
    videosProcessed: profile.videos.length,
    videosInserted,
    videosUpdated,
    videosCount: profile.videos.length,
  };
}
