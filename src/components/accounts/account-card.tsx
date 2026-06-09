"use client";

import Link from "next/link";
import { Bookmark, CirclePlay, Clock3, ExternalLink, Eye, Heart, ThumbsUp, Trash2, TrendingUp, UserRound, Users } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { PlatformBadge } from "@/components/accounts/platform-badge";
import { MiniSparkline } from "@/components/dashboard/mini-sparkline";
import type { AccountListItem } from "@/lib/accounts";
import { VIEW_PRIMARY_PLATFORMS } from "@/lib/providers/platform";

type AccountCardProps = {
  account: AccountListItem;
  isDeleting?: boolean;
  onDelete: (id: string) => void;
};

export function AccountCard({ account, isDeleting = false, onDelete }: AccountCardProps) {
  const detailHref = `/accounts/${encodeURIComponent(account.id)}`;
  const isViewPrimary = VIEW_PRIMARY_PLATFORMS.has(account.platform);
  const metrics = isViewPrimary
    ? [
        { label: "粉丝", value: account.followersLabel, icon: Users },
        { label: "点赞", value: account.likesLabel, icon: ThumbsUp },
        { label: "播放", value: account.viewsLabel, icon: Eye },
        { label: "互动率", value: account.engagementLabel, icon: TrendingUp },
      ]
    : [
        { label: "粉丝", value: account.followersLabel, icon: Users },
        { label: "点赞", value: account.likesLabel, icon: ThumbsUp },
        { label: "收藏", value: account.collectsLabel, icon: Bookmark },
        { label: "作品", value: String(account.videoCount), icon: CirclePlay },
      ];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)] hover:shadow-md">
      <Link href={detailHref} className="absolute inset-0 z-0 rounded-2xl" aria-label={`查看 @${account.handle} 详情`} />

      <div className="relative z-10 flex flex-col p-4 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AccountAvatar
              name={account.displayName}
              avatarUrl={account.avatarUrl}
              initialsText={account.initials}
              className="size-12"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--space-cadet)]">{account.displayName}</p>
              <p className="truncate text-sm text-[var(--cadet-gray)]">@{account.handle}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--cadet-gray)]">
                <UserRound className="size-3" />
                负责人：<span className="font-medium text-[var(--space-cadet)]">{account.ownerName}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-1 pointer-events-auto">
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="grid size-8 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
              aria-label={`打开 @${account.handle} 的 TikTok 主页`}
            >
              <ExternalLink className="size-3.5" />
            </a>
            <button
              type="button"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete(account.id);
              }}
              className="grid size-8 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-[var(--cadet-gray)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
              aria-label={`删除账号 ${account.handle}`}
            >
              {isDeleting ? <Clock3 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
            </div>
            <PlatformBadge platform={account.platform} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/35 px-2.5 py-2"
            >
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--cadet-gray)]">
                <metric.icon className="size-3" />
                {metric.label}
              </div>
              <p className="mt-1 text-sm font-semibold text-[var(--space-cadet)]">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--cadet-gray)]">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            上次同步：{account.lastSyncedLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--carolina-blue)]">
            <Heart className="size-3.5" />
            {account.videoCount} 条视频
          </span>
        </div>

        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--cadet-gray)]">
            {isViewPrimary ? "播放趋势" : "点赞趋势"}
          </p>
          <MiniSparkline points={account.trendPoints} />
        </div>
      </div>
    </article>
  );
}
