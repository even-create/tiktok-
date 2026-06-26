"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, CirclePlay, Filter, Hash, Search } from "lucide-react";
import { FeedAccountFilterSelect } from "@/components/dashboard/feed-account-filter-select";
import { VideoDetailModal } from "@/components/dashboard/video-detail-modal";
import { VideoFeedCard, VideoFeedSkeleton } from "@/components/dashboard/video-feed-card";
import type { ApiAccount } from "@/lib/accounts";
import { filterVideosByPostedDate, filterVideosBySearch, flattenVideosFromAccounts } from "@/lib/content-analytics";
import { formatBeijingDateChinese, getBeijingDateKey } from "@/lib/format-beijing-time";
import { filterAccountsByOwnerId } from "@/lib/dashboard-totals";
import { enrichVideosWithQuality, type ContentVideoWithQuality } from "@/lib/content-quality";
import {
  buildFeedAccountOptions,
  buildFeedOwnerOptions,
  filterVideosByAccountHandle,
  filterVideosByOwner,
  filterVideosByPlatform,
  sortVideosByPostedAt,
  type FeedSortMode,
} from "@/lib/latest-videos-feed";
import { OwnerFilterSelect, type OwnerFilterValue } from "@/components/accounts/owner-filter-select";
import { PlatformFilterSelect, type PlatformFilterValue } from "@/components/accounts/platform-filter-select";
import { useSessionUser } from "@/hooks/use-session-user";

type LatestVideosFeedProps = {
  apiAccounts: ApiAccount[];
  isLoading: boolean;
};

function PostedDateFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const todayKey = getBeijingDateKey();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const buttonLabel = value ? formatBeijingDateChinese(value) : "全部";

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)]"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5 text-[var(--cadet-gray)]" />
          {buttonLabel}
        </span>
        <ChevronDown className={`size-4 text-[var(--cadet-gray)] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-64 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-3 shadow-lg">
          <label className="block text-xs font-medium text-[var(--cadet-gray)]">选择发布日期（北京时间）</label>
          <input
            type="date"
            value={value ?? ""}
            max={todayKey}
            onChange={(event) => {
              const next = event.target.value.trim();
              onChange(next || null);
              if (next) setOpen(false);
            }}
            className="mt-1.5 h-10 w-full rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/30 px-3 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_20%,transparent)]"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 text-xs text-[var(--carolina-blue)] hover:underline"
            >
              清除日期筛选
            </button>
          ) : null}
        </div>
      ) : null}
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

export function LatestVideosFeed({ apiAccounts, isLoading }: LatestVideosFeedProps) {
  const user = useSessionUser();
  const showOwnerFilter = user?.role === "ADMIN";
  const [searchQuery, setSearchQuery] = useState("");
  const [postedDate, setPostedDate] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilterValue>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterValue>("all");
  const [sortMode, setSortMode] = useState<FeedSortMode>("posted");
  const [selectedVideo, setSelectedVideo] = useState<ContentVideoWithQuality | null>(null);

  const feedAccounts = useMemo(() => {
    if (user?.role === "MEMBER" && user.id) {
      return filterAccountsByOwnerId(apiAccounts, user.id);
    }
    return apiAccounts;
  }, [apiAccounts, user?.id, user?.role]);

  const allVideos = useMemo(() => flattenVideosFromAccounts(feedAccounts), [feedAccounts]);

  const accountOptions = useMemo(() => buildFeedAccountOptions(allVideos), [allVideos]);
  const ownerOptions = useMemo(() => buildFeedOwnerOptions(allVideos), [allVideos]);

  useEffect(() => {
    if (!showOwnerFilter) {
      setOwnerFilter("all");
      return;
    }
    if (ownerFilter !== "all" && !ownerOptions.includes(ownerFilter)) {
      setOwnerFilter("all");
    }
  }, [ownerFilter, ownerOptions, showOwnerFilter]);

  const filteredVideos = useMemo((): ContentVideoWithQuality[] => {
    let list = filterVideosByPostedDate(allVideos, postedDate);
    list = filterVideosByAccountHandle(list, accountFilter);
    list = filterVideosByPlatform(list, platformFilter);
    if (showOwnerFilter) {
      list = filterVideosByOwner(list, ownerFilter);
    }
    list = filterVideosBySearch(list, searchQuery);
    const enriched: ContentVideoWithQuality[] = enrichVideosWithQuality(list);

    if (sortMode === "views") {
      return [...enriched].sort((left, right) => right.viewsCount - left.viewsCount);
    }

    return sortVideosByPostedAt(enriched);
  }, [allVideos, postedDate, accountFilter, platformFilter, ownerFilter, searchQuery, sortMode, showOwnerFilter]);

  const hasActiveFilters =
    accountFilter !== "all" ||
    platformFilter !== "all" ||
    (showOwnerFilter && ownerFilter !== "all") ||
    postedDate !== null ||
    searchQuery.trim().length > 0;

  const filterGridCols = showOwnerFilter ? "lg:grid-cols-5" : "lg:grid-cols-4";

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

        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${filterGridCols}`}>
          <FeedAccountFilterSelect
            value={accountFilter}
            onChange={setAccountFilter}
            options={accountOptions}
          />

          <PlatformFilterSelect
            value={platformFilter}
            onChange={setPlatformFilter}
            showLabel
            variant="feed"
          />

          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
              <Calendar className="size-3" />
              发布时间
            </span>
            <PostedDateFilter value={postedDate} onChange={setPostedDate} />
          </div>

          {showOwnerFilter ? (
            <OwnerFilterSelect value={ownerFilter} onChange={setOwnerFilter} owners={ownerOptions} />
          ) : null}

          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
              <Filter className="size-3" />
              排序
            </span>
            <div className="flex h-10 w-full gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-1">
              <button
                type="button"
                onClick={() => setSortMode("posted")}
                className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
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
                className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
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
          <VideoFeedSkeleton />
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
