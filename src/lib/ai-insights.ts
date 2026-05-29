import { formatCompact, type ApiAccount } from "@/lib/accounts";
import { buildTagStats, flattenVideosFromAccounts, type ContentVideo } from "@/lib/content-analytics";

export type PostingTimeSlot = {
  label: string;
  hour: number;
  score: number;
  videoCount: number;
};

export type HashtagInsight = {
  tag: string;
  videoCount: number;
  avgEngagement: number;
  totalViews: number;
  reason?: string;
};

export type ContentTypeInsight = {
  type: string;
  label: string;
  videoCount: number;
  avgViews: number;
  avgEngagement: number;
  description?: string;
  examples: string[];
};

export type ViralVideoInsight = {
  title: string;
  accountHandle: string;
  viewsLabel: string;
  engagementLabel: string;
  reason?: string;
};

export type AiInsightsPayload = {
  generatedAt: string;
  source: "gemini" | "heuristic";
  summary: string;
  bestPostingTime: {
    recommendation: string;
    slots: PostingTimeSlot[];
  };
  bestHashtags: HashtagInsight[];
  topContentType: ContentTypeInsight;
  engagementInsights: string[];
  contentOptimization: string[];
  viralVideoAnalysis: ViralVideoInsight[];
  growthRecommendations: string[];
};

type ContentTypeKey = "tutorial" | "story" | "product" | "trend" | "general";

const contentTypeLabels: Record<ContentTypeKey, string> = {
  tutorial: "教程 / Tips",
  story: "日常 / Story",
  product: "测评 / 种草",
  trend: "热点 / Challenge",
  general: "综合内容",
};

function classifyContentType(title: string): ContentTypeKey {
  const text = title.toLowerCase();

  if (/教程|tips|how to|guide|教学|方法/.test(text)) return "tutorial";
  if (/vlog|day in|日常|生活|story|一天/.test(text)) return "story";
  if (/review|测评|开箱|unbox|好物|推荐/.test(text)) return "product";
  if (/trend|viral|challenge|热点|挑战|梗/.test(text)) return "trend";

  return "general";
}

export function buildAiInsightsContext(accounts: ApiAccount[]) {
  const videos = flattenVideosFromAccounts(accounts);
  const accountCount = accounts.length;
  const totalFollowers = accounts.reduce((sum, account) => sum + (account.followers_count ?? 0), 0);
  const totalViews = videos.reduce((sum, video) => sum + video.viewsCount, 0);
  const avgEngagement =
    videos.length > 0 ? videos.reduce((sum, video) => sum + video.engagementRate, 0) / videos.length : 0;

  const topVideos = [...videos]
    .sort((left, right) => right.performanceScore - left.performanceScore)
    .slice(0, 10)
    .map((video) => ({
      title: video.title,
      handle: video.accountHandle,
      views: video.viewsCount,
      engagement: video.engagementRate,
      postedAt: video.postedAt,
      tags: video.tags,
      contentType: classifyContentType(video.title),
    }));

  const hourBuckets = new Map<number, { views: number; engagement: number; count: number }>();

  for (const video of videos) {
    if (!video.postedAt) continue;
    const hour = new Date(video.postedAt).getHours();
    const current = hourBuckets.get(hour) ?? { views: 0, engagement: 0, count: 0 };
    current.views += video.viewsCount;
    current.engagement += video.engagementRate;
    current.count += 1;
    hourBuckets.set(hour, current);
  }

  const postingByHour = [...hourBuckets.entries()]
    .map(([hour, stats]) => ({
      hour,
      avgViews: stats.count ? stats.views / stats.count : 0,
      avgEngagement: stats.count ? stats.engagement / stats.count : 0,
      videoCount: stats.count,
      score: stats.count ? stats.views / stats.count + stats.engagement / stats.count : 0,
    }))
    .sort((left, right) => right.score - left.score);

  const tagStats = buildTagStats(videos, 12);

  const contentTypes = new Map<ContentTypeKey, { count: number; views: number; engagement: number; titles: string[] }>();

  for (const video of videos) {
    const key = classifyContentType(video.title);
    const current = contentTypes.get(key) ?? { count: 0, views: 0, engagement: 0, titles: [] };
    current.count += 1;
    current.views += video.viewsCount;
    current.engagement += video.engagementRate;
    if (current.titles.length < 3) current.titles.push(video.title);
    contentTypes.set(key, current);
  }

  const contentTypeRanking = [...contentTypes.entries()]
    .map(([type, stats]) => ({
      type,
      label: contentTypeLabels[type],
      videoCount: stats.count,
      avgViews: stats.count ? stats.views / stats.count : 0,
      avgEngagement: stats.count ? stats.engagement / stats.count : 0,
      examples: stats.titles,
    }))
    .sort((left, right) => right.avgViews - left.avgViews);

  return {
    accountCount,
    videoCount: videos.length,
    totalFollowers,
    totalViews,
    avgEngagement,
    topVideos,
    postingByHour,
    tagStats,
    contentTypeRanking,
    videos,
  };
}

export type AiInsightsContext = ReturnType<typeof buildAiInsightsContext>;

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function buildHeuristicInsights(context: AiInsightsContext): AiInsightsPayload {
  const topSlots: PostingTimeSlot[] = context.postingByHour.slice(0, 5).map((slot) => ({
    label: formatHourLabel(slot.hour),
    hour: slot.hour,
    score: Number(slot.score.toFixed(1)),
    videoCount: slot.videoCount,
  }));

  const bestHour = context.postingByHour[0];
  const bestPostingRecommendation = bestHour
    ? `建议在 ${formatHourLabel(bestHour.hour)} 前后发布（该时段平均播放 ${formatCompact(bestHour.avgViews)}，互动率约 ${bestHour.avgEngagement.toFixed(2)}%）。`
    : "数据不足，建议先同步更多视频后再分析发布时间。";

  const bestHashtags: HashtagInsight[] = context.tagStats.slice(0, 8).map((tag) => ({
    tag: tag.tag,
    videoCount: tag.count,
    avgEngagement: tag.avgEngagement,
    totalViews: tag.totalViews,
    reason: `出现 ${tag.count} 次，平均互动率 ${tag.avgEngagement.toFixed(2)}%`,
  }));

  const topType = context.contentTypeRanking[0] ?? {
    type: "general" as ContentTypeKey,
    label: contentTypeLabels.general,
    videoCount: 0,
    avgViews: 0,
    avgEngagement: 0,
    examples: [],
  };

  const viralThreshold = Math.max(
    context.videos.length
      ? [...context.videos].sort((a, b) => a.viewsCount - b.viewsCount)[
          Math.floor(context.videos.length * 0.85)
        ]?.viewsCount ?? 0
      : 0,
    50_000,
  );

  const viralVideos = [...context.videos]
    .filter((video) => video.viewsCount >= viralThreshold)
    .sort((left, right) => right.viewsCount - left.viewsCount)
    .slice(0, 5);

  const engagementInsights = [
    `当前平均互动率为 ${context.avgEngagement.toFixed(2)}%，共分析 ${context.videoCount} 条视频。`,
    topType.videoCount > 0
      ? `表现最好的内容类型为「${topType.label}」，平均播放 ${formatCompact(topType.avgViews)}。`
      : "暂无足够样本判断内容类型表现。",
    bestHashtags[0]
      ? `标签 ${bestHashtags[0].tag} 关联内容互动率较高（${bestHashtags[0].avgEngagement.toFixed(2)}%）。`
      : "建议在标题中增加 2–3 个垂直领域标签以提升发现率。",
  ];

  const contentOptimization = [
    "标题前 30 字突出痛点或结果，并保留 1 个核心关键词 + 1 个热门标签。",
    "高播放视频可复用相同结构（开场钩子 → 价值点 → 行动号召）。",
    "对互动率低于平均的视频，尝试缩短前 3 秒并增加字幕/贴纸提升完播。",
    bestHour ? `优先在 ${formatHourLabel(bestHour.hour)} 时段发布，并与粉丝活跃时区对齐。` : "同步更多带发布时间的视频以优化排期。",
  ];

  const growthRecommendations = [
    context.accountCount > 1
      ? "对比各账号同期播放增速，将资源向增速最高的账号倾斜。"
      : "可增加 1–2 个同赛道对标账号进行横向对比。",
    viralVideos.length > 0
      ? `近期有 ${viralVideos.length} 条高播放视频，建议做系列化续集承接流量。`
      : "尝试提高发布频率并测试 2–3 种不同内容结构，寻找爆款模板。",
    `总粉丝 ${formatCompact(context.totalFollowers)}，建议每周固定 3–5 条更新以维持推荐权重。`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    source: "heuristic",
    summary: `基于 ${context.accountCount} 个账号、${context.videoCount} 条视频：总播放 ${formatCompact(context.totalViews)}，平均互动率 ${context.avgEngagement.toFixed(2)}%。${topType.label} 类内容当前表现最佳，建议围绕高互动标签与优选时段持续迭代。`,
    bestPostingTime: {
      recommendation: bestPostingRecommendation,
      slots: topSlots.length ? topSlots : [{ label: "—", hour: 0, score: 0, videoCount: 0 }],
    },
    bestHashtags,
    topContentType: {
      type: topType.type,
      label: topType.label,
      videoCount: topType.videoCount,
      avgViews: topType.avgViews,
      avgEngagement: topType.avgEngagement,
      description: `该类型共 ${topType.videoCount} 条视频，播放与互动综合表现领先。`,
      examples: topType.examples,
    },
    engagementInsights,
    contentOptimization,
    viralVideoAnalysis: viralVideos.map((video) => ({
      title: video.title,
      accountHandle: video.accountHandle,
      viewsLabel: video.viewsLabel,
      engagementLabel: video.engagementLabel,
      reason: `播放 ${video.viewsLabel}，互动率 ${video.engagementLabel}，标签：${video.tags.slice(0, 3).join(" ") || "无"}`,
    })),
    growthRecommendations,
  };
}

/** Compact payload for LLM prompts to reduce input tokens. */
export function serializeContextForPrompt(context: AiInsightsContext) {
  return JSON.stringify({
    accounts: context.accountCount,
    videos: context.videoCount,
    followers: context.totalFollowers,
    views: context.totalViews,
    avgEngagement: Number(context.avgEngagement.toFixed(2)),
    topVideos: context.topVideos.slice(0, 8).map((video) => ({
      title: video.title.slice(0, 72),
      handle: video.handle,
      views: video.views,
      engagement: Number(video.engagement.toFixed(2)),
      hour: video.postedAt ? new Date(video.postedAt).getHours() : null,
      tags: video.tags.slice(0, 3),
      type: video.contentType,
    })),
    postingHours: context.postingByHour.slice(0, 6).map((slot) => ({
      hour: slot.hour,
      avgViews: Math.round(slot.avgViews),
      avgEngagement: Number(slot.avgEngagement.toFixed(1)),
      count: slot.videoCount,
    })),
    tags: context.tagStats.slice(0, 8).map((tag) => ({
      tag: tag.tag,
      count: tag.count,
      engagement: Number(tag.avgEngagement.toFixed(1)),
    })),
    contentTypes: context.contentTypeRanking.slice(0, 4).map((type) => ({
      label: type.label,
      count: type.videoCount,
      avgViews: Math.round(type.avgViews),
      avgEngagement: Number(type.avgEngagement.toFixed(1)),
    })),
  });
}
