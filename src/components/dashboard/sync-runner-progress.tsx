"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";

/** Native frame size — `public/sync/spritesheet.meta.txt` */
const SPRITE_FRAME_W = 33;
const SPRITE_FRAME_H = 46;
const SPRITE_FRAMES = 4;

export type SyncRunnerPhase = "running" | "complete";

type SyncRunnerProgressProps = {
  percent: number;
  phase: SyncRunnerPhase;
  className?: string;
  onFadeOutEnd?: () => void;
};

export function SyncRunnerProgress({ percent, phase, className = "", onFadeOutEnd }: SyncRunnerProgressProps) {
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

  const spriteVars = {
    "--frame-w": `${SPRITE_FRAME_W}px`,
    "--frame-h": `${SPRITE_FRAME_H}px`,
    "--sheet-w": `${SPRITE_FRAME_W * SPRITE_FRAMES}px`,
    "--progress": `${clamped}%`,
  } as CSSProperties;

  return (
    <div
      className={`sync-runner-root flex w-full items-end gap-2 transition-opacity duration-[400ms] ease-out ${
        isExiting ? "pointer-events-none opacity-0" : "opacity-100"
      } ${className}`.trim()}
      style={spriteVars}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={isComplete ? "Sync complete" : "Syncing data"}
      aria-live="polite"
    >
      <div className="sync-runner-stage min-w-0 flex-1">
        <div className="sync-runner-track">
          <div className="sync-runner-fill" />
        </div>

        <div className={`sync-runner-marker ${isComplete ? "sync-runner-marker--done" : ""}`}>
          {!isComplete ? (
            <div className="sync-runner-dust" aria-hidden>
              <span />
              <span />
            </div>
          ) : null}

          <div className={`sync-runner-actor ${isComplete ? "sync-runner-actor--jump" : ""}`}>
            <div className="sync-runner-clip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sync/runner-spritesheet.png"
                alt=""
                width={SPRITE_FRAME_W * SPRITE_FRAMES}
                height={SPRITE_FRAME_H}
                draggable={false}
                className={`sync-runner-sheet ${isComplete ? "sync-runner-sheet--freeze" : ""}`}
              />
            </div>
          </div>
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
  );
}
