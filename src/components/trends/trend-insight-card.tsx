import type { ReactNode } from "react";

type TrendInsightCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
};

export function TrendInsightCard({ title, subtitle, icon, children }: TrendInsightCardProps) {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm transition duration-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--space-cadet)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--cadet-gray)]">{subtitle}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
