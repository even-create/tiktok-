import { Sparkles } from "lucide-react";

export default function TrendsPage() {
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <Sparkles className="size-4" />
          Trends
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">趋势</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">查看账号与内容的趋势变化、波动原因（占位页）。</p>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-sm text-[var(--cadet-gray)]">
          即将支持：播放量趋势分解、增长拐点、同步前后对比、账号间对齐与对比分析等。
        </p>
      </section>
    </div>
  );
}

