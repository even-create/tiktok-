import type { GrowthFeedResponse } from "@/lib/growth-feed/types";

const CACHE_TTL_MS = 30 * 60 * 1000;

let cached: { expiresAt: number; payload: GrowthFeedResponse } | null = null;

export function getCachedGrowthFeed() {
  if (!cached || Date.now() > cached.expiresAt) {
    return null;
  }
  return cached.payload;
}

export function setCachedGrowthFeed(payload: GrowthFeedResponse) {
  cached = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  };
}

export function clearGrowthFeedCache() {
  cached = null;
}
