"use client";

import { CirclePlay } from "lucide-react";
import { useState } from "react";

type VideoThumbnailProps = {
  title: string;
  thumbnailUrl: string | null;
  className?: string;
};

export function VideoThumbnail({ title, thumbnailUrl, className = "h-28 w-full" }: VideoThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (thumbnailUrl && !failed) {
    return (
      <img
        src={thumbnailUrl}
        alt={title}
        className={`${className} rounded-xl object-cover ring-1 ring-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]`}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${className} grid place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)]`}
    >
      <CirclePlay className="size-8 opacity-90" />
    </div>
  );
}
