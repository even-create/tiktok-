"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CirclePlay,
  Eye,
  Hash,
  LineChart,
  MessageCircle,
  Search,
  Share2,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { QualityAnalysisPanel } from "@/components/content-analytics/quality-analysis-panel";
import { TagAnalysisPanel } from "@/components/content-analytics/tag-analysis-panel";
import { VideoDataTable } from "@/components/content-analytics/video-data-table";
import { VideoRankRow } from "@/components/content-analytics/video-rank-row";
import {
  buildQualitySummary,
  buildQualityTrends,
  enrichVideosWithQuality,
  pickVideosByTier,
  type QualityTier,
} from "@/lib/content-quality";
import { formatCompact, type ApiAccount } from "@/lib/accounts";
import {
  buildContentStats,
  buildTagStats,
  filterVideosByDateRange,
  filterVideosBySearch,
  flattenVideosFromAccounts,
  pickTopVideos,
  sortVideos,
  type ContentVideo,
  type DateRangeFilter,
} from "@/lib/content-analytics";

const dateRangeOptions: Array<{ value: DateRangeFilter; label: string }> = [
  { value: "7d", label: "最近 7 天" },
  { value: "30d", label: "最近 30 天" },
  { value: "all", label: "全部" },
];

export default function ContentAnalyticsPage() {
  const [allVideos, setAllVideos] = useState<ContentVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [tierFilter, setTierFilter] = useState<"all" | QualityTier>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadVideos = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const payload = (await response.json()) as { accounts?: ApiAccount[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取视频数据失败");
      }

      setAllVideos(flattenVideosFromAccounts(payload.accounts ?? []));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取视频数据失败");
      setAllVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVideos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadVideos]);

  const filteredVideos = useMemo(() => {
    const byDate = filterVideosByDateRange(allVideos, dateRange);
    const bySearch = filterVideosBySearch(byDate, searchQuery);
    return sortVideos(bySearch, "views");
  }, [allVideos, dateRange, searchQuery]);

  const qualityVideos = useMemo(() => enrichVideosWithQuality(filteredVideos), [filteredVideos]);

  const displayVideos = useMemo(() => {
    if (tierFilter === "all") return qualityVideos;
    return qualityVideos.filter((video) => video.qualityTier === tierFilter);
  }, [qualityVideos, tierFilter]);

  const stats = useMemo(() => buildContentStats(filteredVideos), [filteredVideos]);
  const tagStats = useMemo(() => buildTagStats(filteredVideos), [filteredVideos]);
  const qualitySummary = useMemo(() => buildQualitySummary(qualityVideos), [qualityVideos]);
  const qualityTrends = useMemo(() => buildQualityTrends(qualityVideos), [qualityVideos]);

  const topPerforming = useMemo(() => pickTopVideos(filteredVideos, "performanceScore", 5), [filteredVideos]);
  const mostViewed = useMemo(() => pickTopVideos(filteredVideos, "viewsCount", 5), [filteredVideos]);
  const highestEngagement = useMemo(() => pickTopVideos(filteredVideos, "engagementRate", 5), [filteredVideos]);
  const mostShared = useMemo(() => pickTopVideos(filteredVideos, "sharesCount", 5), [filteredVideos]);

  const viralVideos = useMemo(() => pickVideosByTier(qualityVideos, "viral", 5), [qualityVideos]);
  const highPotentialVideos = useMemo(() => pickVideosByTier(qualityVideos, "high-potential", 5), [qualityVideos]);
  const weakVideos = useMemo(() => pickVideosByTier(qualityVideos, "weak", 5), [qualityVideos]);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <LineChart className="size-4" />
              Content Analytics
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">内容分析</h1>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              汇总全部追踪视频的表现数据，含互动/传播/留存/Hook 质量评分、分层与趋势图表。
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-3xl">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索视频标题、账号或标签"
                className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)] focus:bg-[var(--card)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/30 p-1">
                {dateRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDateRange(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition duration-200 ${
                      dateRange === option.value
                        ? "bg-[var(--space-cadet)] text-[var(--eggshell)] shadow-sm"
                        : "text-[var(--cadet-gray)] hover:bg-[var(--card)] hover:text-[var(--space-cadet)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "视频总数", value: String(stats.videoCount), icon: CirclePlay, accent: "from-[color-mix(in_srgb,var(--jet)_12%,transparent)] to-transparent" },
              { label: "总播放量", value: formatCompact(stats.totalViews), icon: Eye, accent: "from-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] to-transparent" },
              { label: "总点赞", value: formatCompact(stats.totalLikes), icon: ThumbsUp, accent: "from-[color-mix(in_srgb,var(--space-cadet)_14%,transparent)] to-transparent" },
              { label: "总评论", value: formatCompact(stats.totalComments), icon: MessageCircle, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)] to-transparent" },
              { label: "总分享", value: formatCompact(stats.totalShares), icon: Share2, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)] to-transparent" },
              { label: "平均互动率", value: `${stats.avgEngagement.toFixed(2)}%`, icon: TrendingUp, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)] to-transparent" },
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
              </article>
            ))}
          </div>

          <QualityAnalysisPanel
            summary={qualitySummary}
            trends={qualityTrends}
            tierFilter={tierFilter}
            onTierFilterChange={setTierFilter}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <VideoRankRow
              title="Viral"
              subtitle="传播得分与播放处于头部"
              videos={viralVideos}
              metricLabel="Viral"
              metricValue={(video) => String("viralScore" in video ? video.viralScore : 0)}
            />
            <VideoRankRow
              title="High Potential"
              subtitle="互动与 Hook 强、具备增长空间"
              videos={highPotentialVideos}
              metricLabel="Engagement"
              metricValue={(video) => String("engagementScore" in video ? video.engagementScore : 0)}
            />
            <VideoRankRow
              title="Weak Performance"
              subtitle="需优化开头或互动结构"
              videos={weakVideos}
              metricLabel="Hook"
              metricValue={(video) => String("hookStrength" in video ? video.hookStrength : 0)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <VideoRankRow
              title="Top Performing Videos"
              subtitle="综合播放、互动与分享加权评分"
              videos={topPerforming}
              metricLabel="综合分"
              metricValue={(video) => formatCompact(Math.round(video.performanceScore))}
            />
            <VideoRankRow
              title="Most Viewed"
              subtitle="播放量最高的视频"
              videos={mostViewed}
              metricLabel="播放量"
              metricValue={(video) => video.viewsLabel}
            />
            <VideoRankRow
              title="Highest Engagement"
              subtitle="互动率最高的视频"
              videos={highestEngagement}
              metricLabel="互动率"
              metricValue={(video) => video.engagementLabel}
            />
            <VideoRankRow
              title="Most Shared"
              subtitle="分享次数最多的视频"
              videos={mostShared}
              metricLabel="分享数"
              metricValue={(video) => video.sharesLabel}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <VideoDataTable videos={displayVideos} />
            <div className="space-y-4">
              <TagAnalysisPanel tags={tagStats} />
              <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--space-cadet)]">
                  <Hash className="size-4 text-[var(--carolina-blue)]" />
                  标签概览
                </div>
                <p className="mt-2 text-3xl font-semibold text-[var(--space-cadet)]">{stats.uniqueTags}</p>
                <p className="mt-1 text-xs text-[var(--cadet-gray)]">当前筛选范围内的独立标签数</p>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
