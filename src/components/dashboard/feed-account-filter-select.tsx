"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { PLATFORM_LABELS } from "@/lib/providers/platform";
import type { FeedAccountOption } from "@/lib/latest-videos-feed";

type FeedAccountFilterSelectProps = {
  value: string;
  onChange: (handle: string) => void;
  options: FeedAccountOption[];
};

function AccountOptionRow({
  account,
  isActive,
  onSelect,
}: {
  account: FeedAccountOption | null;
  isActive: boolean;
  onSelect: () => void;
}) {
  const isAll = account === null;

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[var(--eggshell)] ${
        isActive ? "bg-[color-mix(in_srgb,var(--carolina-blue)_6%,white)]" : ""
      }`}
    >
      <span className="flex w-4 shrink-0 justify-center">
        {isActive ? <Check className="size-3.5 text-[var(--space-cadet)]" /> : null}
      </span>

      {isAll ? (
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--eggshell)] text-[var(--cadet-gray)]">
          <Users className="size-4" />
        </div>
      ) : (
        <AccountAvatar
          name={account.displayName}
          avatarUrl={account.avatarUrl}
          initialsText={account.handle.slice(0, 2).toUpperCase()}
          className="size-8 rounded-full text-[10px]"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--space-cadet)]">
          {isAll ? "全部账号" : account.displayName}
        </p>
        {!isAll ? (
          <p className="truncate text-xs text-[var(--cadet-gray)]">
            @{account.handle} · {PLATFORM_LABELS[account.platform]}
          </p>
        ) : (
          <p className="text-xs text-[var(--cadet-gray)]">显示所有账号的视频</p>
        )}
      </div>
    </button>
  );
}

export function FeedAccountFilterSelect({ value, onChange, options }: FeedAccountFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value === "all" ? null : options.find((option) => option.handle === value) ?? null),
    [value, options],
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 sm:max-w-xs">
      <span className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cadet-gray)]">
        <Users className="size-3" />
        账号
      </span>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-2.5 text-sm text-[var(--space-cadet)] transition hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? (
            <>
              <AccountAvatar
                name={selected.displayName}
                avatarUrl={selected.avatarUrl}
                initialsText={selected.handle.slice(0, 2).toUpperCase()}
                className="size-6 rounded-full text-[9px]"
              />
              <span className="truncate text-left">
                <span className="block truncate font-medium">{selected.displayName}</span>
                <span className="block truncate text-[10px] text-[var(--cadet-gray)]">
                  {PLATFORM_LABELS[selected.platform]}
                </span>
              </span>
            </>
          ) : (
            <span className="truncate px-0.5">全部账号</span>
          )}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-[var(--cadet-gray)] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 max-h-72 w-full min-w-[16rem] overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] py-1 shadow-lg"
        >
          <AccountOptionRow
            account={null}
            isActive={value === "all"}
            onSelect={() => {
              onChange("all");
              setOpen(false);
            }}
          />

          {options.map((account) => (
            <AccountOptionRow
              key={account.handle}
              account={account}
              isActive={value === account.handle}
              onSelect={() => {
                onChange(account.handle);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
