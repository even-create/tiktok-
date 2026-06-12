"use client";

import { Layers } from "lucide-react";
import { FilterDropdown, filterLabelClass } from "@/components/accounts/filter-dropdown";
import { PLATFORM_LABELS, type Platform } from "@/lib/providers/platform";

export type PlatformFilterValue = "all" | Platform;

type PlatformFilterSelectProps = {
  value: PlatformFilterValue;
  onChange: (value: PlatformFilterValue) => void;
  className?: string;
  showLabel?: boolean;
  /** Limit options to platforms present in data; defaults to all known platforms. */
  availablePlatforms?: Platform[];
  /** Match dashboard feed filter row (账号/平台/发布时间). */
  variant?: "default" | "feed";
};

function platformLabel(option: PlatformFilterValue) {
  if (option === "all") return "全部平台";
  return PLATFORM_LABELS[option as Platform];
}

export function PlatformFilterSelect({
  value,
  onChange,
  className = "",
  showLabel = false,
  availablePlatforms,
  variant = "default",
}: PlatformFilterSelectProps) {
  const isFeed = variant === "feed";
  const platformOptions: PlatformFilterValue[] = [
    "all",
    ...(availablePlatforms ?? (Object.keys(PLATFORM_LABELS) as Platform[])),
  ];

  const dropdown = (
    <FilterDropdown
      options={platformOptions}
      value={value}
      onChange={onChange}
      getLabel={platformLabel}
    />
  );

  const nativeSelect = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as PlatformFilterValue)}
      className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-sm text-[var(--space-cadet)] outline-none transition focus:border-[var(--carolina-blue)] focus:bg-[var(--card)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
    >
      <option value="all">全部平台</option>
      {platformOptions.slice(1).map((key) => (
        <option key={key} value={key}>
          {platformLabel(key)}
        </option>
      ))}
    </select>
  );

  const control = isFeed ? dropdown : nativeSelect;

  if (!showLabel) return control;

  return (
    <div className={`flex min-w-0 w-full flex-col gap-1.5 ${className}`.trim()}>
      <span className={filterLabelClass}>
        <Layers className="size-3" />
        平台
      </span>
      {control}
    </div>
  );
}
