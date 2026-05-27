"use client";

import { SortMenu } from "@/components/dashboard/sort-menu";

export type VideoSortMode = "default" | "views" | "likes" | "interaction";

const videoSortOptions = [
  { value: "default" as const, label: "默认排序" },
  { value: "views" as const, label: "播放量从高到低" },
  { value: "likes" as const, label: "点赞量从高到低" },
  { value: "interaction" as const, label: "互动率从高到低" },
];

type VideoSortMenuProps = {
  value: VideoSortMode;
  onChange: (value: VideoSortMode) => void;
};

export function VideoSortMenu({ value, onChange }: VideoSortMenuProps) {
  return (
    <div className="[&>div>button]:border-white/20 [&>div>button]:bg-white/10 [&>div>button]:text-[var(--eggshell)] [&>div>button]:hover:border-white/40 [&>div>button]:hover:bg-white/20 [&>div>button]:hover:text-white">
      <SortMenu
        value={value}
        onChange={onChange}
        options={videoSortOptions}
        ariaLabel="视频排序"
        menuTextClass="text-[11px] leading-snug text-[var(--space-cadet)]"
        menuWidthClass="w-36"
      />
    </div>
  );
}
