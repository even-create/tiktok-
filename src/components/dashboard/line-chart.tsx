"use client";

import { useId } from "react";

export type LineChartPoint = {
  label: string;
  value: number;
};

type LineChartProps = {
  title: string;
  subtitle?: string;
  points: LineChartPoint[];
  className?: string;
  emptyLabel?: string;
};

export function LineChart({ title, subtitle, points, className = "", emptyLabel = "暂无趋势数据" }: LineChartProps) {
  const chartId = useId().replace(/:/g, "");
  const width = 640;
  const height = 220;
  const padding = { top: 24, right: 24, bottom: 36, left: 24 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + innerWidth / 2
        : padding.left + (index / (points.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (point.value / maxValue) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates.at(-1)?.x ?? padding.left} ${padding.top + innerHeight} L ${coordinates[0]?.x ?? padding.left} ${padding.top + innerHeight} Z`;

  return (
    <section
      className={`dashboard-split-panel group flex min-h-0 w-full flex-col rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm transition duration-300 hover:shadow-lg ${className}`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--space-cadet)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-[var(--cadet-gray)]">{subtitle}</p> : null}
        </div>
        <div className="rounded-full bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--eggshell)]">
          Trend
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {points.length ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-full min-h-[12.5rem] w-full flex-1"
            role="img"
            aria-label={title}
          >
            <defs>
              <linearGradient id={`chartFill-${chartId}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#70B0CC" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2D3350" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id={`chartLine-${chartId}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#70B0CC" />
                <stop offset="100%" stopColor="#2D3350" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((step) => {
              const y = padding.top + (step / 3) * innerHeight;
              return (
                <line
                  key={step}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(135, 149, 165, 0.25)"
                  strokeDasharray="4 6"
                />
              );
            })}

            <path d={areaPath} fill={`url(#chartFill-${chartId})`} />
            <path d={linePath} fill="none" stroke={`url(#chartLine-${chartId})`} strokeWidth="3" strokeLinecap="round" />

            {coordinates.map((point) => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#70B0CC" strokeWidth="2" />
                <text x={point.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#8795A5">
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] px-4 py-10 text-center text-sm text-[var(--cadet-gray)]">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}
