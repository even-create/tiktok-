"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  CirclePlay,
  Clock3,
  ExternalLink,
  Eye,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { PlatformBadge } from "@/components/accounts/platform-badge";
import { ViewsOverTimeChart } from "@/components/accounts/views-over-time-chart";
import { VideoDetailModal } from "@/components/dashboard/video-detail-modal";
import { VideoFeedCard, VideoFeedSkeleton } from "@/components/dashboard/video-feed-card";
import {
  flattenBenchmarkVideos,
  mapApiBenchmarkAccount,
  type ApiBenchmarkAccount,
} from "@/lib/benchmark-accounts";
import { enrichVideosWithQuality, type ContentVideoWithQuality } from "@/lib/content-quality";
import { getBeijingDateKey } from "@/lib/format-beijing-time";
import { PLATFORM_LABELS, VIEW_PRIMARY_PLATFORMS, type Platform } from "@/lib/providers/platform";
import { addDaysToDateKey } from "@/lib/snapshot-date";

export default function BenchmarkAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id ?? "");

  const [apiAccount, setApiAccount] = useState<ApiBenchmarkAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentVideoWithQuality | null>(null);

  const loadAccount = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/benchmark-accounts/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = (await response.json()) as { account?: ApiBenchmarkAccount; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取对标账号详情失败");
      }

      if (!payload.account) {
        throw new Error("对标账号不存在");
      }

      setApiAccount(payload.account);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取对标账号详情失败");
      setApiAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const account = useMemo(() => (apiAccount ? mapApiBenchmarkAccount(apiAccount) : null), [apiAccount]);
  const platform: Platform = account?.platform ?? "tiktok";
  const isViewPrimary = VIEW_PRIMARY_PLATFORMS.has(platform);
  const metricNoun = isViewPrimary ? "播放" : "点赞";

  const videoCards = useMemo(
    () => (apiAccount ? enrichVideosWithQuality(flattenBenchmarkVideos(apiAccount)) : []),
    [apiAccount],
  );

  const seriesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const video of apiAccount?.videos ?? []) {
      if (!video.posted_at) continue;
      const dateKey = getBeijingDateKey(video.posted_at);
      if (!dateKey) continue;
      const value = isViewPrimary ? video.views_count ?? 0 : video.likes_count ?? 0;
      map.set(dateKey, (map.get(dateKey) ?? 0) + value);
    }
    return [...map.entries()]
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [apiAccount, isViewPrimary]);

  const last30Views = useMemo(() => {
    const threshold = addDaysToDateKey(getBeijingDateKey(), -29);
    return seriesByDay
      .filter((point) => point.date >= threshold)
      .reduce((sum, point) => sum + point.views, 0);
  }, [seriesByDay]);

  const maxDayViews = useMemo(
    () => seriesByDay.reduce((max, point) => Math.max(max, point.views), 0),
    [seriesByDay],
  );

  async function handleDeleteAccount() {
    if (!account) return;

    const confirmed = window.confirm("确定删除该对标账号？");
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/benchmark-accounts?id=${encodeURIComponent(account.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除失败");
      }

      router.push("/benchmark-accounts");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除失败");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
        <VideoFeedSkeleton count={4} />
      </div>
    );
  }

  if (!account) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <p className="text-sm text-rose-700">{errorMessage || "未找到该对标账号"}</p>
        <Link
          href="/benchmark-accounts"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--space-cadet)] px-4 py-2 text-sm font-medium text-[var(--eggshell)] transition hover:bg-[var(--jet)]"
        >
          <ArrowLeft className="size-4" />
          返回对标账号列表
        </Link>
      </section>
    );
  }

  const detailMetrics = isViewPrimary
    ? [
        { label: "粉丝数", value: account.followersLabel, icon: Users },
        { label: "总点赞", value: account.likesLabel, icon: ThumbsUp },
        { label: "总播放", value: account.viewsLabel, icon: Eye },
        { label: "互动率", value: account.engagementLabel, icon: TrendingUp },
      ]
    : [
        { label: "粉丝数", value: account.followersLabel, icon: Users },
        { label: "总点赞", value: account.likesLabel, icon: ThumbsUp },
        { label: "总收藏", value: account.collectsLabel, icon: Bookmark },
        { label: "作品数", value: String(account.videoCount), icon: CirclePlay },
      ];

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/benchmark-accounts"
              className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
              aria-label="返回对标账号列表"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <AccountAvatar
              name={account.displayName}
              avatarUrl={account.avatarUrl}
              initialsText={account.initials}
              className="size-14"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
                  Benchmark Account Detail
                </p>
                <PlatformBadge platform={platform} />
              </div>
              <h1 className="mt-2 truncate text-3xl font-semibold text-[var(--space-cadet)]">{account.displayName}</h1>
              <p className="mt-1 text-sm text-[var(--cadet-gray)]">@{account.handle}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--cadet-gray)]">
                <Clock3 className="size-3.5" />
                上次同步：{account.lastSyncedLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
            >
              <ExternalLink className="size-4" />
              {PLATFORM_LABELS[platform]} 主页
            </a>
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={isDeleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              {isDeleting ? <Clock3 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              删除账号
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {detailMetrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--cadet-gray)]">{metric.label}</p>
              <metric.icon className="size-5 text-[var(--space-cadet)]" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[var(--space-cadet)]">{metric.value}</p>
          </article>
        ))}
      </div>

      <ViewsOverTimeChart
        data={seriesByDay}
        last30Views={last30Views}
        maxDayViews={maxDayViews}
        metricNoun={metricNoun}
        titleZh={isViewPrimary ? "播放量趋势" : "点赞趋势"}
        titleEn={isViewPrimary ? "Views Over Time" : "Likes Over Time"}
      />

      <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
          <h2 className="text-base font-semibold">{isViewPrimary ? "视频数据" : "作品数据"}</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{videoCards.length} 条</span>
        </div>

        <div className="p-4 sm:p-5">
          {videoCards.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videoCards.map((video) => (
                <VideoFeedCard key={video.id} video={video} onSelect={setSelectedVideo} showOwner={false} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <CirclePlay className="size-10 text-[var(--cadet-gray)]" />
              <p className="mt-3 text-sm font-medium text-[var(--space-cadet)]">暂无作品数据</p>
            </div>
          )}
        </div>
      </section>

      <VideoDetailModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}
