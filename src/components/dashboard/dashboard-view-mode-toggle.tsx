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
      className="inline-flex h-10 shrink-0 items-center rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-white p-1 shadow-sm"
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
            className={`h-8 min-w-[3.5rem] rounded-lg px-4 text-sm font-medium transition duration-200 ${
              active
                ? "bg-[var(--space-cadet)] text-white shadow-sm"
                : "text-[var(--cadet-gray)] hover:text-[var(--space-cadet)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
