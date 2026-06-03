"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";

/** Native spritesheet cell — `public/sync/spritesheet.meta.txt` */
const SPRITE_FRAME_W = 38;
const SPRITE_FRAME_H = 54;
const SPRITE_FRAMES = 4;
/** Integer upscale for crisp pixel art (no fractional CSS scale) */
const DISPLAY_SCALE = 2;

export type SyncRunnerPhase = "running" | "complete";

type SyncRunnerProgressProps = {
  percent: number;
  phase: SyncRunnerPhase;
  onFadeOutEnd?: () => void;
};

export function SyncRunnerProgress({ percent, phase, onFadeOutEnd }: SyncRunnerProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (phase !== "complete") {
      setIsExiting(false);
      return;
    }

    const fadeTimer = window.setTimeout(() => setIsExiting(true), 1000);
    const exitTimer = window.setTimeout(() => onFadeOutEnd?.(), 1400);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(exitTimer);
    };
  }, [phase, onFadeOutEnd]);

  const isComplete = phase === "complete";
  const displayW = SPRITE_FRAME_W * DISPLAY_SCALE;
  const displayH = SPRITE_FRAME_H * DISPLAY_SCALE;

  const spriteVars = {
    "--sprite-w": `${SPRITE_FRAME_W}px`,
    "--sprite-h": `${SPRITE_FRAME_H}px`,
    "--sprite-frames": SPRITE_FRAMES,
    "--display-scale": DISPLAY_SCALE,
    "--display-w": `${displayW}px`,
    "--display-h": `${displayH}px`,
    "--progress": `${clamped}%`,
  } as CSSProperties;

  return (
    <div
      className={`sync-runner-root w-full max-w-[28rem] transition-opacity duration-[400ms] ease-out ${
        isExiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={spriteVars}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={isComplete ? "Sync complete" : "Syncing data"}
      aria-live="polite"
    >
      <div className="mb-1.5 flex min-h-[1.125rem] items-center justify-between gap-2">
        {isComplete ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check className="size-3.5 shrink-0 stroke-[2.5]" aria-hidden />
            Sync Complete
          </p>
        ) : (
          <p className="text-[11px] font-medium text-[var(--cadet-gray)]">Syncing…</p>
        )}
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--cadet-gray)]">
          {Math.round(clamped)}%
        </span>
      </div>

      <div className="sync-runner-stage">
        <div className="sync-runner-track">
          <div className="sync-runner-fill" />
        </div>

        <div className={`sync-runner-marker ${isComplete ? "sync-runner-marker--done" : ""}`}>
          {!isComplete ? (
            <div className="sync-runner-dust" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          ) : null}

          <div className={`sync-runner-actor ${isComplete ? "sync-runner-actor--jump" : ""}`}>
            <div
              className={`sync-runner-sprite ${isComplete ? "sync-runner-sprite--freeze" : ""}`}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
