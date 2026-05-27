import { supabase } from "@/lib/supabase";
import type { NormalizedTikTokProfile } from "@/lib/apify-tiktok";

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

export async function saveTikTokProfile(profile: NormalizedTikTokProfile) {
  const accountResult = await upsertWithMissingColumnRetry(
    "accounts",
    {
      tiktok_user_id: profile.tiktokUserId,
      handle: profile.handle,
      display_name: profile.displayName,
      profile_url: profile.profileUrl,
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

  const videos = profile.videos.map((video) => ({
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
  }));

  const videosResult = await upsertManyWithMissingColumnRetry(
    "videos",
    videos,
    { onConflict: "account_id,tiktok_video_id" },
  );

  return {
    account,
    skippedColumns: [...accountResult.skippedColumns, ...videosResult.skippedColumns],
    videosCount: videos.length,
  };
}
