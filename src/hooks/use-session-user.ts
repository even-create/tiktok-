"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload: { user?: SessionUser | null }) => {
        if (!cancelled) setUser(payload.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
