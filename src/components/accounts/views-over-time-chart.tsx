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
  bg: "#FFFFFF",
  line: "#70B0CC",
  grid: "#8795A5",
  text: "#2D3350",
  muted: "#8795A5",
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
      style={{ backgroundColor: "#FFFFFF", borderColor: COLORS.grid, color: COLORS.text }}
      className="rounded-xl border px-3 py-2 text-xs shadow-md"
    >
      <p className="opacity-60">{label}</p>
      <p className="mt-0.5 font-semibold" style={{ color: COLORS.line }}>
        {formatCompact(value)} 播放
      </p>
    </div>
  );
}

export function ViewsOverTimeChart({
  data,
  last30Views,
  maxDayViews,
}: {
  data: ViewsSeriesPoint[];
  last30Views: number;
  maxDayViews: number;
}) {
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

  return (
    <section
      style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 20 }}
      className="overflow-hidden border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] p-5 shadow-[0_6px_24px_rgba(45,51,80,0.08)] sm:p-6"
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
            <p className="text-[11px]" style={{ color: COLORS.muted }}>
              近 30 天视频总播放
            </p>
            <p className="text-2xl font-semibold" style={{ color: COLORS.text }}>
              {formatCompact(last30Views)}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: COLORS.muted }}>
              单日最高播放
            </p>
            <p
              className="inline-flex items-center gap-1 text-lg font-semibold"
              style={{ color: COLORS.line }}
            >
              <TrendingUp className="size-4" />
              {formatCompact(maxDayViews)}
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
                activeDot={{ r: 5, fill: "#FFFFFF", stroke: COLORS.line, strokeWidth: 2 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                暂无视频数据
              </p>
              <p className="mt-1 text-xs" style={{ color: COLORS.muted }}>
                同步该账号的视频后，将按发布日期展示每日发布视频的总播放量。
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
                  ? { backgroundColor: COLORS.line, color: "#FFFFFF" }
                  : { color: COLORS.muted }
              }
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? ""
                  : "border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--eggshell)]/40 hover:bg-[var(--eggshell)]/70"
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
