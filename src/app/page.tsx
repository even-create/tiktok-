"use client";

import { LineChart } from "@/components/dashboard/line-chart";
import { VideoRanking } from "@/components/dashboard/video-ranking";
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
  followers: string;
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
  videos?: ApiVideo[];
};

const trackedAccounts: Account[] = [
  {
    handle: "studio.signal",
    displayName: "Studio Signal",
    avatar: "SS",
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

function mapApiVideo(video: ApiVideo): VideoItem {
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
    comments: formatCompact(commentsCount),
    shares: formatCompact(sharesCount),
    interactionRate: interaction.label,
    interactionRateValue: interaction.value,
    postedAt: formatPostedAt(video.posted_at),
    retention: video.retention_rate ? `${video.retention_rate}%` : "N/A",
  };
}

function mapApiAccount(account: ApiAccount): Account {
  const displayName = account.display_name || account.handle;

  return {
    id: account.id,
    handle: account.handle,
    displayName,
    avatar: initials(displayName),
    followers: formatCompact(account.followers_count ?? 0),
    likes: formatCompact(account.likes_count ?? 0),
    views: formatCompact(account.total_views ?? 0),
    engagement: `${Number(account.engagement_rate ?? 0).toFixed(1)}%`,
    trend: account.last_synced_at ? "Live" : "New",
    videos: (account.videos ?? []).map(mapApiVideo),
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

  const loadAccounts = useCallback(async (preferredHandle?: string) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const payload = (await response.json()) as { accounts?: ApiAccount[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取 Supabase 数据失败");
      }

      const nextAccounts = (payload.accounts ?? []).map(mapApiAccount);

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

  const activeAccount = useMemo(
    () => accounts.find((account) => account.handle === selectedHandle) ?? accounts[0],
    [accounts, selectedHandle],
  );

  const totals = useMemo(
    () => ({
      followers: accounts.length ? activeAccount.followers : "0",
      likes: accounts.length ? activeAccount.likes : "0",
      views: accounts.length ? activeAccount.views : "0",
      engagement: accounts.length ? activeAccount.engagement : "0%",
      videos: activeAccount.videos.length,
      avgInteraction:
        activeAccount.videos.length > 0
          ? `${(
              activeAccount.videos.reduce((sum, video) => sum + video.interactionRateValue, 0) /
              activeAccount.videos.length
            ).toFixed(2)}%`
          : "0%",
    }),
    [accounts.length, activeAccount],
  );

  const chartPoints = useMemo(() => {
    return [...activeAccount.videos]
      .sort((left, right) => right.viewsCount - left.viewsCount)
      .slice(0, 6)
      .reverse()
      .map((video, index) => ({
        label: `#${index + 1}`,
        value: video.viewsCount,
      }));
  }, [activeAccount.videos]);

  const rankedVideos = useMemo(() => {
    return [...activeAccount.videos]
      .sort((left, right) => right.viewsCount - left.viewsCount)
      .slice(0, 5)
      .map((video, index) => ({
        id: video.id,
        title: video.title,
        videoUrl: video.videoUrl,
        views: video.views,
        interactionRate: video.interactionRate,
        rank: index + 1,
      }));
  }, [activeAccount.videos]);

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
    <main className="min-h-screen text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#161823] via-[#2b2f3a] to-[#161823] text-white shadow-md">
                <Flame className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">TikTok Tracker</p>
                <p className="text-xs text-zinc-500">Studio-style analytics</p>
              </div>
            </div>
            <button
              className="grid size-10 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 lg:hidden"
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
                    ? "bg-gradient-to-r from-[#161823] to-[#2f3442] text-white shadow-md"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <section className="mt-6 hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-[#161823] via-[#222633] to-[#161823] p-4 text-white shadow-lg lg:block">
            <div className="flex items-center gap-2 text-sm font-medium">
              {isLoading ? (
                <Clock3 className="size-4 animate-spin text-[#25f4ee]" />
              ) : (
                <Sparkles className="size-4 text-[#25f4ee]" />
              )}
              Sync status
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-300">{statusMessage}</p>
          </section>
        </aside>

        <section className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#fe2c55]">
                  <Activity className="size-4" />
                  Dashboard
                </div>
                <h1 className="mt-3 text-3xl font-semibold text-zinc-900 sm:text-4xl">TikTok 数据追踪后台</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  添加账号链接，集中查看粉丝、播放、互动率和视频表现，界面风格参考 TikTok Studio。
                </p>
              </div>

              <form onSubmit={handleAddAccount} className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-xl">
                <label className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={tiktokUrl}
                    onChange={(event) => setTiktokUrl(event.target.value)}
                    placeholder="粘贴 TikTok 链接，例如 https://www.tiktok.com/@creator"
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#25f4ee] focus:bg-white focus:ring-4 focus:ring-[#25f4ee]/15"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#fe2c55] px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#e0264b] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
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
              <p className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
                {statusMessage}
              </p>
            )}
          </header>

          <div className="grid gap-4 py-5 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "粉丝数", value: totals.followers, icon: Users, accent: "from-cyan-500/15 to-cyan-500/0" },
              { label: "点赞数", value: totals.likes, icon: ThumbsUp, accent: "from-rose-500/15 to-rose-500/0" },
              { label: "总播放量", value: totals.views, icon: Eye, accent: "from-violet-500/15 to-violet-500/0" },
              { label: "视频数量", value: String(totals.videos), icon: CirclePlay, accent: "from-amber-500/15 to-amber-500/0" },
              { label: "平均互动率", value: totals.avgInteraction, icon: TrendingUp, accent: "from-emerald-500/15 to-emerald-500/0" },
            ].map((metric) => (
              <article
                key={metric.label}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${metric.accent}`} />
                <div className="relative flex items-center justify-between">
                  <p className="text-sm text-zinc-500">{metric.label}</p>
                  <metric.icon className="size-5 text-zinc-700" />
                </div>
                <p className="relative mt-4 text-3xl font-semibold text-zinc-900">{metric.value}</p>
                <p className="relative mt-2 text-xs text-emerald-600">{activeAccount.trend} vs last sync</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900">追踪账号</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{accounts.length}</span>
              </div>
              <div className="mt-4 space-y-2">
                {accounts.map((account) => {
                  const isActive = account.handle === activeAccount.handle;
                  const isDeleting = deletingHandle === account.handle;

                  return (
                    <div
                      key={account.handle}
                      className={`flex items-center gap-2 rounded-xl border p-2 transition duration-200 ${
                        isActive
                          ? "border-[#25f4ee]/50 bg-cyan-50/70 shadow-sm"
                          : "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-white hover:shadow-md"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedHandle(account.handle)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#161823] to-[#3a3f4d] text-sm font-bold text-white">
                          {account.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">{account.displayName}</p>
                          <p className="truncate text-xs text-zinc-500">@{account.handle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-900">{account.followers}</p>
                          <p className="text-xs text-zinc-500">followers</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount(account.handle)}
                        disabled={isDeleting}
                        className="grid size-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
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

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <LineChart
                title="播放量趋势"
                subtitle="最近同步视频的表现走势"
                points={chartPoints}
              />
              <VideoRanking videos={rankedVideos} />
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-zinc-200 bg-gradient-to-r from-[#161823] via-[#2a2f3b] to-[#161823] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">@{activeAccount.handle} 视频列表</h2>
                <p className="mt-1 text-xs text-zinc-300">点击播放图标可打开 TikTok 原视频</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
                <BarChart3 className="size-3.5" />
                互动率 = (点赞 + 评论 + 分享) / 播放量
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-[0.16em] text-zinc-500">
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
                  {activeAccount.videos.map((video) => (
                    <tr
                      key={video.id}
                      className="border-b border-zinc-100 transition duration-200 last:border-0 hover:bg-zinc-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {video.videoUrl ? (
                            <a
                              href={video.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-[#fe2c55] shadow-sm transition duration-200 hover:scale-105 hover:border-[#fe2c55]/30 hover:shadow-md"
                              aria-label={`打开视频：${video.title}`}
                            >
                              <CirclePlay className="size-5" />
                            </a>
                          ) : (
                            <div className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-400">
                              <CirclePlay className="size-5" />
                            </div>
                          )}
                          <p className="max-w-sm truncate text-sm font-medium text-zinc-900">{video.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3.5 text-zinc-400" />
                          {video.views}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="size-3.5 text-zinc-400" />
                          {video.likes}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3.5 text-zinc-400" />
                          {video.comments}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700">
                        <span className="inline-flex items-center gap-1">
                          <Share2 className="size-3.5 text-zinc-400" />
                          {video.shares}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700">
                          {video.interactionRate}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#25f4ee] to-[#fe2c55]"
                              style={{ width: video.retention === "N/A" ? "0%" : video.retention }}
                            />
                          </div>
                          <span className="text-sm text-zinc-600">{video.retention}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-500">{video.postedAt}</td>
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
