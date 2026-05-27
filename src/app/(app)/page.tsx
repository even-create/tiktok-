"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  CirclePlay,
  Clock3,
  CloudDownload,
  ExternalLink,
  Eye,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  Share2,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { LineChart } from "@/components/dashboard/line-chart";
import { AccountSortMenu } from "@/components/dashboard/account-sort-menu";
import { VideoSortMenu } from "@/components/dashboard/video-sort-menu";

type ApiVideo = {
  id: string;
  title: string;
  video_url: string | null;
  thumbnail_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  retention_rate: number | null;
  posted_at: string | null;
};

type ApiAccount = {
  id: string;
  handle: string;
  display_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  followers_count: number | null;
  likes_count: number | null;
  total_views: number | null;
  engagement_rate: number | null;
  last_synced_at: string | null;
  videos?: ApiVideo[];
};

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

type AccountSortMode = "default" | "followers" | "updated";
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

function formatPostedAt(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
}

function formatRefreshTime() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

function formatLastSyncedDisplay(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    postedAt: formatPostedAt(video.posted_at),
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

function sortAccounts(list: Account[], mode: AccountSortMode) {
  const next = [...list];
  switch (mode) {
    case "followers":
      return next.sort((left, right) => right.followersCount - left.followersCount);
    case "updated":
      return next.sort((left, right) => {
        const leftTime = left.lastSyncedAt ? new Date(left.lastSyncedAt).getTime() : 0;
        const rightTime = right.lastSyncedAt ? new Date(right.lastSyncedAt).getTime() : 0;
        return rightTime - leftTime;
      });
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
  const [selectedHandle, setSelectedHandle] = useState(trackedAccounts[0].handle);
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingHandle, setDeletingHandle] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("正在连接 Supabase...");
  const [errorMessage, setErrorMessage] = useState("");
  const [accountSort, setAccountSort] = useState<AccountSortMode>("default");
  const [videoSort, setVideoSort] = useState<VideoSortMode>("default");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; handle: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const loadAccounts = useCallback(async (preferredHandle?: string) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const payload = (await response.json()) as { accounts?: ApiAccount[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取 Supabase 数据失败");
      }

      const nextAccounts = (payload.accounts ?? []).map((account, index) => mapApiAccount(account, index));

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
        setStatusMessage(`Supabase 已连接，数据已加载（${formatRefreshTime()}）`);
      } else {
        setAccounts(trackedAccounts);
        setSelectedHandle(trackedAccounts[0].handle);
        setStatusMessage("Supabase 已连接，暂无数据，正在显示示例账号。");
      }
    } catch (error) {
      setAccounts(trackedAccounts);
      setSelectedHandle(trackedAccounts[0].handle);
      setErrorMessage(error instanceof Error ? error.message : "连接 Supabase 失败");
      setStatusMessage("请先在 Supabase SQL Editor 执行 migration 建表。");
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

  async function handleRefreshData() {
    setErrorMessage("");
    setSyncSuccessMessage(null);
    setStatusMessage("正在从 Supabase 刷新数据...");
    await loadAccounts(selectedHandle);
  }

  async function handleSyncAll() {
    if (isSyncingAll || isSyncing) return;

    setErrorMessage("");
    setSyncSuccessMessage(null);
    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: 1, handle: "全部账号" });
    setStatusMessage("正在批量同步（每账号最多 20 条最新视频）...");

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
      setSyncProgress(null);
      await loadAccounts(selectedHandle);

      const apifyNote = typeof payload.apifyCalls === "number" ? `，Apify 调用 ${payload.apifyCalls} 次` : "";
      const cacheNote = payload.cachedCount && payload.cachedCount > 0 ? `（${payload.cachedCount} 个命中缓存）` : "";

      if (failedHandles.length === 0) {
        setSyncSuccessMessage(
          `同步成功：${payload.successCount ?? 0} 个账号，处理 ${payload.totalVideos ?? 0} 条视频${apifyNote}${cacheNote}。`,
        );
        setStatusMessage(`全部账号已同步 · ${formatRefreshTime()}`);
      } else {
        setSyncSuccessMessage(`部分完成：${payload.successCount ?? 0} 个成功，${failedHandles.length} 个失败${apifyNote}。`);
        setErrorMessage(`以下账号同步失败：${failedHandles.map((h) => `@${h}`).join("、")}`);
        setStatusMessage(`同步结束 · ${formatRefreshTime()}`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "批量同步失败");
      setStatusMessage("同步未完成，请检查 Apify Token 与账号链接。");
      setSyncProgress(null);
    } finally {
      setIsSyncingAll(false);
    }
  }

  async function handleAddAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tiktokUrl.trim()) return;

    setIsSyncing(true);
    setErrorMessage("");
    setStatusMessage("正在调用 Apify 抓取账号和视频数据...");

    try {
      const response = await fetch("/api/sync-tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tiktokUrl, force: true }),
      });
      const payload = (await response.json()) as { account?: { handle: string }; videosCount?: number; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Apify 同步失败");
      }

      const syncedHandle = payload.account?.handle;
      setTiktokUrl("");
      setLastSyncedAt(new Date());
      setSyncSuccessMessage(`账号已添加并同步，共 ${payload.videosCount ?? 0} 条视频。`);
      setStatusMessage(`同步完成 · ${formatRefreshTime()}`);
      await loadAccounts(syncedHandle);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Apify 同步失败");
      setStatusMessage("同步未完成，请检查 Apify Token、Supabase 表和账号链接。");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDeleteAccount(handle: string) {
    const confirmed = window.confirm(`确定要停止追踪 @${handle} 吗？相关视频数据也会一并删除。`);
    if (!confirmed) return;

    setDeletingHandle(handle);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts?handle=${encodeURIComponent(handle)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除账号失败");
      }

      setStatusMessage(`已删除 @${handle}。`);
      await loadAccounts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除账号失败");
    } finally {
      setDeletingHandle(null);
    }
  }

  const isBusy = isLoading || isSyncing || isSyncingAll;

  const sortedAccounts = useMemo(() => sortAccounts(accounts, accountSort), [accounts, accountSort]);

  const activeAccount = useMemo(
    () =>
      sortedAccounts.find((account) => account.handle === selectedHandle) ?? sortedAccounts[0] ?? accounts[0] ?? null,
    [accounts, sortedAccounts, selectedHandle],
  );

  const totals = useMemo(() => {
    return {
      followers: activeAccount ? activeAccount.followers : "0",
      likes: activeAccount ? activeAccount.likes : "0",
      views: activeAccount ? activeAccount.views : "0",
      engagement: activeAccount ? activeAccount.engagement : "0%",
      videos: activeAccount?.videos.length ?? 0,
      avgInteraction:
        activeAccount && activeAccount.videos.length > 0
          ? `${(
              activeAccount.videos.reduce((sum, video) => sum + video.interactionRateValue, 0) / activeAccount.videos.length
            ).toFixed(2)}%`
          : "0%",
    };
  }, [activeAccount]);

  const chartPoints = useMemo(() => {
    if (!activeAccount) return [];
    return [...activeAccount.videos]
      .sort((left, right) => right.viewsCount - left.viewsCount)
      .slice(0, 6)
      .reverse()
      .map((video, index) => ({ label: `#${index + 1}`, value: video.viewsCount }));
  }, [activeAccount]);

  const sortedVideos = useMemo(() => {
    if (!activeAccount) return [];
    return sortVideos(activeAccount.videos, videoSort);
  }, [activeAccount, videoSort]);

  return (
    <>
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Activity className="size-4" />
              Dashboard
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">TikTok 数据追踪后台</h1>
          </div>

          <form onSubmit={handleAddAccount} className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-xl">
            <label className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
              <input
                value={tiktokUrl}
                onChange={(event) => setTiktokUrl(event.target.value)}
                placeholder="粘贴 TikTok 链接，例如 https://www.tiktok.com/@creator"
                className="h-12 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)] focus:bg-[var(--card)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] px-5 text-sm font-semibold text-[var(--eggshell)] transition duration-200 hover:bg-[var(--jet)] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isBusy}
            >
              {isSyncing ? <Clock3 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isSyncing ? "抓取中" : "添加账号"}
            </button>
          </form>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleSyncAll()}
              disabled={isBusy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--carolina-blue)] px-4 text-sm font-semibold text-[var(--space-cadet)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncingAll ? <Clock3 className="size-4 animate-spin" /> : <CloudDownload className="size-4" />}
              {isSyncingAll ? "Syncing..." : "Sync Now"}
            </button>
            <p className="text-xs text-[var(--cadet-gray)]">
              Last synced at:{" "}
              <span className="font-medium text-[var(--space-cadet)]">
                {lastSyncedAt ? formatLastSyncedDisplay(lastSyncedAt) : "—"}
              </span>
            </p>
          </div>

          {syncProgress ? (
            <p className="rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_8%,white)] px-3 py-2 text-sm text-[var(--space-cadet)]">
              正在同步 @{syncProgress.handle}（{syncProgress.current}/{syncProgress.total}）…
            </p>
          ) : null}

          {syncSuccessMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {syncSuccessMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => void handleRefreshData()}
                disabled={isBusy}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="刷新数据"
              >
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                刷新
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="flex-1 rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] px-3 py-2 text-sm text-[var(--space-cadet)]">
                {statusMessage}
              </p>
              <button
                type="button"
                onClick={() => void handleRefreshData()}
                disabled={isBusy}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:bg-[color-mix(in_srgb,var(--carolina-blue)_8%,white)] hover:text-[var(--carolina-blue)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="刷新数据"
              >
                <RefreshCw className={`size-4 ${isLoading && !isSyncingAll ? "animate-spin" : ""}`} />
                刷新
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-4 py-5 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "粉丝数",
            value: totals.followers,
            icon: Users,
            accent: "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)] to-transparent",
          },
          {
            label: "点赞数",
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
            label: "视频数量",
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
            <p className="relative mt-2 text-xs text-[var(--carolina-blue)]">{activeAccount?.trend ?? "—"} vs last sync</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-stretch">
        <section className="dashboard-split-panel flex min-w-0 flex-col rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--space-cadet)]">追踪账号</h2>
            <div className="flex items-center gap-2">
              <AccountSortMenu value={accountSort} onChange={setAccountSort} />
              <span className="rounded-full bg-[var(--eggshell)] px-2 py-1 text-xs text-[var(--cadet-gray)]">
                {accounts.length}
              </span>
            </div>
          </div>

          <div className="account-list-scroll mt-3 space-y-2 pr-0.5">
            {sortedAccounts.map((account) => {
              const isActive = account.handle === activeAccount?.handle;
              const isDeleting = deletingHandle === account.handle;

              return (
                <div
                  key={account.handle}
                  className={`account-list-row flex min-h-[4.25rem] shrink-0 items-center gap-2 rounded-xl border p-2 transition duration-200 ${
                    isActive
                      ? "border-[color-mix(in_srgb,var(--carolina-blue)_55%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] shadow-sm"
                      : "border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 hover:border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] hover:bg-[var(--card)] hover:shadow-md"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedHandle(account.handle)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <AccountAvatar name={account.displayName} avatarUrl={account.avatarUrl} initialsText={account.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--space-cadet)]">{account.displayName}</p>
                      <p className="truncate text-xs text-[var(--cadet-gray)]">@{account.handle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--space-cadet)]">{account.followers}</p>
                      <p className="text-xs text-[var(--cadet-gray)]">followers</p>
                    </div>
                  </button>
                  <a
                    href={account.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
                    aria-label={`打开 @${account.handle} 的 TikTok 主页`}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAccount(account.handle)}
                    disabled={isDeleting}
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--cadet-gray)] transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    aria-label={`删除账号 ${account.handle}`}
                  >
                    {isDeleting ? <Clock3 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="min-w-0 lg:h-full">
          <LineChart title="播放量趋势" subtitle="最近同步视频的表现走势" points={chartPoints} className="h-full" />
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold">@{activeAccount?.handle ?? "—"} 视频数据</h2>
            {activeAccount ? (
              <a
                href={activeAccount.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/25 bg-white/10 text-[var(--eggshell)] transition hover:border-white/40 hover:bg-white/20"
                aria-label={`打开 @${activeAccount.handle} 的 TikTok 主页`}
              >
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </div>
          <VideoSortMenu value={videoSort} onChange={setVideoSort} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-xs uppercase tracking-[0.16em] text-[var(--cadet-gray)]">
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Likes</th>
                <th className="px-4 py-3 font-medium">Comments</th>
                <th className="px-4 py-3 font-medium">Shares</th>
                <th className="px-4 py-3 font-medium">互动率</th>
                <th className="px-4 py-3 font-medium">Retention</th>
                <th className="px-4 py-3 font-medium">Posted</th>
              </tr>
            </thead>
            <tbody>
              {sortedVideos.map((video) => (
                <tr
                  key={video.id}
                  className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] transition duration-200 last:border-0 hover:bg-[var(--eggshell)]/50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {video.videoUrl ? (
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="grid size-10 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--carolina-blue)] shadow-sm transition duration-200 hover:scale-105 hover:border-[var(--carolina-blue)] hover:shadow-md"
                          aria-label={`打开视频：${video.title}`}
                        >
                          <CirclePlay className="size-5" />
                        </a>
                      ) : (
                        <div className="grid size-10 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/60 text-[var(--cadet-gray)]">
                          <CirclePlay className="size-5" />
                        </div>
                      )}
                      <p className="max-w-sm truncate text-sm font-medium text-[var(--space-cadet)]">{video.title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--jet)]">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5 text-[var(--cadet-gray)]" />
                      {video.views}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--jet)]">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3.5 text-[var(--cadet-gray)]" />
                      {video.likes}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--jet)]">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3.5 text-[var(--cadet-gray)]" />
                      {video.comments}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--jet)]">
                    <span className="inline-flex items-center gap-1">
                      <Share2 className="size-3.5 text-[var(--cadet-gray)]" />
                      {video.shares}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_15%,white)] px-2.5 py-1 text-sm font-medium text-[var(--space-cadet)]">
                      {video.interactionRate}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--carolina-blue)] to-[var(--space-cadet)]"
                          style={{ width: video.retention === "N/A" ? "0%" : video.retention }}
                        />
                      </div>
                      <span className="text-sm text-[var(--cadet-gray)]">{video.retention}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--cadet-gray)]">{video.postedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

