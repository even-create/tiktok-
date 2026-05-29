import { isGeminiConfigured } from "@/lib/gemini-insights";
import { isTikHubConfigured } from "@/lib/app-settings";
import {
  formatCacheTtlLabel,
  getSyncCacheTtlMs,
  MAX_VIDEOS_PER_SYNC,
  shouldUseSyncCache,
} from "@/lib/sync-config";
import type { AccountRow } from "@/lib/tiktok-data";
import type { SyncAccountResult } from "@/lib/sync-all-accounts";
import { insertSyncLog } from "@/lib/sync-logs";

export type AccountSyncStatus = "never" | "synced" | "stale" | "syncing";

export type AccountSyncRow = {
  id: string;
  handle: string;
  displayName: string;
  profileUrl: string;
  lastSyncedAt: string | null;
  lastSyncedLabel: string;
  syncStatus: AccountSyncStatus;
  videoCount: number;
};

export type ApiUsageStatus = {
  tikhubConfigured: boolean;
  /** @deprecated Use tikhubConfigured — kept for older clients */
  apifyConfigured: boolean;
  apifyMaxVideosPerSync: number;
  cacheTtlLabel: string;
  cacheTtlMinutes: number;
  apifyCallsToday: number;
  geminiConfigured: boolean;
};

function formatLastSynced(value: string | null) {
  if (!value) return "从未同步";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "从未同步";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getAccountSyncStatus(lastSyncedAt: string | null): AccountSyncStatus {
  if (!lastSyncedAt) return "never";
  if (shouldUseSyncCache(lastSyncedAt, false)) return "synced";
  return "stale";
}

export function mapAccountSyncRow(account: AccountRow & { videos?: { id: string }[] }): AccountSyncRow {
  return {
    id: account.id,
    handle: account.handle,
    displayName: account.display_name?.trim() || account.handle,
    profileUrl: account.profile_url,
    lastSyncedAt: account.last_synced_at,
    lastSyncedLabel: formatLastSynced(account.last_synced_at),
    syncStatus: getAccountSyncStatus(account.last_synced_at),
    videoCount: account.video_count ?? account.videos?.length ?? 0,
  };
}

export function formatDurationMs(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainSeconds}s`;
}

export function getStartOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export async function buildApiUsageStatus(providerCallsToday: number): Promise<ApiUsageStatus> {
  const tikhubConfigured = await isTikHubConfigured();

  return {
    tikhubConfigured,
    apifyConfigured: tikhubConfigured,
    apifyMaxVideosPerSync: MAX_VIDEOS_PER_SYNC,
    cacheTtlLabel: formatCacheTtlLabel(),
    cacheTtlMinutes: Math.round(getSyncCacheTtlMs() / 60000),
    apifyCallsToday: providerCallsToday,
    geminiConfigured: await isGeminiConfigured(),
  };
}

export async function persistSyncResults(
  results: SyncAccountResult[],
  syncType: "manual" | "auto" | "single",
) {
  for (const result of results) {
    try {
      if (result.status === "error") {
        await insertSyncLog({
          accountHandle: result.handle,
          syncType,
          status: "error",
          message: "同步失败",
          durationMs: result.durationMs,
          errorDetail: result.error,
        });
      } else if (result.cached) {
        await insertSyncLog({
          accountHandle: result.handle,
          syncType,
          status: "cached",
          message: result.message ?? "命中缓存，跳过 TikHub",
          durationMs: result.durationMs,
          apifyCalls: 0,
          videosProcessed: 0,
        });
      } else {
        await insertSyncLog({
          accountHandle: result.handle,
          syncType,
          status: "success",
          message: `处理 ${result.videosCount ?? 0} 条视频（新增 ${result.videosInserted ?? 0}，更新 ${result.videosUpdated ?? 0}）`,
          durationMs: result.durationMs,
          apifyCalls: result.apifyCalls ?? 1,
          videosProcessed: result.videosCount ?? 0,
        });
      }
    } catch {
      // sync_logs 表未迁移时忽略日志写入
    }
  }
}

export const AUTO_SYNC_STORAGE_KEY = "tiktok-tracker:auto-sync-enabled";
export const AUTO_SYNC_INTERVAL_STORAGE_KEY = "tiktok-tracker:auto-sync-interval-minutes";

export const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES = 30;
