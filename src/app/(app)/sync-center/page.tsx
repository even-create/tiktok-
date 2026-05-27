"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudDownload,
  History,
  Loader2,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { initialsFromName } from "@/lib/accounts";
import {
  AUTO_SYNC_INTERVAL_STORAGE_KEY,
  AUTO_SYNC_STORAGE_KEY,
  DEFAULT_AUTO_SYNC_INTERVAL_MINUTES,
  formatDurationMs,
  type AccountSyncRow,
  type ApiUsageStatus,
} from "@/lib/sync-center";
import type { SyncLogEntry } from "@/lib/sync-logs";

type SyncCenterPayload = {
  accounts?: AccountSyncRow[];
  syncLogs?: SyncLogEntry[];
  errorLogs?: SyncLogEntry[];
  usage?: ApiUsageStatus;
  error?: string;
};

function statusBadge(status: AccountSyncRow["syncStatus"] | "syncing") {
  switch (status) {
    case "synced":
      return {
        label: "已同步",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    case "stale":
      return {
        label: "待更新",
        className: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Clock3,
      };
    case "syncing":
      return {
        label: "同步中",
        className: "bg-[color-mix(in_srgb,var(--carolina-blue)_15%,white)] text-[var(--space-cadet)] border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)]",
        icon: Loader2,
      };
    case "never":
    default:
      return {
        label: "未同步",
        className: "bg-[var(--eggshell)] text-[var(--cadet-gray)] border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]",
        icon: AlertTriangle,
      };
  }
}

function formatLogTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function SyncCenterPage() {
  const [accounts, setAccounts] = useState<AccountSyncRow[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<SyncLogEntry[]>([]);
  const [usage, setUsage] = useState<ApiUsageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingHandle, setSyncingHandle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(DEFAULT_AUTO_SYNC_INTERVAL_MINUTES);
  const [lastBatchDurationMs, setLastBatchDurationMs] = useState<number | null>(null);

  const autoSyncRef = useRef(false);
  autoSyncRef.current = autoSyncEnabled;

  const loadCenter = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/sync-center", { cache: "no-store" });
      const payload = (await response.json()) as SyncCenterPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "读取同步中心失败");
      }

      setAccounts(payload.accounts ?? []);
      setSyncLogs(payload.syncLogs ?? []);
      setErrorLogs(payload.errorLogs ?? []);
      setUsage(payload.usage ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取同步中心失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCenter();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCenter]);

  useEffect(() => {
    const enabled = window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY) === "true";
    const interval = Number(window.localStorage.getItem(AUTO_SYNC_INTERVAL_STORAGE_KEY));
    setAutoSyncEnabled(enabled);
    if (Number.isFinite(interval) && interval > 0) {
      setAutoSyncIntervalMinutes(interval);
    }
  }, []);

  const runSyncAll = useCallback(
    async (options: { force: boolean; syncType: "manual" | "auto" }) => {
      setIsSyncingAll(true);
      setSyncMessage(null);
      setErrorMessage("");

      try {
        const response = await fetch("/api/sync-center", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync-all",
            force: options.force,
            syncType: options.syncType,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          durationMs?: number;
          syncResult?: {
            successCount: number;
            failedCount: number;
            cachedCount: number;
            apifyCalls: number;
            totalVideos: number;
          };
          usage?: ApiUsageStatus;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "同步失败");
        }

        setLastBatchDurationMs(payload.durationMs ?? null);
        setUsage(payload.usage ?? null);

        const result = payload.syncResult;
        if (result) {
          setSyncMessage(
            `同步完成：${result.successCount} 个成功，${result.failedCount} 个失败，${result.cachedCount} 个缓存跳过；Apify ${result.apifyCalls} 次，处理 ${result.totalVideos} 条视频。`,
          );
        }

        await loadCenter();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "同步失败");
        await loadCenter();
      } finally {
        setIsSyncingAll(false);
      }
    },
    [loadCenter],
  );

  const runSyncOne = useCallback(
    async (handle: string, force = false) => {
      setSyncingHandle(handle);
      setErrorMessage("");

      try {
        const response = await fetch("/api/sync-center", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync-one", handle, force, syncType: "single" }),
        });

        const payload = (await response.json()) as { error?: string; cached?: boolean };

        if (!response.ok) {
          throw new Error(payload.error ?? "同步失败");
        }

        setSyncMessage(payload.cached ? `@${handle} 命中缓存，已跳过 Apify` : `@${handle} 同步成功`);
        await loadCenter();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "同步失败");
        await loadCenter();
      } finally {
        setSyncingHandle(null);
      }
    },
    [loadCenter],
  );

  useEffect(() => {
    if (!autoSyncEnabled) return undefined;

    const intervalMs = autoSyncIntervalMinutes * 60 * 1000;
    const timer = window.setInterval(() => {
      if (!autoSyncRef.current || isSyncingAll) return;
      void runSyncAll({ force: false, syncType: "auto" });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [autoSyncEnabled, autoSyncIntervalMinutes, isSyncingAll, runSyncAll]);

  function toggleAutoSync() {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    window.localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(next));
    window.localStorage.setItem(AUTO_SYNC_INTERVAL_STORAGE_KEY, String(autoSyncIntervalMinutes));
  }

  const displayAccounts = accounts.map((account) => ({
    ...account,
    syncStatus: syncingHandle === account.handle ? ("syncing" as const) : account.syncStatus,
  }));

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <CloudDownload className="size-4" />
              Sync Center
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">同步中心</h1>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              管理全部账号同步状态、Apify 调用与同步日志。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runSyncAll({ force: true, syncType: "manual" })}
              disabled={isSyncingAll || isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--carolina-blue)] px-5 text-sm font-semibold text-[var(--space-cadet)] transition hover:brightness-95 disabled:opacity-60"
            >
              {isSyncingAll ? <Loader2 className="size-4 animate-spin" /> : <CloudDownload className="size-4" />}
              {isSyncingAll ? "同步中..." : "Sync Now"}
            </button>
            <button
              type="button"
              onClick={() => void loadCenter()}
              disabled={isLoading || isSyncingAll}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)] disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--eggshell)]/40 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--space-cadet)]">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={toggleAutoSync}
              className="size-4 rounded border-[var(--cadet-gray)] accent-[var(--space-cadet)]"
            />
            Auto Sync（页面打开时按间隔自动同步）
          </label>
          <span className="text-xs text-[var(--cadet-gray)]">
            间隔 {autoSyncIntervalMinutes} 分钟 · 缓存窗口内跳过 Apify
          </span>
          {lastBatchDurationMs !== null ? (
            <span className="text-xs text-[var(--carolina-blue)]">
              上次批量耗时 {formatDurationMs(lastBatchDurationMs)}
            </span>
          ) : null}
        </div>

        {syncMessage ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {syncMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : usage ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Apify 状态",
              value: usage.apifyConfigured ? "已配置" : "未配置",
              icon: Zap,
            },
            {
              label: "今日 Apify 调用",
              value: String(usage.apifyCallsToday),
              icon: CloudDownload,
            },
            {
              label: "每次最多视频",
              value: `${usage.apifyMaxVideosPerSync} 条`,
              icon: Timer,
            },
            {
              label: "缓存窗口",
              value: usage.cacheTtlLabel,
              icon: History,
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--cadet-gray)]">{item.label}</p>
                <item.icon className="size-5 text-[var(--space-cadet)]" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-[var(--space-cadet)]">{item.value}</p>
            </article>
          ))}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
          <h2 className="text-base font-semibold">账号同步状态</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{accounts.length} 个账号</span>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] bg-[var(--eggshell)]/30"
              />
            ))}
          </div>
        ) : displayAccounts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-xs uppercase tracking-[0.16em] text-[var(--cadet-gray)]">
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Last Synced</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Videos</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayAccounts.map((account) => {
                  const badge = statusBadge(account.syncStatus);
                  const BadgeIcon = badge.icon;
                  const isRowSyncing = account.syncStatus === "syncing";

                  return (
                    <tr
                      key={account.id}
                      className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] transition last:border-0 hover:bg-[var(--eggshell)]/40"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <AccountAvatar
                            name={account.displayName}
                            avatarUrl={null}
                            initialsText={initialsFromName(account.displayName)}
                            className="size-10"
                          />
                          <div>
                            <p className="text-sm font-medium text-[var(--space-cadet)]">{account.displayName}</p>
                            <p className="text-xs text-[var(--cadet-gray)]">@{account.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--jet)]">{account.lastSyncedLabel}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.className}`}
                        >
                          <BadgeIcon className={`size-3.5 ${isRowSyncing ? "animate-spin" : ""}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--jet)]">{account.videoCount}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void runSyncOne(account.handle, true)}
                          disabled={isSyncingAll || isRowSyncing}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)] disabled:opacity-60"
                        >
                          {isRowSyncing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          同步
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-[var(--cadet-gray)]">暂无追踪账号</p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--space-cadet)]">
            <History className="size-4 text-[var(--carolina-blue)]" />
            同步日志
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {syncLogs.length ? (
              syncLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/30 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--space-cadet)]">
                      {log.accountHandle ? `@${log.accountHandle}` : "批量同步"}
                    </p>
                    <span className="text-[10px] text-[var(--cadet-gray)]">{formatLogTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--jet)]">{log.message}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[var(--cadet-gray)]">
                    <span className="rounded-full bg-[var(--card)] px-2 py-0.5">{log.status}</span>
                    <span>耗时 {formatDurationMs(log.durationMs)}</span>
                    {log.apifyCalls > 0 ? <span>Apify {log.apifyCalls}</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--cadet-gray)]">暂无同步日志（执行同步后会记录）</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--space-cadet)]">
            <AlertTriangle className="size-4 text-rose-500" />
            错误日志
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {errorLogs.length ? (
              errorLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-rose-800">
                      {log.accountHandle ? `@${log.accountHandle}` : "系统"}
                    </p>
                    <span className="text-[10px] text-rose-600">{formatLogTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-700">{log.errorDetail ?? log.message}</p>
                  <p className="mt-2 text-[10px] text-rose-600">耗时 {formatDurationMs(log.durationMs)}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--cadet-gray)]">暂无错误记录</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
