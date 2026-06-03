"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CirclePlay,
  Clock3,
  CloudDownload,
  Eye,
  MessageCircle,
  Share2,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";
import { GrowthOverview } from "@/components/dashboard/growth-overview";
import { LatestVideosFeed } from "@/components/dashboard/latest-videos-feed";
import {
  SyncRunnerProgress,
  type SyncRunnerPhase,
} from "@/components/dashboard/sync-runner-progress";
import { formatBeijingTime } from "@/lib/format-beijing-time";
import type { ApiAccount, ApiVideo } from "@/lib/accounts";
import type { AccountSnapshotRow } from "@/lib/account-snapshots";

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
      const response = await fetch("/api/accounts", { cache: "no-store" });
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

  const totals = useMemo(() => {
    let totalFollowers = 0;
    let totalLikes = 0;
    let totalViews = 0;
    let totalVideos = 0;
    let interactionSum = 0;

    for (const account of apiAccounts) {
      totalFollowers += account.followers_count ?? 0;
      totalLikes += account.likes_count ?? 0;
      totalViews += account.total_views ?? 0;

      for (const video of account.videos ?? []) {
        totalVideos += 1;
        const views = video.views_count ?? 0;
        const likes = video.likes_count ?? 0;
        const comments = video.comments_count ?? 0;
        const shares = video.shares_count ?? 0;
        if (views > 0) {
          interactionSum += ((likes + comments + shares) / views) * 100;
        }
      }
    }

    return {
      followers: formatCompact(totalFollowers),
      likes: formatCompact(totalLikes),
      views: formatCompact(totalViews),
      videos: String(totalVideos),
      avgInteraction: totalVideos > 0 ? `${(interactionSum / totalVideos).toFixed(2)}%` : "0%",
      accountCount: apiAccounts.length,
    };
  }, [apiAccounts]);

  return (
    <>
      <header className="relative overflow-visible rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
            <Activity className="size-4" />
            Dashboard
          </div>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <div className="w-fit">
              <h1 className="text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">TikTok 数据追踪后台</h1>
              <div className="relative mt-1.5 h-9 w-full">
                {syncUiVisible && syncProgress ? (
                  <SyncRunnerProgress phase={syncPhase} percent={syncPercent} />
                ) : null}
              </div>
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

      <div className="grid gap-4 py-5 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "总粉丝数",
            value: totals.followers,
            icon: Users,
            accent: "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)] to-transparent",
          },
          {
            label: "总点赞量",
            value: totals.likes,
            icon: ThumbsUp,
            accent: "from-[color-mix(in_srgb,var(--space-cadet)_14%,transparent)] to-transparent",
          },
          {
            label: "总播放量",
            value: totals.views,
            icon: Eye,
            accent: "from-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] to-transparent",
          },
          {
            label: "总视频数",
            value: String(totals.videos),
            icon: CirclePlay,
            accent: "from-[color-mix(in_srgb,var(--jet)_12%,transparent)] to-transparent",
          },
          {
            label: "平均互动率",
            value: totals.avgInteraction,
            icon: TrendingUp,
            accent: "from-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)] to-transparent",
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:shadow-md"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${metric.accent}`} />
            <div className="relative flex items-center justify-between">
              <p className="text-sm text-[var(--cadet-gray)]">{metric.label}</p>
              <metric.icon className="size-5 text-[var(--space-cadet)]" />
            </div>
            <p className="relative mt-4 text-3xl font-semibold text-[var(--space-cadet)]">{metric.value}</p>
            <p className="relative mt-2 text-xs text-[var(--carolina-blue)]">
              {totals.accountCount} 个账号合计
            </p>
          </article>
        ))}
      </div>

      <GrowthOverview
        apiAccounts={apiAccounts}
        growthSnapshots={growthSnapshots}
        setupHint={growthSetupHint}
        isLoading={isLoading}
      />

      <LatestVideosFeed apiAccounts={apiAccounts} isLoading={isLoading} />

    </>
  );
}

