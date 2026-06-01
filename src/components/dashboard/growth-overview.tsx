"use client";

import { useMemo } from "react";
import {
  CirclePlay,
  Eye,
  Heart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { ApiAccount } from "@/lib/accounts";
import type { AccountSnapshotRow } from "@/lib/account-snapshots";
import { buildGrowthOverview, type GrowthOverviewMetric, type GrowthTrend } from "@/lib/growth-overview";

type GrowthOverviewProps = {
  apiAccounts: ApiAccount[];
  growthSnapshots: AccountSnapshotRow[];
  setupHint?: string | null;
  isLoading?: boolean;
};

const metricIcons: Record<string, typeof Users> = {
  followers: Users,
  views: Eye,
  likes: Heart,
  videos: Video,
  "active-accounts": CirclePlay,
  "avg-views": Sparkles,
};

const accentByMetric: Record<string, string> = {
  followers: "from-[color-mix(in_srgb,#10b981_28%,transparent)] to-transparent",
  views: "from-[color-mix(in_srgb,var(--carolina-blue)_30%,transparent)] to-transparent",
  likes: "from-[color-mix(in_srgb,#f43f5e_18%,transparent)] to-transparent",
  videos: "from-[color-mix(in_srgb,var(--space-cadet)_16%,transparent)] to-transparent",
  "active-accounts": "from-[color-mix(in_srgb,var(--jet)_14%,transparent)] to-transparent",
  "avg-views": "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)] to-transparent",
};

function trendClassName(trend: GrowthTrend) {
  if (trend === "up") return "text-emerald-600";
  if (trend === "down") return "text-rose-600";
  if (trend === "flat") return "text-[var(--cadet-gray)]";
  return "text-[var(--cadet-gray)]";
}

function valueClassName(metric: GrowthOverviewMetric) {
  if (metric.value === "N/A") return "text-[var(--cadet-gray)]";
  if (metric.valueTrend === "up") return "text-emerald-600";
  if (metric.valueTrend === "down") return "text-rose-600";
  if (metric.valueTrend === "flat") return "text-[var(--cadet-gray)]";
  return "text-[var(--space-cadet)]";
}

function CompareBadge({ metric }: { metric: GrowthOverviewMetric }) {
  if (!metric.compareLabel) {
    return <p className="mt-2 text-xs text-[var(--cadet-gray)]">对比昨日：N/A</p>;
  }

  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendClassName(metric.trend)}`}>
      {metric.trend === "up" ? <TrendingUp className="size-3.5" /> : null}
      {metric.trend === "down" ? <TrendingDown className="size-3.5" /> : null}
      {metric.compareLabel}
    </p>
  );
}

export function GrowthOverview({
  apiAccounts,
  growthSnapshots,
  setupHint = null,
  isLoading = false,
}: GrowthOverviewProps) {
  const overview = useMemo(
    () => buildGrowthOverview(apiAccounts, growthSnapshots),
    [apiAccounts, growthSnapshots],
  );

  const showSkeleton = isLoading && apiAccounts.length === 0;
  const metrics = overview.metrics;

  return (
    <section className="mt-2 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-[var(--card)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--carolina-blue)_12%,transparent)]">
      <div className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] px-4 py-4 text-[var(--eggshell)] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--carolina-blue)_80%,white)]">
              <Sparkles className="size-4" />
              Growth Overview
            </div>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">今日增长概览</h2>
            <p className="mt-1 text-sm text-white/75">基于每日快照对比 · 关注今天涨了多少</p>
          </div>
          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium">{overview.dateLabel}</span>
        </div>
      </div>

      {setupHint ? (
        <p className="border-b border-[color-mix(in_srgb,var(--carolina-blue)_20%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)] px-4 py-3 text-sm text-[var(--space-cadet)] sm:px-5">
          {setupHint}
        </p>
      ) : null}

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-3">
        {showSkeleton
          ? Array.from({ length: 6 }).map((_, index) => (
              <article
                key={index}
                className="animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/30 p-4"
              >
                <div className="h-4 w-24 rounded bg-[var(--cadet-gray)]/20" />
                <div className="mt-6 h-8 w-20 rounded bg-[var(--cadet-gray)]/25" />
                <div className="mt-3 h-3 w-28 rounded bg-[var(--cadet-gray)]/15" />
              </article>
            ))
          : metrics.map((metric) => {
              const Icon = metricIcons[metric.id] ?? Sparkles;
              const accent = accentByMetric[metric.id] ?? accentByMetric.followers;

              return (
                <article
                  key={metric.id}
                  className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)] hover:shadow-md"
                >
                  <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accent}`} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--carolina-blue)]">
                        {metric.titleEn}
                      </p>
                      <p className="mt-1 text-sm text-[var(--cadet-gray)]">{metric.titleZh}</p>
                    </div>
                    <Icon className="size-5 shrink-0 text-[var(--space-cadet)]" />
                  </div>
                  <p className={`relative mt-5 text-3xl font-semibold tracking-tight ${valueClassName(metric)}`}>
                    {metric.value}
                  </p>
                  {metric.id === "followers" || metric.id === "views" || metric.id === "likes" ? (
                    <CompareBadge metric={metric} />
                  ) : (
                    <p className="relative mt-2 text-xs text-[var(--cadet-gray)]">今日实时统计</p>
                  )}
                </article>
              );
            })}
      </div>
    </section>
  );
}
