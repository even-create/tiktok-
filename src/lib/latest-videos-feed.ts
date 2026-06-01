import type { ContentVideo } from "@/lib/content-analytics";
import { getBeijingTimestamp } from "@/lib/format-beijing-time";
import type { QualityTier } from "@/lib/content-quality";

export type FeedAccountOption = {
  handle: string;
  displayName: string;
};

export type FeedSortMode = "posted" | "views";

export const qualityTierEmoji: Record<QualityTier, string> = {
  viral: "🔥",
  "high-potential": "🚀",
  weak: "⚠",
};

export const qualityTierDisplayLabel: Record<QualityTier, string> = {
  viral: "Viral",
  "high-potential": "High Potential",
  weak: "Weak Performance",
};

export function sortVideosByPostedAt<T extends ContentVideo>(videos: T[]): T[] {
  return [...videos].sort((left, right) => {
    const leftTime = left.postedAt ? (getBeijingTimestamp(left.postedAt) ?? 0) : 0;
    const rightTime = right.postedAt ? (getBeijingTimestamp(right.postedAt) ?? 0) : 0;
    return rightTime - leftTime;
  });
}

export function filterVideosByAccountHandle(videos: ContentVideo[], handle: string) {
  if (!handle || handle === "all") return videos;
  return videos.filter((video) => video.accountHandle === handle);
}

export function buildFeedAccountOptions(videos: ContentVideo[]): FeedAccountOption[] {
  const map = new Map<string, FeedAccountOption>();

  for (const video of videos) {
    if (!map.has(video.accountHandle)) {
      map.set(video.accountHandle, {
        handle: video.accountHandle,
        displayName: video.accountDisplayName,
      });
    }
  }

  return [...map.values()].sort((left, right) => left.handle.localeCompare(right.handle));
}
