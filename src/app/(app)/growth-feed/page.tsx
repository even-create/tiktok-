"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Filter,
  Newspaper,
  Rss,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AiSummaryPanel } from "@/components/growth-feed/ai-summary-panel";
import { FeedCard } from "@/components/growth-feed/feed-card";
import type { GrowthFeedCategory, GrowthFeedResponse, GrowthFeedSource } from "@/lib/growth-feed/types";

const sourceFilters: Array<{ value: "all" | GrowthFeedSource; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "reddit", label: "Reddit" },
  { value: "medium", label: "Medium" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok-blog", label: "TikTok Blog" },
];

const categoryFilters: Array<{ value: "all" | GrowthFeedCategory; label: string }> = [
  { value: "all", label: "全部分类" },
  { value: "Hook Strategy", label: "Hook" },
  { value: "Retention", label: "Retention" },
  { value: "Viral Structure", label: "Viral" },
  { value: "Posting Strategy", label: "Posting" },
  { value: "Algorithm", label: "Algorithm" },
  { value: "Growth Tips", label: "Tips" },
];

export default function GrowthFeedPage() {
  const [data, setData] = useState<GrowthFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | GrowthFeedSource>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | GrowthFeedCategory>("all");

  const loadFeed = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/growth-feed${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as GrowthFeedResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "加载 Growth Feed 失败");
      }

      setData(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载 Growth Feed 失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFeed();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFeed]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      const sourceMatch = sourceFilter === "all" || item.source === sourceFilter;
      const categoryMatch = categoryFilter === "all" || item.category === categoryFilter;
      return sourceMatch && categoryMatch;
    });
  }, [data?.items, sourceFilter, categoryFilter]);

  const summarySourceLabel =
    data?.summary.source === "gemini" ? "Gemini 生成" : data?.summary.source === "heuristic" ? "本地规则生成" : "";

  const totalSources = data
    ? Object.values(data.sourceStats).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-[color-mix(in_srgb,var(--space-cadet)_10%,transparent)] blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Rss className="size-4" />
              AI Growth Feed
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">增长情报流</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--cadet-gray)]">
              聚合 Reddit、Medium、YouTube 与 TikTok Blog 的免费增长内容，仅展示短摘要与原文链接，由 AI 提炼 Hook、留存、爆款结构与发布策略。
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadFeed(true)}
            disabled={isLoading}
            className="relative inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] px-5 text-sm font-semibold text-[var(--eggshell)] transition hover:opacity-90 disabled:opacity-70"
          >
            {isLoading ? <Clock3 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {isLoading ? "聚合中..." : "刷新情报"}
          </button>
        </div>

        {errorMessage ? (
          <p className="relative mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {data?.warning ? (
          <p className="relative mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {data.warning}
          </p>
        ) : null}

        {data ? (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {[
              { label: "条目", value: String(data.items.length), icon: Newspaper },
              { label: "来源命中", value: String(totalSources), icon: BookOpen },
              { label: "AI", value: summarySourceLabel || "—", icon: Sparkles },
            ].map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--eggshell)]/40 px-3 py-1.5 text-xs text-[var(--cadet-gray)]"
              >
                <stat.icon className="size-3.5" />
                <span className="font-medium text-[var(--foreground)]">{stat.value}</span>
                <span>{stat.label}</span>
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {isLoading && !data ? (
        <div className="space-y-4">
          <div className="h-52 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
              />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          <AiSummaryPanel summary={data.summary} model={data.model} sourceLabel={summarySourceLabel} />

          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cadet-gray)]">
                <Filter className="size-3.5" />
                筛选
              </span>
              <div className="flex flex-wrap gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--eggshell)]/30 p-1">
                {sourceFilters.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSourceFilter(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      sourceFilter === option.value
                        ? "bg-[var(--space-cadet)] text-[var(--eggshell)]"
                        : "text-[var(--cadet-gray)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--eggshell)]/30 p-1">
                {categoryFilters.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategoryFilter(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      categoryFilter === option.value
                        ? "bg-[color-mix(in_srgb,var(--carolina-blue)_18%,white)] text-[var(--foreground)]"
                        : "text-[var(--cadet-gray)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {filteredItems.length === 0 ? (
            <p className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)] p-8 text-center text-sm text-[var(--cadet-gray)]">
              当前筛选下暂无条目，请调整筛选或点击「刷新情报」重试聚合。
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
