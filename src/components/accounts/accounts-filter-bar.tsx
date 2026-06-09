"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import { PlatformBadge } from "@/components/accounts/platform-badge";
import type { AccountSortMode } from "@/lib/accounts";
import type { Platform } from "@/lib/providers/platform";
import type { PlatformFilterValue } from "@/components/accounts/platform-filter-select";

export type { AccountSortMode };

const SORT_OPTIONS: { value: AccountSortMode; label: string }[] = [
  { value: "latest", label: "最新添加" },
  { value: "followers", label: "粉丝数（高→低）" },
  { value: "views", label: "总播放量（高→低）" },
  { value: "engagement", label: "互动率（高→低）" },
  { value: "updated", label: "最近更新" },
];

type AccountsFilterBarProps = {
  availablePlatforms: Platform[];
  platform: PlatformFilterValue;
  onPlatformChange: (value: PlatformFilterValue) => void;
  sort: AccountSortMode;
  onSortChange: (value: AccountSortMode) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

function PlatformPicker({
  options,
  value,
  onChange,
}: {
  options: PlatformFilterValue[];
  value: PlatformFilterValue;
  onChange: (value: PlatformFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const fieldClass =
    "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-sm text-[var(--space-cadet)] transition hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)]";

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className={fieldClass}>
        <span className="flex min-w-0 items-center gap-2">
          {value === "all" ? (
            <span className="truncate">全部平台</span>
          ) : (
            <PlatformBadge platform={value as Platform} />
          )}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-[var(--cadet-gray)] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-full min-w-[10rem] rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-1.5 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                value === option
                  ? "bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] font-medium text-[var(--space-cadet)]"
                  : "text-[var(--space-cadet)] hover:bg-[var(--eggshell)]"
              }`}
            >
              {option === "all" ? "全部平台" : <PlatformBadge platform={option as Platform} />}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AccountsFilterBar({
  availablePlatforms,
  platform,
  onPlatformChange,
  sort,
  onSortChange,
  searchQuery,
  onSearchChange,
}: AccountsFilterBarProps) {
  const platformOptions: PlatformFilterValue[] = ["all", ...availablePlatforms];

  return (
    <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--eggshell)]/25 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--space-cadet)]">选择平台</span>
          <PlatformPicker options={platformOptions} value={platform} onChange={onPlatformChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--space-cadet)]">排序方式</span>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as AccountSortMode)}
              className="h-11 w-full appearance-none rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] pl-10 pr-10 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--space-cadet)]">搜索账号名称或 @handle</span>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索账号名称或 @handle"
              className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
