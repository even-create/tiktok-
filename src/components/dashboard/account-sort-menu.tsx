"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AccountSortMode = "default" | "followers" | "updated";

const sortOptions: Array<{ value: AccountSortMode; label: string }> = [
  { value: "default", label: "默认排序" },
  { value: "followers", label: "粉丝量从高到低" },
  { value: "updated", label: "更新时间从新到旧" },
];

type AccountSortMenuProps = {
  value: AccountSortMode;
  onChange: (value: AccountSortMode) => void;
};

export function AccountSortMenu({ value, onChange }: AccountSortMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid size-8 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:bg-[var(--card)] hover:text-[var(--carolina-blue)]"
        aria-label="账号排序"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ArrowUpDown className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-44 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] py-1 shadow-lg"
        >
          {sortOptions.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] text-[var(--space-cadet)]"
                    : "text-[var(--jet)] hover:bg-[var(--eggshell)]/60"
                }`}
              >
                <span>{option.label}</span>
                {isActive ? <Check className="size-3.5 text-[var(--carolina-blue)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
