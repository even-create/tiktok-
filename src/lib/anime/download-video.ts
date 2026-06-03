import { resolveCharacterName } from "@/lib/anime/character-names";
import type { AnimeJobRecord } from "@/lib/anime/jobs";

function sanitizeFilenamePart(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "video";
}

export function buildAnimeVideoFilename(job: AnimeJobRecord, characterNames?: Record<string, string>) {
  const characterName = resolveCharacterName(job.character_id, characterNames);
  return `${sanitizeFilenamePart(characterName)}-${sanitizeFilenamePart(job.action)}.mp4`;
}

export async function downloadAnimeVideo(job: AnimeJobRecord, characterNames?: Record<string, string>) {
  if (!job.video_url) {
    throw new Error("暂无可下载的视频");
  }

  const filename = buildAnimeVideoFilename(job, characterNames);
  const url = `/api/anime/download?jobId=${encodeURIComponent(job.id)}&filename=${encodeURIComponent(filename)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "下载失败");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
