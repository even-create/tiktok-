import { CloudDownload } from "lucide-react";

export default function SyncCenterPage() {
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <CloudDownload className="size-4" />
          Sync Center
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">同步中心</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">
          统一管理 Apify 同步、缓存策略与同步历史（占位页）。
        </p>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-sm text-[var(--cadet-gray)]">
          即将支持：一键同步全部账号、单账号同步、缓存命中说明、最近同步结果列表等。
        </p>
      </section>
    </div>
  );
}

