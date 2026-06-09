"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, Layers, Search } from "lucide-react";
import type { AccountSortMode } from "@/lib/accounts";
import { PLATFORM_LABELS, type Platform } from "@/lib/providers/platform";
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

const fieldClass =
  "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-xs text-[var(--space-cadet)] transition hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)]";

const labelClass =
  "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]";

function platformLabel(option: PlatformFilterValue) {
  if (option === "all") return "全部平台";
  return PLATFORM_LABELS[option as Platform];
}

function FilterDropdown<T extends string>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
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

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className={fieldClass}>
        <span className="truncate">{getLabel(value)}</span>
        <ChevronDown className={`size-4 shrink-0 text-[var(--cadet-gray)] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full min-w-[10rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] py-1 shadow-lg"
        >
          {options.map((option) => {
            const isActive = value === option;

            return (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--space-cadet)] transition hover:bg-[var(--eggshell)]"
              >
                <span className="flex w-4 shrink-0 justify-center">
                  {isActive ? <Check className="size-3.5 text-[var(--space-cadet)]" /> : null}
                </span>
                <span>{getLabel(option)}</span>
              </button>
            );
          })}
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
  const sortOptionValues = SORT_OPTIONS.map((option) => option.value);
  const sortLabelByValue = Object.fromEntries(SORT_OPTIONS.map((option) => [option.value, option.label])) as Record<
    AccountSortMode,
    string
  >;

  return (
    <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>
            <Layers className="size-3" />
            平台
          </span>
          <FilterDropdown
            options={platformOptions}
            value={platform}
            onChange={onPlatformChange}
            getLabel={platformLabel}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>
            <ArrowUpDown className="size-3" />
            排序方式
          </span>
          <FilterDropdown
            options={sortOptionValues}
            value={sort}
            onChange={onSortChange}
            getLabel={(option) => sortLabelByValue[option]}
          />
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
