"use client";

import { AccountAvatar } from "@/components/account-avatar";
import { AccountSortMenu, type AccountSortMode } from "@/components/dashboard/account-sort-menu";
import { LineChart } from "@/components/dashboard/line-chart";
import { VideoSortMenu, type VideoSortMode } from "@/components/dashboard/video-sort-menu";
import {
  Activity,
  BarChart3,
  CirclePlay,
  Clock3,
  Eye,
  Flame,
  LayoutDashboard,
  Link2,
  Menu,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type VideoItem = {
  id: string;
  title: string;
  videoUrl: string | null;
  views: string;
  viewsCount: number;
  likes: string;
  likesCount: number;
  sortOrder: number;
  comments: string;
  shares: string;
  interactionRate: string;
  interactionRateValue: number;
  postedAt: string;
  retention: string;
};

type Account = {
  id?: string;
  handle: string;
  displayName: string;
  avatar: string;
  avatarUrl: string | null;
  followers: string;
  followersCount: number;
  lastSyncedAt: string | null;
  sortOrder: number;
  likes: string;
  views: string;
  engagement: string;
  trend: string;
  videos: VideoItem[];
};

type ApiVideo = {
  id: string;
  title: string;
  video_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  retention_rate: number | null;
  posted_at: string | null;
};

type ApiAccount = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  likes_count: number;
  total_views: number;
  engagement_rate: number;
  last_synced_at: string | null;
  created_at?: string | null;
  videos?: ApiVideo[];
};

const trackedAccounts: Account[] = [
  {
    handle: "studio.signal",
    displayName: "Studio Signal",
    avatar: "SS",
    avatarUrl: null,
    followersCount: 482600,
    lastSyncedAt: new Date().toISOString(),
    sortOrder: 0,
    followers: "482.6K",
    likes: "12.4M",
    views: "18.4M",
    engagement: "8.7%",
    trend: "+12.8%",
    videos: [
      {
        id: "1",
        title: "3 hooks that stop the scroll in the first second",
        videoUrl: "https://www.tiktok.com/@studio.signal/video/1",
        views: "2.8M",
        viewsCount: 2800000,
        likesCount: 184000,
        sortOrder: 0,
        likes: "184K",
        comments: "9.2K",
        shares: "14.8K",
        interactionRate: "7.43%",
        interactionRateValue: 7.43,
        postedAt: "2h ago",
        retention: "64%",
      },
      {
        id: "2",
        title: "Creator workflow: scripting to analytics loop",
        videoUrl: "https://www.tiktok.com/@studio.signal/video/2",
        views: "918K",
        viewsCount: 918000,
        likesCount: 72000,
        sortOrder: 1,
        likes: "72K",
        comments: "3.4K",
        shares: "7.1K",
        interactionRate: "8.98%",
        interactionRateValue: 8.98,
        postedAt: "1d ago",
        retention: "58%",
      },
      {
        id: "3",
        title: "Behind the dashboard: weekly content review",
        videoUrl: "https://www.tiktok.com/@studio.signal/video/3",
        views: "611K",
        viewsCount: 611000,
        likesCount: 41000,
        sortOrder: 2,
        likes: "41K",
        comments: "1.8K",
        shares: "4.3K",
        interactionRate: "7.72%",
        interactionRateValue: 7.72,
        postedAt: "3d ago",
        retention: "51%",
      },
    ],
  },
  {
    handle: "growth.lab",
    displayName: "Growth Lab",
    avatar: "GL",
    avatarUrl: null,
    followersCount: 236100,
    lastSyncedAt: new Date(Date.now() - 86400000).toISOString(),
    sortOrder: 1,
    followers: "236.1K",
    likes: "5.8M",
    views: "9.7M",
    engagement: "6.9%",
    trend: "+7.4%",
    videos: [
      {
        id: "4",
        title: "How we test 20 video angles every week",
        videoUrl: "https://www.tiktok.com/@growth.lab/video/4",
        views: "1.2M",
        viewsCount: 1200000,
        likesCount: 96000,
        sortOrder: 0,
        likes: "96K",
        comments: "5.6K",
        shares: "11.2K",
        interactionRate: "9.40%",
        interactionRateValue: 9.4,
        postedAt: "5h ago",
        retention: "61%",
      },
      {
        id: "5",
        title: "The analytics tab most creators ignore",
        videoUrl: "https://www.tiktok.com/@growth.lab/video/5",
        views: "744K",
        viewsCount: 744000,
        likesCount: 48000,
        sortOrder: 1,
        likes: "48K",
        comments: "2.1K",
        shares: "5.9K",
        interactionRate: "7.53%",
        interactionRateValue: 7.53,
        postedAt: "2d ago",
        retention: "55%",
      },
    ],
  },
];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Accounts", icon: Users },
  { label: "Videos", icon: Video },
  { label: "Reports", icon: BarChart3 },
];

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPostedAt(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  if (views <= 0) {
    return { label: "0%", value: 0 };
  }

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
    sortOrder,
    comments: formatCompact(commentsCount),
    shares: formatCompact(sharesCount),
    interactionRate: interaction.label,
    interactionRateValue: interaction.value,
    postedAt: formatPostedAt(video.posted_at),
    retention: video.retention_rate ? `${video.retention_rate}%` : "N/A",
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
        setSelectedHandle((current) => {
          if (preferredHandle && nextAccounts.some((account) => account.handle === preferredHandle)) {
            return preferredHandle;
          }

          if (nextAccounts.some((account) => account.handle === current)) {
            return current;
          }

          return nextAccounts[0].handle;
        });
        setStatusMessage("Supabase 已连接，Dashboard 使用实时数据。");
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

  const sortedAccounts = useMemo(
    () => sortAccounts(accounts, accountSort),
    [accounts, accountSort],
  );

  const activeAccount = useMemo(
    () =>
      sortedAccounts.find((account) => account.handle === selectedHandle) ??
      sortedAccounts[0] ??
      accounts[0],
    [accounts, sortedAccounts, selectedHandle],
  );

  const totals = useMemo(
    () => ({
      followers: activeAccount ? activeAccount.followers : "0",
      likes: activeAccount ? activeAccount.likes : "0",
      views: activeAccount ? activeAccount.views : "0",
      engagement: activeAccount ? activeAccount.engagement : "0%",
      videos: activeAccount?.videos.length ?? 0,
      avgInteraction:
        activeAccount && activeAccount.videos.length > 0
          ? `${(
              activeAccount.videos.reduce((sum, video) => sum + video.interactionRateValue, 0) /
              activeAccount.videos.length
            ).toFixed(2)}%`
          : "0%",
    }),
    [activeAccount],
  );

  const chartPoints = useMemo(() => {
    if (!activeAccount) return [];

    return [...activeAccount.videos]
      .sort((left, right) => right.viewsCount - left.viewsCount)
      .slice(0, 6)
      .reverse()
      .map((video, index) => ({
        label: `#${index + 1}`,
        value: video.viewsCount,
      }));
  }, [activeAccount]);

  const sortedVideos = useMemo(() => {
    if (!activeAccount) return [];
    return sortVideos(activeAccount.videos, videoSort);
  }, [activeAccount, videoSort]);

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
        body: JSON.stringify({ url: tiktokUrl }),
      });
      const payload = (await response.json()) as {
        account?: { handle: string };
        videosCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Apify 同步失败");
      }

      const syncedHandle = payload.account?.handle;
      setTiktokUrl("");
      setStatusMessage(`同步完成，已保存 ${payload.videosCount ?? 0} 条视频。`);
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
      const response = await fetch(`/api/accounts?handle=${encodeURIComponent(handle)}`, {
        method: "DELETE",
      });
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

  return (
    <main className="min-h-screen text-[var(--space-cadet)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row lg:items-stretch">
        <aside className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)]/95 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)] shadow-md">
                <Flame className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--space-cadet)]">TikTok Tracker</p>
                <p className="text-xs text-[var(--cadet-gray)]">Data analytics</p>
              </div>
            </div>
            <button
              className="grid size-10 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm transition duration-200 lg:justify-start ${
                  item.active
                    ? "bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)] shadow-md"
                    : "text-[var(--cadet-gray)] hover:bg-[var(--eggshell)]/70 hover:text-[var(--space-cadet)]"
                }`}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <section className="mt-6 hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-br from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)] shadow-lg lg:block">
            <div className="flex items-center gap-2 text-sm font-medium">
              {isLoading ? (
                <Clock3 className="size-4 animate-spin text-[var(--carolina-blue)]" />
              ) : (
                <Sparkles className="size-4 text-[var(--carolina-blue)]" />
              )}
              Sync status
            </div>
            <p className="mt-3 text-xs leading-5 text-[color-mix(in_srgb,var(--eggshell)_75%,transparent)]">{statusMessage}</p>
          </section>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
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
                  disabled={isSyncing}
                >
                  {isSyncing ? <Clock3 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {isSyncing ? "抓取中" : "添加账号"}
                </button>
              </form>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : (
              <p className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] px-3 py-2 text-sm text-[var(--space-cadet)]">
                {statusMessage}
              </p>
            )}
          </header>

          <div className="grid gap-4 py-5 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "粉丝数", value: totals.followers, icon: Users, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)] to-transparent" },
              { label: "点赞数", value: totals.likes, icon: ThumbsUp, accent: "from-[color-mix(in_srgb,var(--space-cadet)_14%,transparent)] to-transparent" },
              { label: "总播放量", value: totals.views, icon: Eye, accent: "from-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] to-transparent" },
              { label: "视频数量", value: String(totals.videos), icon: CirclePlay, accent: "from-[color-mix(in_srgb,var(--jet)_12%,transparent)] to-transparent" },
              { label: "平均互动率", value: totals.avgInteraction, icon: TrendingUp, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)] to-transparent" },
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
                  {activeAccount?.trend ?? "—"} vs last sync
                </p>
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
                        <AccountAvatar
                          name={account.displayName}
                          avatarUrl={account.avatarUrl}
                          initialsText={account.avatar}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--space-cadet)]">{account.displayName}</p>
                          <p className="truncate text-xs text-[var(--cadet-gray)]">@{account.handle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--space-cadet)]">{account.followers}</p>
                          <p className="text-xs text-[var(--cadet-gray)]">followers</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount(account.handle)}
                        disabled={isDeleting}
                        className="grid size-9 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--cadet-gray)] transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                        aria-label={`删除账号 ${account.handle}`}
                      >
                        {isDeleting ? (
                          <Clock3 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="min-w-0 lg:h-full">
              <LineChart
                title="播放量趋势"
                subtitle="最近同步视频的表现走势"
                points={chartPoints}
                className="h-full"
              />
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
              <h2 className="text-base font-semibold">@{activeAccount?.handle ?? "—"} 视频数据</h2>
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
        </section>
      </div>
    </main>
  );
}
