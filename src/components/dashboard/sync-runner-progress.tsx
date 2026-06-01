"use client";

import Image from "next/image";

type SyncRunnerProgressProps = {
  percent: number;
  label: string;
};

export function SyncRunnerProgress({ percent, label }: SyncRunnerProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="rounded-xl border border-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_8%,white)] px-3 py-2.5"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <p className="mb-2 text-xs text-[var(--space-cadet)]">{label}</p>
      <div className="relative pt-5">
        <div
          className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 transition-[left] duration-300 ease-out"
          style={{ left: `${clamped}%` }}
        >
          <Image
            src="/sync-runner.png"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 object-contain drop-shadow-sm motion-safe:animate-sync-runner-bob"
            aria-hidden
          />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_18%,white)]">
          <div
            className="h-full rounded-full bg-[var(--carolina-blue)] transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
