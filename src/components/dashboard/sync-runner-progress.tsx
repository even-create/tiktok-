"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";

/** Spritesheet frame geometry — matches `public/sync/spritesheet.meta.txt` */
const SPRITE_FRAME_W = 42;
const SPRITE_FRAME_H = 44;
const SPRITE_FRAMES = 4;

export type SyncRunnerPhase = "running" | "complete";

type SyncRunnerProgressProps = {
  percent: number;
  phase: SyncRunnerPhase;
  label?: string;
  onFadeOutEnd?: () => void;
};

export function SyncRunnerProgress({ percent, phase, label, onFadeOutEnd }: SyncRunnerProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (phase !== "complete") {
      setIsExiting(false);
      return;
    }

    const fadeTimer = window.setTimeout(() => setIsExiting(true), 900);
    const exitTimer = window.setTimeout(() => onFadeOutEnd?.(), 1300);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(exitTimer);
    };
  }, [phase, onFadeOutEnd]);

  const isComplete = phase === "complete";

  return (
    <div
      className={`sync-runner-panel mx-auto w-full max-w-[min(100%,28rem)] transition-all duration-500 ease-out ${
        isExiting ? "pointer-events-none translate-y-[-4px] opacity-0" : "opacity-100"
      }`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Syncing data"}
      aria-live="polite"
    >
      <div className="flex min-h-[4.5rem] flex-col justify-end rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[color-mix(in_srgb,var(--eggshell)_35%,var(--card))] px-3 pb-2.5 pt-2 shadow-sm">
        <div className="mb-1 flex min-h-[1.25rem] items-center justify-between gap-2">
          {isComplete ? (
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-700">
              <Check className="size-3.5 shrink-0 stroke-[2.5]" aria-hidden />
              Sync Complete
            </p>
          ) : (
            <p className="truncate text-[11px] font-medium text-[var(--cadet-gray)]">{label ?? "Syncing…"}</p>
          )}
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--cadet-gray)]">
            {Math.round(clamped)}%
          </span>
        </div>

        <div className="relative h-9">
          {/* Track */}
          <div className="absolute inset-x-0 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_14%,white)]">
            <div
              className="h-full rounded-full bg-[var(--carolina-blue)] transition-[width] duration-300 ease-out"
              style={{ width: `${clamped}%` }}
            />
          </div>

          {/* Runner + dust */}
          <div
            className="pointer-events-none absolute bottom-2 z-10 -translate-x-1/2 will-change-[left]"
            style={{
              left: `${clamped}%`,
              transition: isComplete ? "left 300ms ease-out" : "left 280ms linear",
            }}
          >
            {!isComplete ? (
              <div className="sync-runner-dust" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            ) : null}

            <div
              className={`sync-runner-sprite ${isComplete ? "sync-runner-sprite--jump" : ""}`}
              style={
                {
                  "--sprite-w": `${SPRITE_FRAME_W}px`,
                  "--sprite-h": `${SPRITE_FRAME_H}px`,
                  "--sprite-frames": SPRITE_FRAMES,
                } as CSSProperties
              }
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
