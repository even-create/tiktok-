import { PLATFORM_LABELS, type Platform } from "@/lib/providers/platform";

const PLATFORM_STYLES: Record<Platform, string> = {
  tiktok: "bg-[#111]/90 text-white",
  douyin: "bg-[#161823] text-[#fe2c55]",
  xiaohongshu: "bg-[#ff2442] text-white",
  instagram: "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
};

export function PlatformBadge({ platform, className = "" }: { platform: Platform; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${PLATFORM_STYLES[platform]} ${className}`.trim()}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
