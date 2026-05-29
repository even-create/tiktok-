import { Anchor, Clock3, Layers, Megaphone, Sparkles } from "lucide-react";
import type { GrowthFeedAiSummary } from "@/lib/growth-feed/types";

type AiSummaryPanelProps = {
  summary: GrowthFeedAiSummary;
  model?: string;
  sourceLabel: string;
};

const strategyCards = [
  { key: "hookStrategy" as const, title: "Hook Strategy", icon: Anchor, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)]" },
  { key: "retentionStrategy" as const, title: "Retention Strategy", icon: Clock3, accent: "from-[color-mix(in_srgb,var(--space-cadet)_14%,transparent)]" },
  { key: "viralStructure" as const, title: "Viral Structure", icon: Layers, accent: "from-[color-mix(in_srgb,var(--jet)_12%,transparent)]" },
  { key: "postingStrategy" as const, title: "Posting Strategy", icon: Megaphone, accent: "from-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)]" },
];

export function AiSummaryPanel({ summary, model, sourceLabel }: AiSummaryPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--carolina-blue)_14%,white)] via-[var(--card)] to-[var(--card)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)]">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--carolina-blue)]">AI Summary</p>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">增长策略速览</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cadet-gray)]">
          <span className="rounded-full bg-[var(--eggshell)]/60 px-2.5 py-1">{sourceLabel}</span>
          {model ? <span className="rounded-full bg-[var(--eggshell)]/60 px-2.5 py-1">{model}</span> : null}
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {strategyCards.map((card) => (
          <article
            key={card.key}
            className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:shadow-md"
          >
            <div className={`absolute inset-x-0 top-0 h-14 bg-gradient-to-b ${card.accent} to-transparent`} />
            <div className="relative flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <card.icon className="size-4 text-[var(--carolina-blue)]" />
              {card.title}
            </div>
            <p className="relative mt-3 text-sm leading-relaxed text-[var(--cadet-gray)]">{summary[card.key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
