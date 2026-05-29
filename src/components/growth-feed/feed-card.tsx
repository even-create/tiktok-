import { ArrowUpRight, CalendarDays, Tag } from "lucide-react";
import type { GrowthFeedItem } from "@/lib/growth-feed/types";

const sourceStyles: Record<GrowthFeedItem["source"], string> = {
  reddit: "bg-[#ff4500]/10 text-[#c43700] dark:text-[#ff8a65]",
  medium: "bg-[#12100e]/10 text-[#12100e] dark:text-[#e8e6e3]",
  youtube: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "tiktok-blog": "bg-[var(--space-cadet)]/10 text-[var(--space-cadet)] dark:text-[var(--carolina-blue)]",
};

type FeedCardProps = {
  item: GrowthFeedItem;
};

export function FeedCard({ item }: FeedCardProps) {
  const publishedLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(item.publishedAt));

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)] hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sourceStyles[item.source]}`}>
          {item.sourceLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--eggshell)]/50 px-2.5 py-1 text-[11px] font-medium text-[var(--cadet-gray)]">
          <Tag className="size-3" />
          {item.category}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--carolina-blue)]">
        {item.title}
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--cadet-gray)]">{item.excerpt}</p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] pt-3">
        <span className="inline-flex items-center gap-1 text-xs text-[var(--cadet-gray)]">
          <CalendarDays className="size-3.5" />
          {publishedLabel}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--space-cadet)] px-3 py-1.5 text-xs font-semibold text-[var(--eggshell)] transition hover:opacity-90"
        >
          阅读原文
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </article>
  );
}
