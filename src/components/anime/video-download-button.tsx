"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { downloadAnimeVideo } from "@/lib/anime/download-video";
import type { AnimeJobRecord } from "@/lib/anime/jobs";

type VideoDownloadButtonProps = {
  job: AnimeJobRecord;
  characterNames?: Record<string, string>;
  className?: string;
};

export function VideoDownloadButton({ job, characterNames, className }: VideoDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  if (!job.video_url) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={downloading}
      onClick={() => {
        setDownloading(true);
        void downloadAnimeVideo(job, characterNames)
          .catch(() => undefined)
          .finally(() => setDownloading(false));
      }}
      className={
        className ??
        "inline-flex h-8 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] px-3 text-xs text-[var(--space-cadet)] hover:bg-[var(--eggshell)]/70 disabled:opacity-60"
      }
    >
      {downloading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      下载
    </button>
  );
}
