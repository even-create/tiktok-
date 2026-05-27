"use client";

import { useId } from "react";
import type { TrendPoint } from "@/lib/accounts";

type MiniSparklineProps = {
  points: TrendPoint[];
  className?: string;
  emptyLabel?: string;
};

export function MiniSparkline({
  points,
  className = "",
  emptyLabel = "暂无趋势数据",
}: MiniSparklineProps) {
  const gradientId = useId().replace(/:/g, "");

  if (!points.length) {
    return (
      <div
        className={`flex h-14 items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/30 text-[11px] text-[var(--cadet-gray)] ${className}`}
      >
        {emptyLabel}
      </div>
    );
  }

  const width = 240;
  const height = 56;
  const padding = { top: 8, right: 8, bottom: 8, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + innerWidth / 2
        : padding.left + (index / (points.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (point.value / maxValue) * innerHeight;
    return { x, y };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates.at(-1)?.x ?? padding.left} ${padding.top + innerHeight} L ${coordinates[0]?.x ?? padding.left} ${padding.top + innerHeight} Z`;

  return (
    <div className={`h-14 w-full ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="播放量增长趋势"
      >
        <defs>
          <linearGradient id={`sparkFill-${gradientId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#70B0CC" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2D3350" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`sparkLine-${gradientId}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#70B0CC" />
            <stop offset="100%" stopColor="#2D3350" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#sparkFill-${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#sparkLine-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coordinates.length > 0 ? (
          <circle
            cx={coordinates.at(-1)?.x ?? 0}
            cy={coordinates.at(-1)?.y ?? 0}
            r="3"
            fill="#fff"
            stroke="#70B0CC"
            strokeWidth="1.5"
          />
        ) : null}
      </svg>
    </div>
  );
}
