"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MoreHorizontal, Settings, UserRound } from "lucide-react";
import type { SessionUser } from "@/lib/session";

function initial(user: SessionUser) {
  return (user.name?.trim()?.[0] || user.email?.trim()?.[0] || "U").toUpperCase();
}

function roleLabel(user: SessionUser) {
  return user.role === "ADMIN" ? "Administrator" : "Member";
}

export function UserCard({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors; we still redirect to login
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div ref={ref} className="relative mt-6 hidden lg:block">
      {open ? (
        <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)] shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--space-cadet)] hover:bg-[var(--eggshell)]/70"
          >
            <UserRound className="size-4" />
            Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--space-cadet)] hover:bg-[var(--eggshell)]/70"
          >
            <Settings className="size-4" />
            Settings
          </button>
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="flex w-full items-center gap-2 border-t border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {loggingOut ? "退出中..." : "Logout"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)] p-3 text-left transition hover:bg-[var(--eggshell)]/60"
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full text-base font-semibold text-white"
          style={{ background: "#70B0CC" }}
        >
          {initial(user)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--space-cadet)]">
            {user.name}
          </span>
          <span className="block text-xs" style={{ color: "#8795A5" }}>
            {roleLabel(user)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "#22C55E" }}>
            <span className="size-1.5 rounded-full" style={{ background: "#22C55E" }} />
            Online
          </span>
        </span>
        <MoreHorizontal className="size-4 shrink-0 text-[var(--cadet-gray)]" />
      </button>
    </div>
  );
}

export function HeaderUser({ user }: { user: SessionUser | null }) {
  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)] py-1 pl-1 pr-3 shadow-sm">
      <span
        className="grid size-7 place-items-center rounded-full text-xs font-semibold text-white"
        style={{ background: "#70B0CC" }}
      >
        {initial(user)}
      </span>
      <span className="text-sm font-medium text-[var(--space-cadet)]">{user.name}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          user.role === "ADMIN"
            ? "bg-amber-100 text-amber-800"
            : "bg-sky-100 text-sky-800"
        }`}
      >
        {user.role}
      </span>
    </div>
  );
}
