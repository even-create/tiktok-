"use client";

import { ArrowUpDown, Layers, Search } from "lucide-react";
import type { AccountSortMode } from "@/lib/accounts";
import { FilterDropdown, filterLabelClass } from "@/components/accounts/filter-dropdown";
import { OwnerFilterSelect, type OwnerFilterValue } from "@/components/accounts/owner-filter-select";
import { PLATFORM_LABELS, type Platform } from "@/lib/providers/platform";
import type { PlatformFilterValue } from "@/components/accounts/platform-filter-select";

export type { AccountSortMode };

const SORT_OPTIONS: { value: AccountSortMode; label: string }[] = [
  { value: "latest", label: "最新添加" },
  { value: "followers", label: "粉丝数" },
  { value: "views", label: "总播放量" },
  { value: "engagement", label: "互动率" },
  { value: "updated", label: "最近更新" },
];

type AccountsFilterBarProps = {
  availablePlatforms: Platform[];
  platform: PlatformFilterValue;
  onPlatformChange: (value: PlatformFilterValue) => void;
  sort: AccountSortMode;
  onSortChange: (value: AccountSortMode) => void;
  availableOwners: string[];
  owner: OwnerFilterValue;
  onOwnerChange: (value: OwnerFilterValue) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

function platformLabel(option: PlatformFilterValue) {
  if (option === "all") return "全部平台";
  return PLATFORM_LABELS[option as Platform];
}

export function AccountsFilterBar({
  availablePlatforms,
  platform,
  onPlatformChange,
  sort,
  onSortChange,
  availableOwners,
  owner,
  onOwnerChange,
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={filterLabelClass}>
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

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={filterLabelClass}>
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

        <OwnerFilterSelect value={owner} onChange={onOwnerChange} owners={availableOwners} />

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={filterLabelClass}>
            <Search className="size-3" />
            搜索
          </span>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索账号名称或 @handle"
              className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
