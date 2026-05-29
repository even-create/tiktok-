"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CirclePlay,
  Eye,
  Filter,
  Hash,
  MessageCircle,
  Search,
  Share2,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { VideoThumbnail } from "@/components/content-analytics/video-thumbnail";
import { TikTokIcon } from "@/components/dashboard/tiktok-icon";
import { VideoDetailModal } from "@/components/dashboard/video-detail-modal";
import type { ApiAccount } from "@/lib/accounts";
import {
  filterVideosByDateRange,
  filterVideosBySearch,
  flattenVideosFromAccounts,
  sortVideos,
  type DateRangeFilter,
} from "@/lib/content-analytics";
import { enrichVideosWithQuality, qualityTierStyles, type ContentVideoWithQuality } from "@/lib/content-quality";
import {
  buildFeedAccountOptions,
  filterVideosByAccountHandle,
  qualityTierDisplayLabel,
  qualityTierEmoji,
  sortVideosByPostedAt,
  type FeedSortMode,
} from "@/lib/latest-videos-feed";

type LatestVideosFeedProps = {
  apiAccounts: ApiAccount[];
  isLoading: boolean;
};

const dateRangeOptions: Array<{ value: DateRangeFilter; label: string }> = [
  { value: "7d", label: "7 天" },
  { value: "30d", label: "30 天" },
  { value: "all", label: "全部" },
];

function FeedSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
        >
          <div className="h-40 animate-pulse bg-[var(--eggshell)]/60" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--eggshell)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--eggshell)]" />
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--eggshell)]" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--eggshell)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/20 px-6 py-16 text-center">
      <CirclePlay className="size-12 text-[var(--cadet-gray)]" />
      <h3 className="mt-4 text-base font-semibold text-[var(--space-cadet)]">
        {hasFilters ? "没有匹配的视频" : "暂无视频数据"}
      </h3>
      <p className="mt-2 max-w-md text-sm text-[var(--cadet-gray)]">
        {hasFilters
          ? "尝试调整账号、时间范围或搜索关键词。"
          : "添加 TikTok 账号并执行 Sync Now，最新视频将显示在这里。"}
      </p>
    </div>
  );
}

function VideoFeedCard({
  video,
  onSelect,
}: {
  video: ContentVideoWithQuality;
  onSelect: (video: ContentVideoWithQuality) => void;
}) {
  const tierStyle = qualityTierStyles[video.qualityTier];

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--carolina-blue)_45%,transparent)] hover:shadow-lg"
    >
      <button
        type="button"
        onClick={() => onSelect(video)}
        className="relative block w-full text-left"
      >
        <VideoThumbnail title={video.title} thumbnailUrl={video.thumbnailUrl} className="h-40 w-full rounded-none sm:h-44" />
        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${tierStyle.badge}`}
        >
          <span aria-hidden>{qualityTierEmoji[video.qualityTier]}</span>
          {qualityTierDisplayLabel[video.qualityTier]}
        </span>
        <span className="absolute bottom-2 right-2 rounded-lg bg-[var(--space-cadet)]/85 px-2 py-1 text-[10px] font-medium text-[var(--eggshell)] opacity-0 transition group-hover:opacity-100">
          查看详情
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <button type="button" onClick={() => onSelect(video)} className="text-left">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-[var(--space-cadet)] transition group-hover:text-[var(--carolina-blue)]">
            {video.title}
          </p>
        </button>

        <div className="flex items-center gap-2">
          <AccountAvatar
            name={video.accountDisplayName}
            avatarUrl={null}
            initialsText={video.accountHandle.slice(0, 2).toUpperCase()}
            className="size-7 text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--space-cadet)]">@{video.accountHandle}</p>
            <p className="truncate text-[10px] text-[var(--cadet-gray)]">{video.postedLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--cadet-gray)] sm:grid-cols-4">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3 shrink-0" />
            {video.viewsLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="size-3 shrink-0" />
            {video.likesLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3 shrink-0" />
            {video.commentsLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 className="size-3 shrink-0" />
            {video.sharesLabel}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] pt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)] px-2.5 py-1 text-xs font-semibold text-[var(--space-cadet)]">
            <TrendingUp className="size-3" />
            {video.engagementLabel}
          </span>
          {video.videoUrl ? (
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-xs font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
              aria-label={`在 TikTok 打开：${video.title}`}
            >
              <TikTokIcon className="size-3.5" />
              <span className="hidden sm:inline">TikTok</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function LatestVideosFeed({ apiAccounts, isLoading }: LatestVideosFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortMode, setSortMode] = useState<FeedSortMode>("posted");
  const [selectedVideo, setSelectedVideo] = useState<ContentVideoWithQuality | null>(null);

  const allVideos = useMemo(() => flattenVideosFromAccounts(apiAccounts), [apiAccounts]);

  const accountOptions = useMemo(() => buildFeedAccountOptions(allVideos), [allVideos]);

  const filteredVideos = useMemo((): ContentVideoWithQuality[] => {
    let list = filterVideosByDateRange(allVideos, dateRange);
    list = filterVideosByAccountHandle(list, accountFilter);
    list = filterVideosBySearch(list, searchQuery);
    const enriched: ContentVideoWithQuality[] = enrichVideosWithQuality(list);

    if (sortMode === "views") {
      return [...enriched].sort((left, right) => right.viewsCount - left.viewsCount);
    }

    return sortVideosByPostedAt(enriched);
  }, [allVideos, dateRange, accountFilter, searchQuery, sortMode]);

  const hasActiveFilters = accountFilter !== "all" || dateRange !== "all" || searchQuery.trim().length > 0;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
      <div className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--carolina-blue)_80%,white)]">
              <CirclePlay className="size-4" />
              Latest Videos Feed
            </div>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">最新视频动态</h2>
            <p className="mt-1 text-sm text-white/75">全部追踪账号 · 按发布时间展示表现数据</p>
          </div>
          {!isLoading ? (
            <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {filteredVideos.length} / {allVideos.length} 条视频
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 border-b border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] bg-[var(--eggshell)]/25 p-4 sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索 caption 或 hashtag…"
            className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_20%,transparent)]"
          />
        </label>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
              <Users className="size-3" />
              账号
            </span>
            <select
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)]"
            >
              <option value="all">全部账号</option>
              {accountOptions.map((account) => (
                <option key={account.handle} value={account.handle}>
                  @{account.handle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
              <Calendar className="size-3" />
              发布时间
            </span>
            <div className="flex flex-wrap gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-1">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDateRange(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    dateRange === option.value
                      ? "bg-[var(--space-cadet)] text-[var(--eggshell)]"
                      : "text-[var(--cadet-gray)] hover:bg-[var(--eggshell)] hover:text-[var(--space-cadet)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
              <Filter className="size-3" />
              排序
            </span>
            <div className="flex flex-wrap gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-1">
              <button
                type="button"
                onClick={() => setSortMode("posted")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  sortMode === "posted"
                    ? "bg-[var(--space-cadet)] text-[var(--eggshell)]"
                    : "text-[var(--cadet-gray)] hover:bg-[var(--eggshell)]"
                }`}
              >
                最新发布
              </button>
              <button
                type="button"
                onClick={() => setSortMode("views")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  sortMode === "views"
                    ? "bg-[var(--space-cadet)] text-[var(--eggshell)]"
                    : "text-[var(--cadet-gray)] hover:bg-[var(--eggshell)]"
                }`}
              >
                播放量
              </button>
            </div>
          </div>
        </div>

        <p className="flex items-center gap-1 text-[10px] text-[var(--cadet-gray)]">
          <Hash className="size-3" />
          支持搜索标题中的 hashtag（如 #fyp）
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <FeedSkeleton />
        ) : filteredVideos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => (
              <VideoFeedCard key={video.id} video={video} onSelect={setSelectedVideo} />
            ))}
          </div>
        ) : (
          <FeedEmptyState hasFilters={hasActiveFilters || allVideos.length > 0} />
        )}
      </div>

      <VideoDetailModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </section>
  );
}
