"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Flame,
  LineChart as LineChartIcon,
  RefreshCw,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { LineChart } from "@/components/dashboard/line-chart";
import { FrequencyBars } from "@/components/trends/frequency-bars";
import { TrendInsightCard } from "@/components/trends/trend-insight-card";
import { formatCompact, type ApiAccount } from "@/lib/accounts";
import { buildTrendsInsights, type TrendsRange } from "@/lib/trends";

const rangeOptions: Array<{ value: TrendsRange; label: string }> = [
  { value: "7d", label: "7 天" },
  { value: "30d", label: "30 天" },
  { value: "90d", label: "90 天" },
];

export default function TrendsPage() {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [range, setRange] = useState<TrendsRange>("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const payload = (await response.json()) as { accounts?: ApiAccount[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取趋势数据失败");
      }

      setAccounts(payload.accounts ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取趋势数据失败");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const insights = useMemo(() => buildTrendsInsights(accounts, range), [accounts, range]);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Sparkles className="size-4" />
              Trends
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">趋势分析</h1>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              观察粉丝、播放与互动走势，并洞察增长账号、爆款频率与发布节奏。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/30 p-1">
              {rangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
                    range === option.value
                      ? "bg-[var(--space-cadet)] text-[var(--eggshell)] shadow-sm"
                      : "text-[var(--cadet-gray)] hover:bg-[var(--card)] hover:text-[var(--space-cadet)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)] disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--carolina-blue)_10%,white)] to-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--space-cadet)]">
              <LineChartIcon className="size-4 text-[var(--carolina-blue)]" />
              趋势分析 Summary · {insights.rangeLabel}
            </div>
            <p className="mt-3 text-base leading-relaxed text-[var(--space-cadet)]">{insights.summary}</p>
            <ul className="mt-4 space-y-2">
              {insights.highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/40 px-3 py-2 text-sm text-[var(--jet)]"
                >
                  <TrendingUp className="mt-0.5 size-4 shrink-0 text-[var(--carolina-blue)]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "追踪粉丝总量", value: formatCompact(insights.stats.totalFollowers), icon: Users },
              { label: "期内发布视频", value: String(insights.stats.totalPosts), icon: Video },
              { label: "爆款视频数", value: String(insights.stats.viralCount), icon: Flame },
              { label: "播放增长", value: `${insights.stats.viewsGrowthPercent.toFixed(1)}%`, icon: Zap },
            ].map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--cadet-gray)]">{metric.label}</p>
                  <metric.icon className="size-5 text-[var(--space-cadet)]" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-[var(--space-cadet)]">{metric.value}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <LineChart
              title="Followers Growth"
              subtitle="基于内容播放节奏估算的粉丝增长曲线"
              points={insights.followersPoints}
              className="min-h-[280px]"
            />
            <LineChart
              title="Views Growth"
              subtitle="期内视频播放累计增长"
              points={insights.viewsPoints}
              className="min-h-[280px]"
            />
            <LineChart
              title="Engagement Trend"
              subtitle="各时间段视频平均互动率 (%)"
              points={insights.engagementPoints}
              className="min-h-[280px]"
              emptyLabel="暂无互动率趋势数据"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TrendInsightCard
              title="Fastest Growing Account"
              subtitle="比较时间范围后半段 vs 前半段的播放增速"
              icon={<Rocket className="size-5" />}
            >
              {insights.fastestGrowingAccount ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[var(--space-cadet)]">
                    {insights.fastestGrowingAccount.displayName}
                  </p>
                  <p className="text-sm text-[var(--cadet-gray)]">@{insights.fastestGrowingAccount.handle}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_15%,white)] px-3 py-1 text-sm font-semibold text-[var(--space-cadet)]">
                      +{insights.fastestGrowingAccount.growthPercent}%
                    </span>
                    <span className="rounded-full bg-[var(--eggshell)] px-3 py-1 text-sm text-[var(--cadet-gray)]">
                      播放增量 {insights.fastestGrowingAccount.viewsLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--cadet-gray)]">当前时间范围内暂无足够数据进行对比</p>
              )}
            </TrendInsightCard>

            <TrendInsightCard
              title="Viral Video Frequency"
              subtitle="高播放视频（Top 10% 且 ≥5万播放）出现频率"
              icon={<Flame className="size-5" />}
            >
              <FrequencyBars points={insights.viralFrequency} barLabel="条爆款" />
            </TrendInsightCard>

            <TrendInsightCard
              title="Posting Frequency"
              subtitle={range === "90d" ? "按周统计发布数量" : "按日统计发布数量"}
              icon={<Video className="size-5" />}
            >
              <FrequencyBars points={insights.postingFrequency} barLabel="条发布" />
              <p className="mt-3 text-xs text-[var(--cadet-gray)]">
                平均每周 {insights.stats.avgPostsPerWeek.toFixed(1)} 条
              </p>
            </TrendInsightCard>
          </div>
        </>
      )}
    </div>
  );
}
