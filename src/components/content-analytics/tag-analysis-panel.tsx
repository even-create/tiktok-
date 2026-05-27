import { Hash } from "lucide-react";
import { formatCompact } from "@/lib/accounts";
import type { TagStat } from "@/lib/content-analytics";

type TagAnalysisPanelProps = {
  tags: TagStat[];
};

export function TagAnalysisPanel({ tags }: TagAnalysisPanelProps) {
  const maxCount = Math.max(...tags.map((tag) => tag.count), 1);

  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Hash className="size-4 text-[var(--carolina-blue)]" />
        <h2 className="text-base font-semibold text-[var(--space-cadet)]">视频标签分析</h2>
      </div>
      <p className="mt-1 text-xs text-[var(--cadet-gray)]">从标题中提取 #标签 与关键词，统计出现频次与表现。</p>

      {tags.length ? (
        <div className="mt-4 space-y-3">
          {tags.map((tag) => (
            <div key={tag.tag} className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-[var(--space-cadet)]">{tag.tag}</p>
                <span className="shrink-0 text-xs text-[var(--cadet-gray)]">{tag.count} 条视频</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--carolina-blue)] to-[var(--space-cadet)] transition-all duration-500"
                  style={{ width: `${(tag.count / maxCount) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--cadet-gray)]">
                <span>总播放 {formatCompact(tag.totalViews)}</span>
                <span>平均互动率 {tag.avgEngagement.toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] px-4 py-8 text-center text-sm text-[var(--cadet-gray)]">
          暂无可用标签数据
        </p>
      )}
    </section>
  );
}
