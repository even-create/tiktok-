import type { FrequencyPoint } from "@/lib/trends";

type FrequencyBarsProps = {
  points: FrequencyPoint[];
  barLabel: string;
};

export function FrequencyBars({ points, barLabel }: FrequencyBarsProps) {
  const max = Math.max(...points.map((point) => point.count), 1);

  return (
    <div className="space-y-2">
      {points.length ? (
        points.map((point) => (
          <div key={point.label} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[10px] text-[var(--cadet-gray)]">{point.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--carolina-blue)] to-[var(--space-cadet)] transition-all duration-500"
                style={{ width: `${(point.count / max) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-medium text-[var(--space-cadet)]">
              {point.count} {barLabel}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm text-[var(--cadet-gray)]">当前时间范围内暂无数据</p>
      )}
    </div>
  );
}
