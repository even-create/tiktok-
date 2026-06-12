import type { DashboardViewMode } from "@/lib/dashboard-totals";

export type { DashboardViewMode };

export function DashboardViewModeToggle({
  value,
  onChange,
}: {
  value: DashboardViewMode;
  onChange: (mode: DashboardViewMode) => void;
}) {
  const options: Array<{ id: DashboardViewMode; label: string }> = [
    { id: "team", label: "团队" },
    { id: "personal", label: "个人" },
  ];

  return (
    <div
      className="inline-flex h-9 shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--eggshell)]/30 p-1"
      role="tablist"
      aria-label="数据视图"
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`min-w-[3.25rem] rounded-lg px-3 py-1 text-xs font-semibold transition ${
              active
                ? "bg-[var(--space-cadet)] text-[var(--eggshell)] shadow-sm"
                : "text-[var(--cadet-gray)] hover:bg-[var(--eggshell)] hover:text-[var(--space-cadet)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
