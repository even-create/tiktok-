"use client";

import { SortMenu } from "@/components/dashboard/sort-menu";

export type AccountSortMode = "default" | "followers" | "updated";

const accountSortOptions = [
  { value: "default" as const, label: "默认排序" },
  { value: "followers" as const, label: "粉丝量从高到低" },
  { value: "updated" as const, label: "更新时间从新到旧" },
];

type AccountSortMenuProps = {
  value: AccountSortMode;
  onChange: (value: AccountSortMode) => void;
};

export function AccountSortMenu({ value, onChange }: AccountSortMenuProps) {
  return (
    <SortMenu
      value={value}
      onChange={onChange}
      options={accountSortOptions}
      ariaLabel="账号排序"
      menuTextClass="text-[11px] leading-snug text-[var(--space-cadet)]"
      menuWidthClass="w-36"
    />
  );
}
