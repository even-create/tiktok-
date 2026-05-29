import { Anchor, Clock3, Flame, Layers, Target, Zap } from "lucide-react";
import { LineChart } from "@/components/dashboard/line-chart";
import { QualityTierBars } from "@/components/content-analytics/quality-tier-bars";
import type { QualityAnalyticsSummary, QualityTier, QualityTrendSeries } from "@/lib/content-quality";
import { qualityTierStyles } from "@/lib/content-quality";

type QualityAnalysisPanelProps = {
  summary: QualityAnalyticsSummary;
  trends: QualityTrendSeries;
  tierFilter: "all" | QualityTier;
  onTierFilterChange: (tier: "all" | QualityTier) => void;
};

const scoreCards = [
  { key: "avgEngagementScore" as const, label: "Engagement Score", icon: Target },
  { key: "avgViralScore" as const, label: "Viral Score", icon: Flame },
  { key: "avgRetentionProxy" as const, label: "Retention Proxy", icon: Clock3 },
  { key: "avgHookStrength" as const, label: "Hook Strength", icon: Anchor },
];

const tierFilters: Array<{ value: "all" | QualityTier; label: string }> = [
  { value: "all", label: "全部" },
  { value: "viral", label: "Viral" },
  { value: "high-potential", label: "High Potential" },
  { value: "weak", label: "Weak Performance" },
];

export function QualityAnalysisPanel({
  summary,
  trends,
  tierFilter,
  onTierFilterChange,
}: QualityAnalysisPanelProps) {
  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--carolina-blue)_32%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] via-[var(--card)] to-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)]">
              <Zap className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--carolina-blue)]">
                Content Quality
              </p>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">内容质量分析</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--eggshell)]/30 p-1">
            {tierFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTierFilterChange(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tierFilter === option.value
                    ? "bg-[var(--space-cadet)] text-[var(--eggshell)]"
                    : "text-[var(--cadet-gray)] hover:text-[var(--foreground)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {scoreCards.map((card) => (
            <article
              key={card.key}
              className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--cadet-gray)]">{card.label}</p>
                <card.icon className="size-4 text-[var(--carolina-blue)]" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {Math.round(summary[card.key])}
              </p>
              <p className="mt-1 text-[10px] text-[var(--cadet-gray)]">0–100 分 · 相对账号池</p>
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { tier: "viral" as const, count: summary.tierCounts.viral },
              { tier: "high-potential" as const, count: summary.tierCounts["high-potential"] },
              { tier: "weak" as const, count: summary.tierCounts.weak },
            ] as const
          ).map((item) => (
            <span
              key={item.tier}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${qualityTierStyles[item.tier].badge}`}
            >
              <span className={`size-2 rounded-full ${qualityTierStyles[item.tier].dot}`} />
              {item.tier === "viral" ? "Viral" : item.tier === "high-potential" ? "High Potential" : "Weak Performance"}
              <span className="opacity-80">· {item.count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LineChart
          title="Engagement Score 趋势"
          subtitle="按发布周平均互动得分"
          points={trends.engagementPoints}
        />
        <LineChart title="Viral Score 趋势" subtitle="按发布周平均传播得分" points={trends.viralPoints} />
        <LineChart
          title="Retention Proxy 趋势"
          subtitle="完播率或互动留存代理指标"
          points={trends.retentionPoints}
        />
        <LineChart title="Hook Strength 趋势" subtitle="按发布周平均开头吸引力" points={trends.hookPoints} />
      </div>

      <article className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <Layers className="size-4 text-[var(--carolina-blue)]" />
          质量分层趋势（按周）
        </div>
        <p className="mt-1 text-xs text-[var(--cadet-gray)]">Viral / High Potential / Weak Performance 发布数量分布</p>
        <div className="mt-4">
          <QualityTierBars bars={trends.tierBars} />
        </div>
      </article>
    </section>
  );
}
