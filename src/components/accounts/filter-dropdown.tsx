"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export const filterFieldClass =
  "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3 text-xs text-[var(--space-cadet)] transition hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)]";

export const filterLabelClass =
  "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]";

export function FilterDropdown<T extends string>({
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
    <div ref={rootRef} className="relative w-full min-w-0">
      <button type="button" onClick={() => setOpen((current) => !current)} className={filterFieldClass}>
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
                <span className="truncate">{getLabel(option)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
