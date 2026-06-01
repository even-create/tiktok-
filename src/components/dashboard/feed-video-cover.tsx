"use client";

import { CirclePlay } from "lucide-react";
import { useEffect, useState } from "react";

type FeedVideoCoverProps = {
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  className?: string;
};

export function FeedVideoCover({ title, thumbnailUrl, videoUrl, className = "aspect-[3/4] w-full" }: FeedVideoCoverProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(thumbnailUrl);
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(!thumbnailUrl && Boolean(videoUrl));

  useEffect(() => {
    setResolvedUrl(thumbnailUrl);
    setFailed(false);
    setIsLoading(!thumbnailUrl && Boolean(videoUrl));
  }, [thumbnailUrl, videoUrl]);

  useEffect(() => {
    if (resolvedUrl || !videoUrl || failed) return;

    let cancelled = false;

    void fetch(`/api/video-cover?url=${encodeURIComponent(videoUrl)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { thumbnailUrl?: string };
        return payload.thumbnailUrl ?? null;
      })
      .then((url) => {
        if (cancelled) return;
        if (url) {
          setResolvedUrl(url);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, videoUrl, failed]);

  if (resolvedUrl && !failed) {
    return (
      <img
        src={resolvedUrl}
        alt={title}
        className={`${className} rounded-none object-cover ring-1 ring-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]`}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse rounded-none bg-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)]`} />
    );
  }

  return (
    <div
      className={`${className} grid place-items-center rounded-none bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-[var(--eggshell)]`}
    >
      <CirclePlay className="size-10 opacity-90" />
    </div>
  );
}
