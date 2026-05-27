import { Users } from "lucide-react";

export default function AccountsPage() {
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <Users className="size-4" />
          Accounts
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">账号管理</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">管理追踪账号、标签分组与基础信息（占位页）。</p>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-sm text-[var(--cadet-gray)]">
          即将支持：账号分组、批量操作、导入/导出、同步策略配置等。
        </p>
      </section>
    </div>
  );
}

