import {
  CirclePlay,
  Eye,
  ThumbsUp,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { DashboardTotals } from "@/lib/dashboard-totals";

type MetricDefinition = {
  key: keyof Pick<DashboardTotals, "followers" | "likes" | "views" | "videos" | "avgInteraction">;
  label: string;
  icon: LucideIcon;
  accent: string;
};

const metricDefinitions: MetricDefinition[] = [
  {
    key: "followers",
    label: "总粉丝数",
    icon: Users,
    accent: "from-[color-mix(in_srgb,var(--carolina-blue)_22%,transparent)] to-transparent",
  },
  {
    key: "likes",
    label: "总点赞量",
    icon: ThumbsUp,
    accent: "from-[color-mix(in_srgb,var(--space-cadet)_14%,transparent)] to-transparent",
  },
  {
    key: "views",
    label: "总播放量",
    icon: Eye,
    accent: "from-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] to-transparent",
  },
  {
    key: "videos",
    label: "总视频数",
    icon: CirclePlay,
    accent: "from-[color-mix(in_srgb,var(--jet)_12%,transparent)] to-transparent",
  },
  {
    key: "avgInteraction",
    label: "平均互动率",
    icon: TrendingUp,
    accent: "from-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)] to-transparent",
  },
];

export function DashboardMetricsGrid({
  totals,
  labelPrefix = "",
}: {
  totals: DashboardTotals;
  labelPrefix?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {metricDefinitions.map((metric) => (
        <article
          key={`${labelPrefix}${metric.label}`}
          className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:shadow-md"
        >
          <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${metric.accent}`} />
          <div className="relative flex items-center justify-between">
            <p className="text-sm text-[var(--cadet-gray)]">
              {labelPrefix}
              {metric.label}
            </p>
            <metric.icon className="size-5 text-[var(--space-cadet)]" />
          </div>
          <p className="relative mt-4 text-3xl font-semibold text-[var(--space-cadet)]">
            {totals[metric.key]}
          </p>
          <p className="relative mt-2 text-xs text-[var(--carolina-blue)]">
            {totals.accountCount} 个账号合计
          </p>
        </article>
      ))}
    </div>
  );
}
