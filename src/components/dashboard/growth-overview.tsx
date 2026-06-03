"use client";

import { useMemo } from "react";
import {
  BarChart3,
  Eye,
  Heart,
  Minus,
  TrendingDown,
  TrendingUp,
  Users,
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
};

const iconStyles: Record<string, string> = {
  followers: "bg-[color-mix(in_srgb,var(--space-cadet)_12%,white)] text-[var(--space-cadet)]",
  views: "bg-[color-mix(in_srgb,var(--carolina-blue)_18%,white)] text-[var(--carolina-blue)]",
  likes: "bg-[color-mix(in_srgb,#f43f5e_12%,white)] text-rose-500",
};

function valueClassName(metric: GrowthOverviewMetric) {
  if (metric.value === "N/A") return "text-[var(--cadet-gray)]";
  if (metric.valueTrend === "up") return "text-[var(--space-cadet)]";
  if (metric.valueTrend === "down") return "text-rose-600";
  return "text-[var(--space-cadet)]";
}

function compareTrendClass(trend: GrowthTrend) {
  if (trend === "up") return "text-[var(--carolina-blue)]";
  if (trend === "down") return "text-rose-500";
  return "text-[var(--cadet-gray)]";
}

function CompareRow({ metric }: { metric: GrowthOverviewMetric }) {
  const percent = metric.comparePercent ?? "—";

  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
      <span className="text-[var(--cadet-gray)]">较昨日</span>
      {metric.trend === "up" ? (
        <TrendingUp className={`size-3.5 ${compareTrendClass(metric.trend)}`} />
      ) : metric.trend === "down" ? (
        <TrendingDown className={`size-3.5 ${compareTrendClass(metric.trend)}`} />
      ) : (
        <Minus className="size-3.5 text-[var(--cadet-gray)]" />
      )}
      <span className={`font-semibold ${compareTrendClass(metric.trend)}`}>{percent}</span>
    </div>
  );
}

function GrowthStatCard({ metric }: { metric: GrowthOverviewMetric }) {
  const Icon = metricIcons[metric.id] ?? BarChart3;
  const iconStyle = iconStyles[metric.id] ?? iconStyles.followers;

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-200 hover:border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <div className={`grid size-9 shrink-0 place-items-center rounded-full ${iconStyle}`}>
          <Icon className="size-4" strokeWidth={2.25} />
        </div>
        <p className="truncate text-sm font-medium text-[var(--cadet-gray)]">{metric.titleZh}</p>
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${valueClassName(metric)}`}>{metric.value}</p>

      <CompareRow metric={metric} />
    </article>
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
    <section className="mt-2 rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--space-cadet)] text-[var(--eggshell)] shadow-sm">
          <BarChart3 className="size-5" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--space-cadet)] sm:text-xl">增长概览</h2>
      </div>

      {setupHint ? (
        <p className="mt-3 rounded-lg bg-[color-mix(in_srgb,var(--carolina-blue)_8%,white)] px-3 py-2 text-xs leading-relaxed text-[var(--cadet-gray)] sm:text-sm">
          {setupHint}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {showSkeleton
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] bg-[var(--eggshell)]/30 p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-full bg-[var(--cadet-gray)]/15" />
                  <div className="h-3 w-20 rounded bg-[var(--cadet-gray)]/15" />
                </div>
                <div className="mt-4 h-7 w-16 rounded bg-[var(--cadet-gray)]/20" />
                <div className="mt-2 h-3 w-14 rounded bg-[var(--cadet-gray)]/10" />
              </div>
            ))
          : metrics.map((metric) => <GrowthStatCard key={metric.id} metric={metric} />)}
      </div>
    </section>
  );
}
