import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/current-user";

export default async function TeamManagementLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-8 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[var(--space-cadet)]">Access Denied</h1>
          <p className="mt-2 text-sm text-[var(--cadet-gray)]">
            You do not have permission to access this page.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] px-5 text-sm font-medium text-[var(--eggshell)] shadow-md transition hover:opacity-95"
          >
            返回 Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
