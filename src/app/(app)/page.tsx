"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  CloudDownload,
} from "lucide-react";
import { DashboardMetricsGrid } from "@/components/dashboard/dashboard-metrics-grid";
import { GrowthOverview } from "@/components/dashboard/growth-overview";
import {
  DashboardViewModeToggle,
} from "@/components/dashboard/dashboard-view-mode-toggle";
import type { DashboardViewMode } from "@/lib/dashboard-totals";
import { LatestVideosFeed } from "@/components/dashboard/latest-videos-feed";
import {
  SyncRunnerProgress,
  type SyncRunnerPhase,
} from "@/components/dashboard/sync-runner-progress";
import { useSessionUser } from "@/hooks/use-session-user";
import { formatBeijingTime } from "@/lib/format-beijing-time";
import type { ApiAccount, ApiVideo } from "@/lib/accounts";
import type { AccountSnapshotRow } from "@/lib/account-snapshots";
import { computeDashboardTotals, resolveDashboardAccounts } from "@/lib/dashboard-totals";

type VideoItem = {
  id: string;
  title: string;
  videoUrl: string | null;
  views: string;
  viewsCount: number;
  likes: string;
  likesCount: number;
  comments: string;
  shares: string;
  interactionRate: string;
  interactionRateValue: number;
  postedAt: string;
  retention: string;
  sortOrder: number;
};

type Account = {
  id: string;
  handle: string;
  displayName: string;
  profileUrl: string;
  avatar: string;
  avatarUrl: string | null;
  followersCount: number;
  lastSyncedAt: string | null;
  followers: string;
  likes: string;
  views: string;
  engagement: string;
  trend: string;
  sortOrder: number;
  videos: VideoItem[];
};

type VideoSortMode = "default" | "views" | "likes" | "interaction";

const trackedAccounts: Account[] = [
  {
    id: "demo-1",
    handle: "growth.lab",
    displayName: "Growth Lab",
    profileUrl: "https://www.tiktok.com/@growth.lab",
    avatar: "GL",
    avatarUrl: null,
    followersCount: 248000,
    lastSyncedAt: null,
    followers: "248K",
    likes: "1.4M",
    views: "8.9M",
    engagement: "7.9%",
    trend: "Live",
    sortOrder: 0,
    videos: [
      {
        id: "1",
        title: "How to build a better content engine",
        videoUrl: "https://www.tiktok.com/@growth.lab/video/1",
        views: "2.4M",
        viewsCount: 2400000,
        likes: "184K",
        likesCount: 184000,
        comments: "6.1K",
        shares: "17.4K",
        interactionRate: "8.66%",
        interactionRateValue: 8.66,
        postedAt: "May 22, 14:08",
        retention: "62%",
        sortOrder: 0,
      },
      {
        id: "2",
        title: "Metrics that actually matter",
        videoUrl: "https://www.tiktok.com/@growth.lab/video/2",
        views: "1.2M",
        viewsCount: 1200000,
        likes: "96K",
        likesCount: 96000,
        comments: "5.6K",
        shares: "11.2K",
        interactionRate: "9.40%",
        interactionRateValue: 9.4,
        postedAt: "May 25, 09:40",
        retention: "61%",
        sortOrder: 1,
      },
      {
        id: "3",
        title: "The analytics tab most creators ignore",
        videoUrl: "https://www.tiktok.com/@growth.lab/video/3",
        views: "744K",
        viewsCount: 744000,
        likes: "48K",
        likesCount: 48000,
        comments: "2.1K",
        shares: "5.9K",
        interactionRate: "7.53%",
        interactionRateValue: 7.53,
        postedAt: "May 20, 18:12",
        retention: "55%",
        sortOrder: 2,
      },
    ],
  },
];

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function pickLatestSyncTime(accountList: Account[]) {
  let latest = 0;
  for (const account of accountList) {
    if (!account.lastSyncedAt) continue;
    const time = new Date(account.lastSyncedAt).getTime();
    if (time > latest) latest = time;
  }
  return latest ? new Date(latest) : null;
}

function tiktokProfileUrl(handle: string, profileUrl?: string | null) {
  const clean = profileUrl?.trim();
  if (clean) return clean;
  return `https://www.tiktok.com/@${handle}`;
}

function initials(value: string) {
  return (
    value
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "TT"
  );
}

function calcInteractionRate(likes: number, comments: number, shares: number, views: number) {
  if (views <= 0) return { label: "0%", value: 0 };
  const value = ((likes + comments + shares) / views) * 100;
  return { label: `${value.toFixed(2)}%`, value };
}

function mapApiVideo(video: ApiVideo, sortOrder: number): VideoItem {
  const viewsCount = video.views_count ?? 0;
  const likesCount = video.likes_count ?? 0;
  const commentsCount = video.comments_count ?? 0;
  const sharesCount = video.shares_count ?? 0;
  const interaction = calcInteractionRate(likesCount, commentsCount, sharesCount, viewsCount);

  return {
    id: video.id,
    title: video.title,
    videoUrl: video.video_url,
    views: formatCompact(viewsCount),
    viewsCount,
    likes: formatCompact(likesCount),
    likesCount,
    comments: formatCompact(commentsCount),
    shares: formatCompact(sharesCount),
    interactionRate: interaction.label,
    interactionRateValue: interaction.value,
    postedAt: formatBeijingTime(video.posted_at, "Unknown"),
    retention: video.retention_rate ? `${video.retention_rate}%` : "N/A",
    sortOrder,
  };
}

function sortVideos(list: VideoItem[], mode: VideoSortMode) {
  const next = [...list];
  switch (mode) {
    case "views":
      return next.sort((left, right) => right.viewsCount - left.viewsCount);
    case "likes":
      return next.sort((left, right) => right.likesCount - left.likesCount);
    case "interaction":
      return next.sort((left, right) => right.interactionRateValue - left.interactionRateValue);
    default:
      return next.sort((left, right) => left.sortOrder - right.sortOrder);
  }
}

function mapApiAccount(account: ApiAccount, sortOrder: number): Account {
  const displayName = account.display_name || account.handle;

  return {
    id: account.id,
    handle: account.handle,
    displayName,
    profileUrl: tiktokProfileUrl(account.handle, account.profile_url),
    avatar: initials(displayName),
    avatarUrl: account.avatar_url,
    followersCount: account.followers_count ?? 0,
    lastSyncedAt: account.last_synced_at,
    sortOrder,
    followers: formatCompact(account.followers_count ?? 0),
    likes: formatCompact(account.likes_count ?? 0),
    views: formatCompact(account.total_views ?? 0),
    engagement: `${Number(account.engagement_rate ?? 0).toFixed(1)}%`,
    trend: account.last_synced_at ? "Live" : "New",
    videos: (account.videos ?? []).map((video, index) => mapApiVideo(video, index)),
  };
}

export default function DashboardPage() {
  const user = useSessionUser();
  const [viewMode, setViewMode] = useState<DashboardViewMode>("team");
  const [accounts, setAccounts] = useState<Account[]>(trackedAccounts);
  const [apiAccounts, setApiAccounts] = useState<ApiAccount[]>([]);
  const [selectedHandle, setSelectedHandle] = useState(trackedAccounts[0].handle);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncPercent, setSyncPercent] = useState(0);
  const [syncPhase, setSyncPhase] = useState<SyncRunnerPhase>("running");
  const [syncUiVisible, setSyncUiVisible] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; handle: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [growthSnapshots, setGrowthSnapshots] = useState<AccountSnapshotRow[]>([]);
  const [growthSetupHint, setGrowthSetupHint] = useState<string | null>(null);

  const loadAccounts = useCallback(async (preferredHandle?: string) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts?statsScope=team", { cache: "no-store" });
      const payload = (await response.json()) as {
        accounts?: ApiAccount[];
        growthSnapshots?: AccountSnapshotRow[];
        growthMeta?: { setupHint?: string | null };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取 Supabase 数据失败");
      }

      const rawAccounts = payload.accounts ?? [];
      setApiAccounts(rawAccounts);
      setGrowthSnapshots(payload.growthSnapshots ?? []);
      setGrowthSetupHint(payload.growthMeta?.setupHint ?? null);
      const nextAccounts = rawAccounts.map((account, index) => mapApiAccount(account, index));

      if (nextAccounts.length) {
        setAccounts(nextAccounts);
        setLastSyncedAt(pickLatestSyncTime(nextAccounts));
        setSelectedHandle((current) => {
          if (preferredHandle && nextAccounts.some((account) => account.handle === preferredHandle)) {
            return preferredHandle;
          }
          if (nextAccounts.some((account) => account.handle === current)) {
            return current;
          }
          return nextAccounts[0].handle;
        });
      } else {
        setAccounts(trackedAccounts);
        setSelectedHandle(trackedAccounts[0].handle);
      }
    } catch (error) {
      setAccounts(trackedAccounts);
      setSelectedHandle(trackedAccounts[0].handle);
      setErrorMessage(error instanceof Error ? error.message : "连接 Supabase 失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  useEffect(() => {
    if (!isSyncingAll) {
      return;
    }

    const interval = window.setInterval(() => {
      setSyncPercent((current) => (current >= 88 ? current : current + 1.2));
    }, 180);

    return () => window.clearInterval(interval);
  }, [isSyncingAll]);

  async function handleSyncAll() {
    if (isSyncingAll) return;

    setErrorMessage("");
    setSyncSuccessMessage(null);
    setIsSyncingAll(true);
    setSyncUiVisible(true);
    setSyncPhase("running");
    setSyncPercent(0);
    setSyncProgress({
      current: 0,
      total: Math.max(apiAccounts.length, 1),
      handle: "全部账号",
    });
    try {
      const response = await fetch("/api/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const payload = (await response.json()) as {
        successCount?: number;
        cachedCount?: number;
        apifyCalls?: number;
        totalVideos?: number;
        results?: Array<{ handle: string; ok: boolean; error?: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "批量同步失败");
      }

      const failedHandles = (payload.results ?? []).filter((item) => !item.ok).map((item) => item.handle);
      const syncedAt = new Date();
      setLastSyncedAt(syncedAt);
      setSyncPercent(100);
      setSyncPhase("complete");
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      setSyncUiVisible(false);
      setSyncProgress(null);
      setSyncPercent(0);
      setSyncPhase("running");
      await loadAccounts(selectedHandle);

      const apifyNote = typeof payload.apifyCalls === "number" ? `，TikHub 调用 ${payload.apifyCalls} 次` : "";
      const cacheNote = payload.cachedCount && payload.cachedCount > 0 ? `（${payload.cachedCount} 个命中缓存）` : "";

      if (failedHandles.length === 0) {
        setSyncSuccessMessage(
          `同步成功：${payload.successCount ?? 0} 个账号，处理 ${payload.totalVideos ?? 0} 条视频${apifyNote}${cacheNote}。`,
        );
      } else {
        setSyncSuccessMessage(`部分完成：${payload.successCount ?? 0} 个成功，${failedHandles.length} 个失败${apifyNote}。`);
        setErrorMessage(`以下账号同步失败：${failedHandles.map((h) => `@${h}`).join("、")}`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "批量同步失败");
      setSyncUiVisible(false);
      setSyncProgress(null);
      setSyncPercent(0);
      setSyncPhase("running");
    } finally {
      setIsSyncingAll(false);
    }
  }

  const isBusy = isLoading || isSyncingAll;

  const activeAccounts = useMemo(() => {
    if (!user?.id) return apiAccounts;
    return resolveDashboardAccounts(apiAccounts, viewMode, user.id);
  }, [apiAccounts, viewMode, user?.id]);

  const displayTotals = useMemo(() => computeDashboardTotals(activeAccounts), [activeAccounts]);

  const metricsLabelPrefix = viewMode === "team" ? "团队" : "";

  return (
    <>
      <header className="relative overflow-visible rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
            <Activity className="size-4" />
            Dashboard
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="relative w-fit">
              <h1 className="text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">社媒账号数据追踪平台</h1>
              {syncUiVisible && syncProgress ? (
                <div className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 h-9 w-full">
                  <SyncRunnerProgress phase={syncPhase} percent={syncPercent} />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void handleSyncAll()}
              disabled={isBusy}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--carolina-blue)] px-4 text-sm font-semibold text-[var(--space-cadet)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncingAll ? <Clock3 className="size-4 animate-spin" /> : <CloudDownload className="size-4" />}
              {isSyncingAll ? "Syncing..." : "Sync Now"}
            </button>
            <DashboardViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="text-xs text-[var(--cadet-gray)]">
              Last synced at:{" "}
              <span className="font-medium text-[var(--space-cadet)]">
                {lastSyncedAt ? formatBeijingTime(lastSyncedAt) : "—"}
              </span>
            </p>
          </div>

          {syncSuccessMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {syncSuccessMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </header>

      <div className="py-5">
        <DashboardMetricsGrid totals={displayTotals} labelPrefix={metricsLabelPrefix} />
      </div>

      <GrowthOverview
        teamAccounts={apiAccounts}
        growthSnapshots={growthSnapshots}
        viewMode={viewMode}
        ownerId={user?.id ?? "admin"}
        setupHint={growthSetupHint}
        isLoading={isLoading}
      />

      <LatestVideosFeed apiAccounts={apiAccounts} isLoading={isLoading} />

    </>
  );
}

