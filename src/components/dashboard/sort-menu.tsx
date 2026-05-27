"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SortOption<T extends string> = {
  value: T;
  label: string;
};

type SortMenuProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SortOption<T>>;
  ariaLabel: string;
  menuTextClass?: string;
  menuWidthClass?: string;
  align?: "left" | "right";
};

export function SortMenu<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  menuTextClass = "text-[11px] leading-snug text-[var(--space-cadet)]",
  menuWidthClass = "w-40",
  align = "right",
}: SortMenuProps<T>) {
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
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ArrowUpDown className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+0.35rem)] z-30 ${menuWidthClass} overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] py-1 shadow-lg`}
        >
          {options.map((option) => {
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
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition ${
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)]"
                    : "hover:bg-[var(--eggshell)]/80"
                }`}
              >
                <span className={menuTextClass}>{option.label}</span>
                {isActive ? <Check className="size-3 shrink-0 text-[var(--carolina-blue)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
