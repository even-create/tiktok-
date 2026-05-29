import { NextResponse } from "next/server";
import { clearGrowthFeedCache, getCachedGrowthFeed, setCachedGrowthFeed } from "@/lib/growth-feed/cache";
import { generateGrowthFeedSummary } from "@/lib/growth-feed/gemini-summary";
import { aggregateGrowthFeedItems } from "@/lib/growth-feed/sources";
import type { GrowthFeedSource } from "@/lib/growth-feed/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function countBySource(items: { source: GrowthFeedSource }[]) {
  const stats: Record<GrowthFeedSource, number> = {
    reddit: 0,
    medium: 0,
    youtube: 0,
    "tiktok-blog": 0,
  };

  for (const item of items) {
    stats[item.source] += 1;
  }

  return stats;
}

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";

    if (!refresh) {
      const cached = getCachedGrowthFeed();
      if (cached) {
        return NextResponse.json(cached);
      }
    } else {
      clearGrowthFeedCache();
    }

    const items = await aggregateGrowthFeedItems();
    const { summary, model, warning } = await generateGrowthFeedSummary(items);

    const payload = {
      items,
      summary,
      fetchedAt: new Date().toISOString(),
      model,
      warning:
        warning ??
        (items.length === 0
          ? "部分来源暂时无法访问，请稍后刷新。摘要基于可用条目或本地规则生成。"
          : undefined),
      sourceStats: countBySource(items),
    };

    setCachedGrowthFeed(payload);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Growth Feed 加载失败" },
      { status: 500 },
    );
  }
}
