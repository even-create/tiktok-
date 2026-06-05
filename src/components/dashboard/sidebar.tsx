"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  Clapperboard,
  CloudDownload,
  Flame,
  LayoutDashboard,
  LineChart,
  Menu,
  Rss,
  Settings,
  Sparkles,
  UsersRound,
  Users,
} from "lucide-react";
import { UserCard } from "@/components/dashboard/user-card";
import type { SessionUser } from "@/lib/session";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Users },
  { label: "Content Analytics", href: "/content-analytics", icon: LineChart },
  { label: "Trends", href: "/trends", icon: Sparkles },
  { label: "AI Insights", href: "/ai-insights", icon: BrainCircuit },
  { label: "AI Anime", href: "/ai-anime", icon: Clapperboard, adminOnly: true },
  { label: "Growth Feed", href: "/growth-feed", icon: Rss },
  { label: "Sync Center", href: "/sync-center", icon: CloudDownload, adminOnly: true },
  { label: "Team Management", href: "/team-management", icon: UsersRound, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname() ?? "/";
  const isUserAdmin = user?.role === "ADMIN";
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isUserAdmin);

  return (
    <aside className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)]/95 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r lg:px-5">
      <div className="flex items-center justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)] shadow-md">
            <Flame className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--space-cadet)]">TikTok Tracker</p>
            <p className="text-xs text-[var(--cadet-gray)]">Data analytics</p>
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

      <nav className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
        {visibleNavItems.map((item) => {
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

      <UserCard user={user} />
    </aside>
  );
}

