import { BrainCircuit } from "lucide-react";

export default function AiInsightsPage() {
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <BrainCircuit className="size-4" />
          AI Insights
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">AI 洞察</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">AI 解读账号与内容表现、输出行动建议（占位页）。</p>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-sm text-[var(--cadet-gray)]">
          即将支持：自动复盘摘要、内容建议、标题/脚本提示、增长机会提醒等。
        </p>
      </section>
    </div>
  );
}

