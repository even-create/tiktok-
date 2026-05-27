import { LineChart } from "lucide-react";

export default function ContentAnalyticsPage() {
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <LineChart className="size-4" />
          Content Analytics
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">内容分析</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">按视频维度分析表现、互动率、内容结构（占位页）。</p>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-sm text-[var(--cadet-gray)]">
          即将支持：视频分层（爆款/长尾）、互动贡献拆分、发布时间段效果、内容标签对比等。
        </p>
      </section>
    </div>
  );
}

