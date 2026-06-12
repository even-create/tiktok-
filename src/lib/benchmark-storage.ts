import { supabase } from "@/lib/supabase";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

type RecordValue = string | number | null;

function removeMissingColumn<T extends Record<string, RecordValue>>(record: T, message?: string) {
  const column = message?.match(/'([^']+)' column/)?.[1];
  if (!column || !(column in record)) return null;
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
    const { data, error } = await supabase.from(table).upsert(currentRecord, options).select().single();
    if (!error) return { data };
    const nextRecord = removeMissingColumn(currentRecord, error.message);
    if (!nextRecord) throw new Error(error.message);
    currentRecord = nextRecord;
  }

  throw new Error(`${table} 保存失败：缺失字段过多，请重新执行 migration。`);
}

async function upsertManyWithMissingColumnRetry<T extends Record<string, RecordValue>>(
  table: string,
  records: T[],
  options: { onConflict: string },
) {
  if (!records.length) return;

  let currentRecords: Array<Record<string, RecordValue>> = records;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from(table).upsert(currentRecords, options);
    if (!error) return;
    const column = error.message.match(/'([^']+)' column/)?.[1];
    if (!column || !(column in currentRecords[0])) throw new Error(error.message);
    currentRecords = currentRecords.map((record) => {
      const nextRecord = { ...record };
      delete nextRecord[column];
      return nextRecord;
    });
  }

  throw new Error(`${table} 保存失败：缺失字段过多，请重新执行 migration。`);
}

export async function assertBenchmarkTablesReady() {
  const [accountsCheck, videosCheck] = await Promise.all([
    supabase.from("benchmark_accounts").select("id").limit(1),
    supabase.from("benchmark_videos").select("id").limit(1),
  ]);

  if (accountsCheck.error || videosCheck.error) {
    throw new Error(
      accountsCheck.error?.message ??
        videosCheck.error?.message ??
        "benchmark 表不存在，请先执行 migration：20260612160000_create_benchmark_accounts.sql",
    );
  }
}

async function getExistingVideoIdSet(accountId: string) {
  const { data, error } = await supabase
    .from("benchmark_videos")
    .select("tiktok_video_id")
    .eq("account_id", accountId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.tiktok_video_id).filter(Boolean) as string[]);
}

async function recalculateBenchmarkTotals(accountId: string) {
  const { data: videos, error } = await supabase
    .from("benchmark_videos")
    .select("views_count, likes_count, comments_count, shares_count")
    .eq("account_id", accountId);

  if (error) throw new Error(error.message);

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
    .from("benchmark_accounts")
    .update({
      total_views: totalViews,
      engagement_rate: engagementRate,
      video_count: rows.length,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", accountId);
}

export async function saveBenchmarkProfile(profile: NormalizedTikTokProfile, ownerId: string) {
  const { data: existingAccount } = await supabase
    .from("benchmark_accounts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("platform", profile.platform)
    .eq("handle", profile.handle)
    .maybeSingle();

  const accountRecord: Record<string, RecordValue> = {
    owner_id: ownerId,
    platform: profile.platform,
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
  };

  let accountId = existingAccount?.id as string | undefined;

  if (accountId) {
    const { error } = await supabase.from("benchmark_accounts").update(accountRecord).eq("id", accountId);
    if (error) throw new Error(error.message);
  } else {
    const accountResult = await upsertWithMissingColumnRetry("benchmark_accounts", accountRecord, {
      onConflict: "owner_id,platform,handle",
    });
    accountId = accountResult.data?.id as string | undefined;
  }

  if (!accountId) {
    throw new Error("对标账号保存失败，请确认 Supabase benchmark 表已创建。");
  }

  const existingIds = await getExistingVideoIdSet(accountId);

  const videos = profile.videos.map((video) => ({
    account_id: accountId,
    tiktok_video_id: video.tiktokVideoId,
    title: video.title,
    video_url: video.videoUrl,
    thumbnail_url: video.thumbnailUrl,
    views_count: video.viewsCount,
    likes_count: video.likesCount,
    comments_count: video.commentsCount,
    shares_count: video.sharesCount,
    collects_count: video.collectsCount,
    posted_at: video.postedAt,
  }));

  if (videos.length) {
    await upsertManyWithMissingColumnRetry("benchmark_videos", videos, {
      onConflict: "account_id,tiktok_video_id",
    });
  }

  await recalculateBenchmarkTotals(accountId);

  const { data: refreshedAccount } = await supabase
    .from("benchmark_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  return {
    account: refreshedAccount,
    videosProcessed: profile.videos.length,
    videosInserted: profile.videos.filter((v) => !existingIds.has(v.tiktokVideoId)).length,
    videosUpdated: profile.videos.filter((v) => existingIds.has(v.tiktokVideoId)).length,
  };
}

export async function deleteBenchmarkAccountById(id: string, ownerId: string) {
  const { data, error, count } = await supabase
    .from("benchmark_accounts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (error) throw new Error(error.message);
  return { deleted: count ?? 0, data };
}
