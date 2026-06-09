"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact } from "@/lib/accounts";

export type ViewsSeriesPoint = { date: string; views: number };

const COLORS = {
  bg: "#2D3350",
  line: "#70B0CC",
  grid: "#8795A5",
  text: "#E9E3CE",
};

type RangeKey = "7" | "30" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7", label: "7天", days: 7 },
  { key: "30", label: "30天", days: 30 },
  { key: "all", label: "全部", days: null },
];

function formatAxisDate(value: string) {
  const [, month, day] = value.split("-");
  if (!month || !day) return value;
  return `${month}-${day}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);

  return (
    <div
      style={{ backgroundColor: "rgba(20,24,40,0.95)", borderColor: COLORS.grid, color: COLORS.text }}
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
    >
      <p className="opacity-70">{label}</p>
      <p className="mt-0.5 font-semibold" style={{ color: COLORS.line }}>
        {formatCompact(value)} 播放
      </p>
    </div>
  );
}

export function ViewsOverTimeChart({ data }: { data: ViewsSeriesPoint[] }) {
  const [range, setRange] = useState<RangeKey>("30");

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );

  const visibleData = useMemo(() => {
    const days = RANGES.find((item) => item.key === range)?.days ?? null;
    if (!days) return sorted;
    return sorted.slice(-days);
  }, [sorted, range]);

  const totalViews = sorted.length ? sorted[sorted.length - 1].views : 0;

  const weekGrowth = useMemo(() => {
    if (sorted.length < 2) return null;
    const latest = sorted[sorted.length - 1].views;
    // Compare against the point ~7 days back (or the earliest available).
    const baselineIndex = Math.max(0, sorted.length - 8);
    const baseline = sorted[baselineIndex].views;
    if (baseline <= 0) return null;
    return ((latest - baseline) / baseline) * 100;
  }, [sorted]);

  return (
    <section
      style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 20 }}
      className="overflow-hidden p-5 shadow-[0_8px_30px_rgba(20,24,40,0.25)] sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>
            播放量趋势
          </h2>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em]" style={{ color: COLORS.grid }}>
            Views Over Time
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div>
            <p className="text-[11px]" style={{ color: COLORS.grid }}>
              总播放量
            </p>
            <p className="text-2xl font-semibold" style={{ color: COLORS.text }}>
              {formatCompact(totalViews)}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: COLORS.grid }}>
              近 7 日增长
            </p>
            <p
              className="inline-flex items-center gap-1 text-lg font-semibold"
              style={{ color: weekGrowth === null ? COLORS.grid : weekGrowth >= 0 ? COLORS.line : "#E2786B" }}
            >
              <TrendingUp className="size-4" />
              {weekGrowth === null
                ? "N/A"
                : `${weekGrowth >= 0 ? "+" : ""}${weekGrowth.toFixed(1)}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 h-[280px] w-full">
        {visibleData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke={COLORS.grid}
                strokeOpacity={0.25}
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: COLORS.text, fontSize: 11, opacity: 0.7 }}
                tickLine={false}
                axisLine={{ stroke: COLORS.grid, strokeOpacity: 0.4 }}
                minTickGap={24}
              />
              <YAxis
                width={48}
                tickFormatter={(value: number) => formatCompact(value)}
                tick={{ fill: COLORS.text, fontSize: 11, opacity: 0.7 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: COLORS.grid, strokeOpacity: 0.4 }} />
              <Line
                type="monotone"
                dataKey="views"
                stroke={COLORS.line}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLORS.line, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: COLORS.text, stroke: COLORS.line, strokeWidth: 2 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                暂无足够的历史数据
              </p>
              <p className="mt-1 text-xs" style={{ color: COLORS.grid }}>
                系统每日会自动记录播放量快照，明天起即可显示趋势。
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {RANGES.map((item) => {
          const active = range === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              style={
                active
                  ? { backgroundColor: COLORS.line, color: COLORS.bg }
                  : { color: COLORS.text, borderColor: COLORS.grid }
              }
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                active ? "" : "border bg-white/5 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
