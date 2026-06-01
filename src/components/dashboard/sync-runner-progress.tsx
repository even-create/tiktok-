"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";

/** Spritesheet frame geometry — matches `public/sync/spritesheet.meta.txt` */
const SPRITE_FRAME_W = 24;
const SPRITE_FRAME_H = 39;
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
      className={`min-w-[10rem] flex-1 max-w-md transition-all duration-500 ease-out ${
        isExiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Syncing data"}
      aria-live="polite"
    >
      <div className="flex items-end gap-2">
        <div className="relative h-8 min-w-0 flex-1">
          <div className="absolute inset-x-0 bottom-1 h-[3px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cadet-gray)_16%,white)]">
            <div
              className="h-full rounded-full bg-[var(--carolina-blue)] transition-[width] duration-300 ease-out"
              style={{ width: `${clamped}%` }}
            />
          </div>

          <div
            className="pointer-events-none absolute bottom-1.5 z-10 -translate-x-1/2 will-change-[left]"
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

        {isComplete ? (
          <span className="flex shrink-0 items-center gap-1 pb-0.5 text-[10px] font-medium text-emerald-700">
            <Check className="size-3 stroke-[2.5]" aria-hidden />
            Done
          </span>
        ) : (
          <span className="shrink-0 pb-0.5 font-mono text-[10px] tabular-nums text-[var(--cadet-gray)]">
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  );
}
