"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 10_000;

export function AnimeJobPoller() {
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        await fetch("/api/anime/process-queue", { method: "POST" });
      } catch {
        // ignore transient network errors
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      if (!cancelled) {
        void tick();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
