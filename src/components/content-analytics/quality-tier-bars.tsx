import type { QualityTrendSeries } from "@/lib/content-quality";

type QualityTierBarsProps = {
  bars: QualityTrendSeries["tierBars"];
};

export function QualityTierBars({ bars }: QualityTierBarsProps) {
  const max = Math.max(...bars.map((bar) => bar.viral + bar.highPotential + bar.weak), 1);

  return (
    <div className="space-y-3">
      {bars.length ? (
        bars.map((bar) => {
          const total = bar.viral + bar.highPotential + bar.weak;
          const viralWidth = total ? (bar.viral / max) * 100 : 0;
          const highWidth = total ? (bar.highPotential / max) * 100 : 0;
          const weakWidth = total ? (bar.weak / max) * 100 : 0;

          return (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-[var(--cadet-gray)]">{bar.label}</span>
                <span className="font-medium text-[var(--foreground)]">{total} 条</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)]">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${viralWidth}%` }} title={`Viral ${bar.viral}`} />
                <div className="h-full bg-[var(--carolina-blue)] transition-all" style={{ width: `${highWidth}%` }} title={`High Potential ${bar.highPotential}`} />
                <div className="h-full bg-rose-400 transition-all" style={{ width: `${weakWidth}%` }} title={`Weak ${bar.weak}`} />
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-[var(--cadet-gray)]">暂无按周分类数据</p>
      )}

      <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-[var(--cadet-gray)]">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" />
          Viral
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[var(--carolina-blue)]" />
          High Potential
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-rose-400" />
          Weak Performance
        </span>
      </div>
    </div>
  );
}
