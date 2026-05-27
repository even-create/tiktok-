import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <Settings className="size-4" />
          Settings
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">设置</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">配置同步策略、显示字段与系统参数（占位页）。</p>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-sm text-[var(--cadet-gray)]">
          即将支持：Apify 缓存时长、默认排序、数据保留策略、主题/语言等。
        </p>
      </section>
    </div>
  );
}

