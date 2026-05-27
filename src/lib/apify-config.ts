/** Max videos requested from Apify per account sync (controls cost). */
export const APIFY_MAX_VIDEOS_PER_SYNC = 20;

import { resolveSyncIntervalMinutes } from "@/lib/app-settings";

/** Skip new Apify runs if account was synced within this window (minutes). */
export function getSyncCacheTtlMsFromMinutes(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 6 * 60 * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

export function getSyncCacheTtlMs() {
  const minutes = Number(process.env.APIFY_SYNC_CACHE_MINUTES ?? 360);
  return getSyncCacheTtlMsFromMinutes(minutes);
}

export async function getSyncCacheTtlMsAsync() {
  const minutes = await resolveSyncIntervalMinutes();
  return getSyncCacheTtlMsFromMinutes(minutes);
}

export async function shouldUseSyncCacheAsync(
  lastSyncedAt: string | null | undefined,
  force = false,
) {
  if (force || !lastSyncedAt) {
    return false;
  }

  const syncedTime = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(syncedTime)) {
    return false;
  }

  const ttlMs = await getSyncCacheTtlMsAsync();
  return Date.now() - syncedTime < ttlMs;
}

export function shouldUseSyncCache(lastSyncedAt: string | null | undefined, force = false) {
  if (force || !lastSyncedAt) {
    return false;
  }

  const syncedTime = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(syncedTime)) {
    return false;
  }

  return Date.now() - syncedTime < getSyncCacheTtlMs();
}

export async function formatCacheTtlLabelAsync() {
  const minutes = await resolveSyncIntervalMinutes();
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} 小时`;
  }
  return `${minutes} 分钟`;
}

export function formatCacheTtlLabel() {
  const minutes = Math.round(getSyncCacheTtlMs() / 60000);
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} 小时`;
  }
  return `${minutes} 分钟`;
}
