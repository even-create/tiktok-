"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BrainCircuit,
  Clock3,
  Flame,
  Hash,
  Lightbulb,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { InsightSection } from "@/components/ai-insights/insight-section";
import { formatCompact } from "@/lib/accounts";
import type { AiInsightsPayload } from "@/lib/ai-insights";

export default function AiInsightsPage() {
  const [insights, setInsights] = useState<AiInsightsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [modelName, setModelName] = useState("gpt-4o-mini");

  const generateInsights = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setWarningMessage("");

    try {
      const response = await fetch("/api/ai-insights", { method: "POST" });
      const payload = (await response.json()) as {
        insights?: AiInsightsPayload;
        warning?: string;
        error?: string;
        model?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "AI 分析失败");
      }

      if (!payload.insights) {
        throw new Error("未返回分析结果");
      }

      setInsights(payload.insights);
      if (payload.model) {
        setModelName(payload.model);
      }
      if (payload.warning) {
        setWarningMessage(payload.warning);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 分析失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void generateInsights();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [generateInsights]);

  const sourceLabel =
    insights?.source === "openai" ? "OpenAI 生成" : insights?.source === "heuristic" ? "本地规则生成" : "";

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <BrainCircuit className="size-4" />
              AI Insights
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">AI 运营洞察</h1>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              基于现有 TikTok 追踪数据，由 OpenAI 生成发布时间、标签、内容类型与增长建议。
            </p>
          </div>

          <button
            type="button"
            onClick={() => void generateInsights()}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] px-5 text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)] disabled:opacity-70"
          >
            {isLoading ? <Clock3 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {isLoading ? "分析中..." : "重新生成"}
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {warningMessage ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {warningMessage}
          </p>
        ) : null}
      </header>

      {isLoading && !insights ? (
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]" />
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
              />
            ))}
          </div>
        </div>
      ) : insights ? (
        <>
          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] via-[var(--card)] to-[var(--card)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--space-cadet)]">
                <Sparkles className="size-4 text-[var(--carolina-blue)]" />
                AI Summary
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--cadet-gray)]">
                {sourceLabel ? (
                  <span className="rounded-full bg-[var(--eggshell)] px-2.5 py-1">{sourceLabel}</span>
                ) : null}
                <span className="rounded-full bg-[var(--eggshell)] px-2.5 py-1">{modelName}</span>
                <span className="inline-flex items-center gap-1">
                  <Wand2 className="size-3.5" />
                  {new Intl.DateTimeFormat("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(insights.generatedAt))}
                </span>
              </div>
            </div>
            <p className="mt-4 text-base leading-relaxed text-[var(--space-cadet)]">{insights.summary}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightSection
              title="Best Posting Time"
              subtitle="按发布时段统计播放与互动表现"
              icon={<Clock3 className="size-5" />}
            >
              <p className="text-sm leading-relaxed text-[var(--jet)]">{insights.bestPostingTime.recommendation}</p>
              <div className="mt-4 space-y-2">
                {insights.bestPostingTime.slots.map((slot) => (
                  <div
                    key={`${slot.label}-${slot.hour}`}
                    className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/35 px-3 py-2"
                  >
                    <span className="w-14 shrink-0 text-sm font-semibold text-[var(--space-cadet)]">{slot.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--carolina-blue)] to-[var(--space-cadet)]"
                        style={{
                          width: `${Math.min(100, (slot.score / Math.max(insights.bestPostingTime.slots[0]?.score ?? 1, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-[var(--cadet-gray)]">{slot.videoCount} 条</span>
                  </div>
                ))}
              </div>
            </InsightSection>

            <InsightSection title="Best Hashtags" subtitle="高互动标签推荐" icon={<Hash className="size-5" />}>
              <div className="flex flex-wrap gap-2">
                {insights.bestHashtags.map((tag) => (
                  <div
                    key={tag.tag}
                    className="rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_30%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_8%,white)] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-[var(--space-cadet)]">{tag.tag}</p>
                    <p className="mt-1 text-xs text-[var(--cadet-gray)]">
                      {tag.videoCount} 条 · 互动 {tag.avgEngagement.toFixed(2)}%
                    </p>
                    {tag.reason ? <p className="mt-1 text-[10px] text-[var(--cadet-gray)]">{tag.reason}</p> : null}
                  </div>
                ))}
              </div>
            </InsightSection>

            <InsightSection
              title="Top Performing Content Type"
              subtitle="按标题语义分类的内容表现"
              icon={<Target className="size-5" />}
            >
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/35 p-4">
                <p className="text-lg font-semibold text-[var(--space-cadet)]">{insights.topContentType.label}</p>
                <p className="mt-2 text-sm text-[var(--cadet-gray)]">
                  {insights.topContentType.description ??
                    `${insights.topContentType.videoCount} 条视频，平均播放 ${formatCompact(insights.topContentType.avgViews)}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--cadet-gray)]">
                  <span>平均播放 {formatCompact(insights.topContentType.avgViews)}</span>
                  <span>平均互动 {insights.topContentType.avgEngagement.toFixed(2)}%</span>
                </div>
              </div>
              {insights.topContentType.examples.length ? (
                <ul className="mt-3 space-y-1 text-sm text-[var(--jet)]">
                  {insights.topContentType.examples.map((example) => (
                    <li key={example} className="truncate">
                      · {example}
                    </li>
                  ))}
                </ul>
              ) : null}
            </InsightSection>

            <InsightSection title="Engagement Insights" subtitle="互动表现关键发现" icon={<TrendingUp className="size-5" />}>
              <ul className="space-y-2">
                {insights.engagementInsights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/35 px-3 py-2 text-sm text-[var(--jet)]"
                  >
                    <TrendingUp className="mt-0.5 size-4 shrink-0 text-[var(--carolina-blue)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </InsightSection>
          </div>

          <InsightSection title="内容优化建议" subtitle="可执行的创作与发布优化" icon={<Lightbulb className="size-5" />}>
            <ul className="grid gap-2 md:grid-cols-2">
              {insights.contentOptimization.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_6%,white)] px-3 py-2.5 text-sm text-[var(--space-cadet)]"
                >
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--carolina-blue)]" />
                  {item}
                </li>
              ))}
            </ul>
          </InsightSection>

          <InsightSection title="爆款视频分析" subtitle="高播放视频的成功要素" icon={<Flame className="size-5" />}>
            {insights.viralVideoAnalysis.length ? (
              <div className="space-y-3">
                {insights.viralVideoAnalysis.map((video) => (
                  <article
                    key={`${video.accountHandle}-${video.title}`}
                    className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/30 p-4 transition hover:border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--space-cadet)]">{video.title}</p>
                        <p className="text-xs text-[var(--cadet-gray)]">@{video.accountHandle}</p>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="rounded-full bg-[var(--card)] px-2 py-1 text-[var(--space-cadet)]">
                          {video.viewsLabel} 播放
                        </span>
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] px-2 py-1 text-[var(--space-cadet)]">
                          {video.engagementLabel}
                        </span>
                      </div>
                    </div>
                    {video.reason ? (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--jet)]">{video.reason}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--cadet-gray)]">当前数据集中暂无达到爆款阈值的视频。</p>
            )}
          </InsightSection>

          <InsightSection title="增长建议" subtitle="账号与内容增长策略" icon={<Rocket className="size-5" />}>
            <ul className="space-y-2">
              {insights.growthRecommendations.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-gradient-to-r from-[var(--eggshell)]/50 to-transparent px-3 py-2.5 text-sm text-[var(--jet)]"
                >
                  <Rocket className="mt-0.5 size-4 shrink-0 text-[var(--space-cadet)]" />
                  {item}
                </li>
              ))}
            </ul>
          </InsightSection>
        </>
      ) : null}
    </div>
  );
}
