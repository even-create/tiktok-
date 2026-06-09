export type Platform = "tiktok" | "douyin" | "xiaohongshu" | "instagram";

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  douyin: "抖音",
  xiaohongshu: "小红书",
  instagram: "Instagram",
};

/** Platforms whose primary engagement metric is play/view count. */
export const VIEW_PRIMARY_PLATFORMS: ReadonlySet<Platform> = new Set<Platform>(["tiktok", "douyin"]);

export type PrimaryMetric = {
  key: "views" | "likes";
  label: string;
};

export function getPrimaryMetric(platform: Platform): PrimaryMetric {
  return VIEW_PRIMARY_PLATFORMS.has(platform)
    ? { key: "views", label: "播放量" }
    : { key: "likes", label: "点赞数" };
}

/** Detect the platform from a pasted URL (or bare handle, which defaults to TikTok). */
export function detectPlatform(input: string): Platform | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;

  if (/(?:^|\.)douyin\.com|iesdouyin\.com/.test(value)) return "douyin";
  if (/xiaohongshu\.com|xhslink\.com/.test(value)) return "xiaohongshu";
  if (/instagram\.com|instagr\.am/.test(value)) return "instagram";
  if (/tiktok\.com/.test(value)) return "tiktok";

  // Bare @handle / username with no domain → assume TikTok (backwards compatible).
  if (/^@?[a-z0-9._]+$/i.test(input.trim())) return "tiktok";

  return null;
}
