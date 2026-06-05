"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Clapperboard,
  CloudDownload,
  Flame,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Rss,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/workspace/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Users },
  { label: "Analytics", href: "/content-analytics", icon: LineChart },
  { label: "Content Analysis", href: "/trends", icon: Sparkles },
  { label: "AI Insights", href: "/ai-insights", icon: BrainCircuit },
  { label: "AI Anime", href: "/ai-anime", icon: Clapperboard },
  { label: "Growth Feed", href: "/growth-feed", icon: Rss },
  { label: "Sync Center", href: "/sync-center", icon: CloudDownload },
  { label: "Team Management", href: "/team", icon: UserCog, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isAdmin(user: SessionUser | null) {
  return user?.role === "ADMIN" || user?.role === "OWNER";
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { user?: SessionUser };
        return payload.user ?? null;
      })
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.adminOnly || isAdmin(currentUser)),
    [currentUser],
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)]/95 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
      <div className="flex items-center justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)] shadow-md">
            <Flame className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--space-cadet)]">TikTok Tracker</p>
            <p className="text-xs text-[var(--cadet-gray)]">
              {currentUser?.workspaceName ?? "Team Workspace"}
            </p>
          </div>
        </div>
        <button
          className="grid size-10 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 lg:hidden"
          aria-label="Open menu"
          type="button"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {currentUser ? (
        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] bg-[var(--eggshell)]/40 px-3 py-2">
          <p className="truncate text-sm font-medium text-[var(--space-cadet)]">{currentUser.displayName}</p>
          <p className="truncate text-xs text-[var(--cadet-gray)]">
            {currentUser.email} · {currentUser.role}
          </p>
        </div>
      ) : null}

      <nav className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
        {visibleItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm transition duration-200 lg:justify-start ${
                active
                  ? "bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)] shadow-md"
                  : "text-[var(--cadet-gray)] hover:-translate-y-[1px] hover:bg-[var(--eggshell)]/70 hover:text-[var(--space-cadet)] hover:shadow-sm"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={`size-4 transition duration-200 ${
                  active ? "text-[var(--eggshell)]" : "text-[var(--cadet-gray)] group-hover:text-[var(--space-cadet)]"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] px-3 py-2 text-sm text-[var(--cadet-gray)] transition hover:bg-[var(--eggshell)]/70 lg:inline-flex"
      >
        <LogOut className="size-4" />
        退出登录
      </button>

      <section className="mt-6 hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-br from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)] shadow-lg lg:block">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-[var(--carolina-blue)]" />
          Team Workspace
        </div>
        <p className="mt-3 text-xs leading-5 text-[color-mix(in_srgb,var(--eggshell)_75%,transparent)]">
          成员在 Accounts 页面自行添加自己运营的账号，仅能看到自己的数据。管理员可查看全部账号并在 Team Management 审核成员。
        </p>
      </section>
    </aside>
  );
}
