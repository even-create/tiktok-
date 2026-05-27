import { ExternalLink, Eye, MessageCircle, Share2, ThumbsUp, TrendingUp } from "lucide-react";
import { VideoThumbnail } from "@/components/content-analytics/video-thumbnail";
import type { ContentVideo } from "@/lib/content-analytics";

type VideoDataTableProps = {
  videos: ContentVideo[];
};

export function VideoDataTable({ videos }: VideoDataTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
        <h2 className="text-base font-semibold">全部视频数据</h2>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{videos.length} 条</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-xs uppercase tracking-[0.16em] text-[var(--cadet-gray)]">
              <th className="px-4 py-3 font-medium">Video</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Likes</th>
              <th className="px-4 py-3 font-medium">Comments</th>
              <th className="px-4 py-3 font-medium">Shares</th>
              <th className="px-4 py-3 font-medium">Engagement</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Posted</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr
                key={video.id}
                className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] transition duration-200 last:border-0 hover:bg-[var(--eggshell)]/50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 shrink-0">
                      <VideoThumbnail title={video.title} thumbnailUrl={video.thumbnailUrl} className="h-16 w-16" />
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-xs truncate text-sm font-medium text-[var(--space-cadet)]">{video.title}</p>
                      {video.videoUrl ? (
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--carolina-blue)] transition hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          打开视频
                        </a>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--jet)]">
                  <p className="font-medium text-[var(--space-cadet)]">{video.accountDisplayName}</p>
                  <p className="text-xs text-[var(--cadet-gray)]">@{video.accountHandle}</p>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--jet)]">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3.5 text-[var(--cadet-gray)]" />
                    {video.viewsLabel}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--jet)]">
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="size-3.5 text-[var(--cadet-gray)]" />
                    {video.likesLabel}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--jet)]">
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3.5 text-[var(--cadet-gray)]" />
                    {video.commentsLabel}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--jet)]">
                  <span className="inline-flex items-center gap-1">
                    <Share2 className="size-3.5 text-[var(--cadet-gray)]" />
                    {video.sharesLabel}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_15%,white)] px-2.5 py-1 text-sm font-medium text-[var(--space-cadet)]">
                    <TrendingUp className="mr-1 inline size-3.5" />
                    {video.engagementLabel}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex max-w-[180px] flex-wrap gap-1">
                    {video.tags.length ? (
                      video.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--eggshell)] px-2 py-0.5 text-[10px] text-[var(--space-cadet)]"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--cadet-gray)]">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--cadet-gray)]">{video.postedLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!videos.length ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--cadet-gray)]">当前筛选条件下暂无视频数据</p>
        ) : null}
      </div>
    </section>
  );
}
