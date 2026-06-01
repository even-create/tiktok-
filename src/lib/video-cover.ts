import { mapOneVideoPayload } from "@/lib/providers/tikhub-adapter";
import { getTikHubProvider } from "@/lib/providers/TikHubProvider";

export function parseAwemeIdFromVideoUrl(videoUrl: string) {
  return videoUrl.match(/\/video\/(\d+)/)?.[1] ?? null;
}

export function parseHandleFromVideoUrl(videoUrl: string) {
  return videoUrl.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i)?.[1] ?? "unknown";
}

async function fetchCoverFromOembed(videoUrl: string) {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
  const response = await fetch(oembedUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; TikTokTracker/1.0)",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { thumbnail_url?: string };
  return payload.thumbnail_url?.trim() || null;
}

async function fetchCoverFromTikHub(videoUrl: string) {
  const awemeId = parseAwemeIdFromVideoUrl(videoUrl);
  if (!awemeId) return null;

  try {
    const handle = parseHandleFromVideoUrl(videoUrl);
    const payload = await getTikHubProvider().fetchOneVideoV2(awemeId);
    const mapped = mapOneVideoPayload(payload, handle);
    return mapped?.thumbnailUrl ?? null;
  } catch {
    return null;
  }
}

export async function resolveVideoCoverUrl(videoUrl: string) {
  const oembedCover = await fetchCoverFromOembed(videoUrl);
  if (oembedCover) return oembedCover;

  return fetchCoverFromTikHub(videoUrl);
}
