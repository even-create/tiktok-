"use client";

import { UserRound } from "lucide-react";
import { FilterDropdown, filterLabelClass } from "@/components/accounts/filter-dropdown";

export type OwnerFilterValue = "all" | string;

type OwnerFilterSelectProps = {
  value: OwnerFilterValue;
  onChange: (value: OwnerFilterValue) => void;
  owners: string[];
  className?: string;
};

function ownerLabel(option: OwnerFilterValue) {
  if (option === "all") return "全部负责人";
  return option;
}

export function OwnerFilterSelect({ value, onChange, owners, className = "" }: OwnerFilterSelectProps) {
  const options: OwnerFilterValue[] = ["all", ...owners];

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`.trim()}>
      <span className={filterLabelClass}>
        <UserRound className="size-3" />
        负责人
      </span>
      <FilterDropdown
        options={options}
        value={value}
        onChange={onChange}
        getLabel={ownerLabel}
      />
    </div>
  );
}
