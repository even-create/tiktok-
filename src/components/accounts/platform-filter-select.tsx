"use client";

import { Layers } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/lib/providers/platform";

export type PlatformFilterValue = "all" | Platform;

type PlatformFilterSelectProps = {
  value: PlatformFilterValue;
  onChange: (value: PlatformFilterValue) => void;
  className?: string;
  showLabel?: boolean;
  /** Match dashboard feed filter row (账号/平台/发布时间). */
  variant?: "default" | "feed";
};

export function PlatformFilterSelect({
  value,
  onChange,
  className = "",
  showLabel = false,
  variant = "default",
}: PlatformFilterSelectProps) {
  const isFeed = variant === "feed";
  const select = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as PlatformFilterValue)}
      className={
        isFeed
          ? "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)]"
          : "h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-sm text-[var(--space-cadet)] outline-none transition focus:border-[var(--carolina-blue)] focus:bg-[var(--card)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
      }
    >
      <option value="all">全部平台</option>
      {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );

  if (!showLabel) return select;

  return (
    <div
      className={`flex flex-col gap-1.5 ${isFeed ? "min-w-0 flex-1 sm:max-w-xs" : ""} ${className}`.trim()}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
        <Layers className="size-3" />
        平台
      </span>
      {select}
    </div>
  );
}
