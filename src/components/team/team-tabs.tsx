"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, UsersRound } from "lucide-react";

const tabs = [
  { label: "待审核申请", href: "/team-management/applications", icon: ClipboardList },
  { label: "团队成员", href: "/team-management/members", icon: UsersRound },
];

export function TeamTabs() {
  const pathname = usePathname() ?? "";

  return (
    <div className="inline-flex rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
              active
                ? "bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)] shadow-sm"
                : "text-[var(--cadet-gray)] hover:text-[var(--space-cadet)]"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
