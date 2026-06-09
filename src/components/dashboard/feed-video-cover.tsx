"use client";

import { CirclePlay } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type FeedVideoCoverProps = {
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  className?: string;
};

export function FeedVideoCover({ title, thumbnailUrl, videoUrl, className = "aspect-[3/4] w-full" }: FeedVideoCoverProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(thumbnailUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const remoteLoadedRef = useRef(false);

  const fetchRemoteCover = useCallback(async () => {
    if (!videoUrl || remoteLoadedRef.current) return null;

    remoteLoadedRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/video-cover?url=${encodeURIComponent(videoUrl)}`, { cache: "no-store" });
      if (!response.ok) return null;

      const payload = (await response.json()) as { thumbnailUrl?: string };
      return payload.thumbnailUrl?.trim() || null;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [videoUrl]);

  useEffect(() => {
    remoteLoadedRef.current = false;
    setDisplayUrl(thumbnailUrl);
    setFailed(false);
    setIsLoading(false);
  }, [thumbnailUrl, videoUrl]);

  useEffect(() => {
    if (displayUrl || !videoUrl || failed || remoteLoadedRef.current) return;

    let cancelled = false;

    void fetchRemoteCover().then((url) => {
      if (cancelled) return;
      if (url) {
        setDisplayUrl(url);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [displayUrl, videoUrl, failed, fetchRemoteCover]);

  const handleImageError = () => {
    // Retry hotlink-protected CDNs (Douyin/XHS/IG) once through our image proxy.
    if (displayUrl && displayUrl.startsWith("https://") && !displayUrl.startsWith("/api/image-proxy")) {
      setDisplayUrl(`/api/image-proxy?url=${encodeURIComponent(displayUrl)}`);
      return;
    }

    if (!videoUrl || remoteLoadedRef.current) {
      setFailed(true);
      return;
    }

    setDisplayUrl(null);
    void fetchRemoteCover().then((url) => {
      if (url) {
        setDisplayUrl(url);
      } else {
        setFailed(true);
      }
    });
  };

  if (displayUrl && !failed) {
    return (
      <img
        src={displayUrl}
        alt={title}
        className={`${className} rounded-none object-cover ring-1 ring-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]`}
        onError={handleImageError}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
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
