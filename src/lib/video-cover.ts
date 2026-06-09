import { mapOneVideoPayload } from "@/lib/providers/tikhub-adapter";
import { normalizeMediaUrl } from "@/lib/providers/parse-utils";
import { getTikHubProvider } from "@/lib/providers/TikHubProvider";
import { tikhubRequest } from "@/lib/tikhub";

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
  return normalizeMediaUrl(payload.thumbnail_url);
}

async function fetchCoverFromTikHub(videoUrl: string) {
  const awemeId = parseAwemeIdFromVideoUrl(videoUrl);
  if (!awemeId) return null;

  try {
    const handle = parseHandleFromVideoUrl(videoUrl);
    const payload = await getTikHubProvider().fetchOneVideoV2(awemeId);
    const mapped = mapOneVideoPayload(payload, handle);
    return normalizeMediaUrl(mapped?.thumbnailUrl);
  } catch {
    return null;
  }
}

async function fetchCoverFromDouyin(videoUrl: string) {
  const awemeId = parseAwemeIdFromVideoUrl(videoUrl);
  if (!awemeId) return null;

  try {
    const payload = await tikhubRequest({
      path: "/api/v1/douyin/app/v3/fetch_one_video",
      query: { aweme_id: awemeId },
    });
    const mapped = mapOneVideoPayload(payload, "unknown");
    return normalizeMediaUrl(mapped?.thumbnailUrl);
  } catch {
    return null;
  }
}

export async function resolveVideoCoverUrl(videoUrl: string) {
  if (/tiktok\.com/i.test(videoUrl)) {
    const oembedCover = await fetchCoverFromOembed(videoUrl);
    if (oembedCover) return oembedCover;
    return fetchCoverFromTikHub(videoUrl);
  }

  if (/douyin\.com/i.test(videoUrl)) {
    return fetchCoverFromDouyin(videoUrl);
  }

  return null;
}
