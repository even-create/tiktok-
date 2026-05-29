"use client";

import { Eye, MessageCircle, Share2, ThumbsUp, TrendingUp, X } from "lucide-react";
import { VideoThumbnail } from "@/components/content-analytics/video-thumbnail";
import { TikTokIcon } from "@/components/dashboard/tiktok-icon";
import {
  qualityTierDisplayLabel,
  qualityTierEmoji,
} from "@/lib/latest-videos-feed";
import { qualityTierStyles, type ContentVideoWithQuality } from "@/lib/content-quality";

type VideoDetailModalProps = {
  video: ContentVideoWithQuality | null;
  onClose: () => void;
};

export function VideoDetailModal({ video, onClose }: VideoDetailModalProps) {
  if (!video) return null;

  const tierStyle = qualityTierStyles[video.qualityTier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--space-cadet)]/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <VideoThumbnail title={video.title} thumbnailUrl={video.thumbnailUrl} className="h-48 w-full rounded-none sm:h-56" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/30 bg-[var(--space-cadet)]/80 text-[var(--eggshell)] backdrop-blur transition hover:bg-[var(--jet)]"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
          <span
            className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tierStyle.badge}`}
          >
            <span>{qualityTierEmoji[video.qualityTier]}</span>
            {qualityTierDisplayLabel[video.qualityTier]}
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <h2 id="video-detail-title" className="text-lg font-semibold text-[var(--space-cadet)]">
              视频详情
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--jet)]">{video.title}</p>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              @{video.accountHandle} · {video.postedLabel}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Views", value: video.viewsLabel, icon: Eye },
              { label: "Likes", value: video.likesLabel, icon: ThumbsUp },
              { label: "Comments", value: video.commentsLabel, icon: MessageCircle },
              { label: "Shares", value: video.sharesLabel, icon: Share2 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/30 p-3"
              >
                <item.icon className="size-4 text-[var(--cadet-gray)]" />
                <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--cadet-gray)]">{item.label}</p>
                <p className="text-sm font-semibold text-[var(--space-cadet)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] px-3 py-1 text-sm font-medium text-[var(--space-cadet)]">
              <TrendingUp className="size-3.5" />
              Engagement {video.engagementLabel}
            </span>
            <span className="rounded-full bg-[var(--eggshell)] px-3 py-1 text-xs text-[var(--cadet-gray)]">
              Viral score {video.viralScore}
            </span>
          </div>

          {video.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-[var(--eggshell)] px-2 py-1 text-xs text-[var(--cadet-gray)]"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          ) : null}

          {video.videoUrl ? (
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)]"
            >
              <TikTokIcon className="size-4" />
              在 TikTok 打开
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
