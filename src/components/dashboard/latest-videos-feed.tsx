"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CirclePlay,
  Eye,
  Filter,
  Hash,
  Heart,
  MessageCircle,
  Search,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { FeedVideoCover } from "@/components/dashboard/feed-video-cover";
import { TikTokIcon } from "@/components/dashboard/tiktok-icon";
import { VideoDetailModal } from "@/components/dashboard/video-detail-modal";
import type { ApiAccount } from "@/lib/accounts";
import {
  filterVideosByDateRange,
  filterVideosBySearch,
  flattenVideosFromAccounts,
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
        >
          <div className="relative aspect-[3/4] w-full animate-pulse bg-[var(--eggshell)]/60">
            <div className="absolute inset-y-0 right-2 flex flex-col justify-center gap-2">
              {Array.from({ length: 4 }).map((__, statIndex) => (
                <div key={statIndex} className="size-8 rounded-full bg-white/20" />
              ))}
            </div>
          </div>
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--eggshell)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--eggshell)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoCoverStatsOverlay({ video }: { video: ContentVideoWithQuality }) {
  const stats = [
    { icon: Eye, value: video.viewsLabel },
    { icon: Heart, value: video.likesLabel },
    { icon: MessageCircle, value: video.commentsLabel },
    { icon: Share2, value: video.sharesLabel },
  ];

  return (
    <div className="pointer-events-none absolute inset-y-0 right-1.5 z-10 flex flex-col items-center justify-center gap-2 py-3 sm:right-2 sm:gap-2.5">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col items-center gap-0.5">
          <div className="grid size-8 place-items-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-[2px] sm:size-9">
            <stat.icon className="size-3.5 sm:size-4" strokeWidth={2.25} />
          </div>
          <span className="max-w-[52px] truncate text-center text-[10px] font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[11px]">
            {stat.value}
          </span>
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
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--carolina-blue)_45%,transparent)] hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onSelect(video)}
        className="relative block w-full overflow-hidden text-left"
      >
        <FeedVideoCover
          title={video.title}
          thumbnailUrl={video.thumbnailUrl}
          videoUrl={video.videoUrl}
          className="aspect-[3/4] w-full"
        />

        <span
          className={`absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold shadow-sm ${tierStyle.badge}`}
        >
          <span aria-hidden>{qualityTierEmoji[video.qualityTier]}</span>
          <span className="hidden min-[420px]:inline">{qualityTierDisplayLabel[video.qualityTier]}</span>
        </span>

        <VideoCoverStatsOverlay video={video} />

        <span className="absolute bottom-2 left-2 z-10 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          查看详情
        </span>

        {video.videoUrl ? (
          <a
            href={video.videoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-2 right-2 z-10 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70"
            aria-label={`在 TikTok 打开：${video.title}`}
          >
            <TikTokIcon className="size-3.5" />
          </a>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-2 border-t border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] p-2.5 sm:p-3">
        <button type="button" onClick={() => onSelect(video)} className="text-left">
          <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--space-cadet)] transition group-hover:text-[var(--carolina-blue)]">
            {video.title}
          </p>
        </button>

        <div className="flex items-center gap-1.5">
          <AccountAvatar
            name={video.accountDisplayName}
            avatarUrl={video.accountAvatarUrl}
            initialsText={video.accountHandle.slice(0, 2).toUpperCase()}
            className="size-6 rounded-full text-[9px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-[var(--space-cadet)]">@{video.accountHandle}</p>
            <p className="truncate text-[9px] text-[var(--cadet-gray)]" title={video.postedAtFull}>
              {video.postedLabel}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center pt-1">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)] px-2 py-0.5 text-[10px] font-semibold text-[var(--space-cadet)]">
            <TrendingUp className="size-2.5" />
            {video.engagementLabel}
          </span>
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
    <section className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--space-cadet)] text-[var(--eggshell)] shadow-sm">
            <CirclePlay className="size-5" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--space-cadet)] sm:text-xl">最新视频动态</h2>
        </div>
        {!isLoading ? (
          <p className="text-sm text-[var(--cadet-gray)]">
            {filteredVideos.length} / {allVideos.length} 条视频
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-4 border-t border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] pt-4">
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

      <div className="mt-4">
        {isLoading ? (
          <FeedSkeleton />
        ) : filteredVideos.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
