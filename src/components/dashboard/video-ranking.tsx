import { CirclePlay, TrendingUp } from "lucide-react";

export type RankedVideo = {
  id: string;
  title: string;
  videoUrl: string | null;
  views: string;
  interactionRate: string;
  rank: number;
};

type VideoRankingProps = {
  videos: RankedVideo[];
};

export function VideoRanking({ videos }: VideoRankingProps) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">视频排行榜</h3>
          <p className="mt-1 text-xs text-zinc-500">按播放量排序</p>
        </div>
        <TrendingUp className="size-4 text-[#fe2c55]" />
      </div>

      <ol className="mt-4 space-y-2">
        {videos.map((video) => (
          <li
            key={video.id}
            className="group flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-3 transition duration-200 hover:border-zinc-200 hover:bg-white hover:shadow-md"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#161823] to-[#3a3f4d] text-xs font-bold text-white">
              {video.rank}
            </span>

            {video.videoUrl ? (
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#fe2c55] shadow-sm transition group-hover:scale-105"
                aria-label={`打开视频：${video.title}`}
              >
                <CirclePlay className="size-4" />
              </a>
            ) : (
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-zinc-400 shadow-sm">
                <CirclePlay className="size-4" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{video.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {video.views} views · {video.interactionRate} 互动率
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
