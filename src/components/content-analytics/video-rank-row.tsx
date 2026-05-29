import { ExternalLink, Eye, MessageCircle, Share2, ThumbsUp, TrendingUp } from "lucide-react";
import { VideoThumbnail } from "@/components/content-analytics/video-thumbnail";
import type { ContentVideo } from "@/lib/content-analytics";
import type { ContentVideoWithQuality } from "@/lib/content-quality";

type RankVideo = ContentVideo | ContentVideoWithQuality;

type VideoRankRowProps = {
  title: string;
  subtitle: string;
  videos: RankVideo[];
  metricLabel: string;
  metricValue: (video: RankVideo) => string;
};

export function VideoRankRow({ title, subtitle, videos, metricLabel, metricValue }: VideoRankRowProps) {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--space-cadet)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--cadet-gray)]">{subtitle}</p>
        </div>
        <span className="rounded-full bg-[var(--eggshell)] px-2.5 py-1 text-xs text-[var(--cadet-gray)]">
          Top {videos.length}
        </span>
      </div>

      {videos.length ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {videos.map((video, index) => (
            <article
              key={video.id}
              className="group w-[220px] shrink-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--eggshell)]/25 transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--carolina-blue)_40%,transparent)] hover:shadow-md"
            >
              <div className="relative">
                <VideoThumbnail title={video.title} thumbnailUrl={video.thumbnailUrl} className="h-32 w-full rounded-none" />
                <span className="absolute left-2 top-2 rounded-full bg-[var(--space-cadet)]/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--eggshell)]">
                  #{index + 1}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-[var(--space-cadet)]">{video.title}</p>
                <p className="truncate text-xs text-[var(--cadet-gray)]">@{video.accountHandle}</p>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--cadet-gray)]">{metricLabel}</p>
                    <p className="text-sm font-semibold text-[var(--space-cadet)]">{metricValue(video)}</p>
                  </div>
                  {video.videoUrl ? (
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="grid size-8 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
                      aria-label={`打开视频：${video.title}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-[var(--cadet-gray)]">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3" />
                    {video.viewsLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="size-3" />
                    {video.likesLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3" />
                    {video.commentsLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Share2 className="size-3" />
                    {video.sharesLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--carolina-blue)]">
                    <TrendingUp className="size-3" />
                    {video.engagementLabel}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] px-4 py-8 text-center text-sm text-[var(--cadet-gray)]">
          当前筛选条件下暂无视频
        </p>
      )}
    </section>
  );
}
