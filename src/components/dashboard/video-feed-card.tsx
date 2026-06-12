"use client";

import { Bookmark, Eye, ExternalLink, Heart, MessageCircle, TrendingUp, UserRound } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { FeedVideoCover } from "@/components/dashboard/feed-video-cover";
import { PlatformBadge } from "@/components/accounts/platform-badge";
import { TikTokIcon } from "@/components/dashboard/tiktok-icon";
import { qualityTierStyles, type ContentVideoWithQuality } from "@/lib/content-quality";
import { qualityTierDisplayLabel, qualityTierEmoji } from "@/lib/latest-videos-feed";

export function VideoCoverStatsOverlay({ video }: { video: ContentVideoWithQuality }) {
  const stats = [
    { icon: Eye, value: video.viewsLabel },
    { icon: Heart, value: video.likesLabel },
    { icon: MessageCircle, value: video.commentsLabel },
    { icon: Bookmark, value: video.collectsLabel },
  ];

  return (
    <div className="pointer-events-none absolute inset-y-0 right-1.5 z-10 flex flex-col items-center justify-center gap-2 py-3 sm:right-2 sm:gap-2.5">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col items-center gap-0.5">
          <div className="grid size-8 place-items-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-[2px] sm:size-9">
            <stat.icon className="size-3.5 sm:size-4" strokeWidth={2.25} />
          </div>
          <span className="max-w-[52px] truncate text-center text-[10px] font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[11px]">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VideoFeedSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
        >
          <div className="relative aspect-[3/4] w-full animate-pulse bg-[var(--eggshell)]/60">
            <div className="absolute inset-y-0 right-2 flex flex-col justify-center gap-2">
              {Array.from({ length: 4 }).map((__, statIndex) => (
                <div key={statIndex} className="size-8 rounded-full bg-white/20" />
              ))}
            </div>
          </div>
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--eggshell)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--eggshell)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VideoFeedCard({
  video,
  onSelect,
}: {
  video: ContentVideoWithQuality;
  onSelect: (video: ContentVideoWithQuality) => void;
}) {
  const tierStyle = qualityTierStyles[video.qualityTier];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--carolina-blue)_45%,transparent)] hover:shadow-md">
      <button
        type="button"
        onClick={() => onSelect(video)}
        className="relative block w-full overflow-hidden text-left"
      >
        <FeedVideoCover
          title={video.title}
          thumbnailUrl={video.thumbnailUrl}
          videoUrl={video.videoUrl}
          className="aspect-[3/4] w-full"
        />

        <span
          className={`absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold shadow-sm ${tierStyle.badge}`}
        >
          <span aria-hidden>{qualityTierEmoji[video.qualityTier]}</span>
          <span className="hidden min-[420px]:inline">{qualityTierDisplayLabel[video.qualityTier]}</span>
        </span>

        <PlatformBadge
          platform={video.accountPlatform}
          className="pointer-events-none absolute right-1.5 top-1.5 z-10 px-1.5 py-0 text-[9px] shadow-sm sm:right-2"
        />

        <VideoCoverStatsOverlay video={video} />

        <span className="absolute bottom-2 left-2 z-10 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          查看详情
        </span>

        {video.videoUrl ? (
          <a
            href={video.videoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-2 right-2 z-10 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70"
            aria-label={`在 TikTok 打开：${video.title}`}
          >
            <TikTokIcon className="size-3.5" />
          </a>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-2 border-t border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] p-2.5 sm:p-3">
        <button type="button" onClick={() => onSelect(video)} className="block h-[2.75rem] w-full shrink-0 text-left">
          <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--space-cadet)] transition group-hover:text-[var(--carolina-blue)]">
            {video.title}
          </p>
        </button>

        <div className="flex items-center gap-1.5">
          <AccountAvatar
            name={video.accountDisplayName}
            avatarUrl={video.accountAvatarUrl}
            initialsText={video.accountHandle.slice(0, 2).toUpperCase()}
            className="size-6 rounded-full text-[9px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-[var(--space-cadet)]">@{video.accountHandle}</p>
            <p className="truncate text-[9px] text-[var(--cadet-gray)]" title={video.postedAtFull}>
              {video.postedLabel}
            </p>
          </div>
          <a
            href={video.accountProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--eggshell)]/40 px-2 py-1 text-[10px] font-medium text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
            aria-label={`打开 @${video.accountHandle} 的 TikTok 主页`}
          >
            <ExternalLink className="size-3" />
            主页
          </a>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)] px-2 py-0.5 text-[10px] font-semibold text-[var(--space-cadet)]">
            <TrendingUp className="size-2.5" />
            {video.engagementLabel}
          </span>
          <p className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] text-[var(--cadet-gray)]">
            <UserRound className="size-3 shrink-0" />
            <span className="truncate">
              负责人：<span className="font-medium text-[var(--space-cadet)]">{video.accountOwnerName}</span>
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
