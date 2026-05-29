import type { LineChartPoint } from "@/components/dashboard/line-chart";
import type { ContentVideo } from "@/lib/content-analytics";

export type QualityTier = "viral" | "high-potential" | "weak";

export type VideoQualityScores = {
  engagementScore: number;
  viralScore: number;
  retentionProxy: number;
  hookStrength: number;
  qualityTier: QualityTier;
  qualityLabel: string;
  retentionRate: number | null;
};

export type ContentVideoWithQuality = ContentVideo & VideoQualityScores;

export type QualityTierCounts = Record<QualityTier, number>;

export type QualityAnalyticsSummary = {
  avgEngagementScore: number;
  avgViralScore: number;
  avgRetentionProxy: number;
  avgHookStrength: number;
  tierCounts: QualityTierCounts;
};

export type QualityTrendSeries = {
  engagementPoints: LineChartPoint[];
  viralPoints: LineChartPoint[];
  retentionPoints: LineChartPoint[];
  hookPoints: LineChartPoint[];
  tierBars: Array<{ label: string; viral: number; highPotential: number; weak: number }>;
};

const tierLabels: Record<QualityTier, string> = {
  viral: "Viral",
  "high-potential": "High Potential",
  weak: "Weak Performance",
};

function clampScore(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function percentileRank(values: number[], value: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((item) => item < value).length;
  return (below / sorted.length) * 100;
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function classifyTier(
  engagementScore: number,
  viralScore: number,
  retentionProxy: number,
  hookStrength: number,
  viewsPercentile: number,
): QualityTier {
  if (viralScore >= 68 || viewsPercentile >= 90) {
    return "viral";
  }

  if (engagementScore < 36 && viralScore < 38 && hookStrength < 40) {
    return "weak";
  }

  if (engagementScore >= 52 || hookStrength >= 55 || retentionProxy >= 50) {
    return "high-potential";
  }

  if (viralScore < 42 && retentionProxy < 42) {
    return "weak";
  }

  return "high-potential";
}

export function enrichVideosWithQuality(videos: ContentVideo[]): ContentVideoWithQuality[] {
  if (!videos.length) return [];

  const engagementRates = videos.map((video) => video.engagementRate);
  const logViews = videos.map((video) => Math.log10(video.viewsCount + 1));
  const likeRates = videos.map((video) => safeRate(video.likesCount, video.viewsCount));
  const commentRates = videos.map((video) => safeRate(video.commentsCount, video.viewsCount));
  const shareRates = videos.map((video) => safeRate(video.sharesCount, video.viewsCount));

  const retentionProxiesRaw = videos.map((video) => {
    if (typeof video.retentionRate === "number" && Number.isFinite(video.retentionRate)) {
      return Math.min(100, video.retentionRate);
    }

    return (
      safeRate(video.commentsCount + video.sharesCount * 2, video.viewsCount) * 12_000 +
      safeRate(video.likesCount, video.viewsCount) * 2_500
    );
  });

  return videos.map((video, index) => {
    const likeRate = safeRate(video.likesCount, video.viewsCount);
    const commentRate = safeRate(video.commentsCount, video.viewsCount);
    const shareRate = safeRate(video.sharesCount, video.viewsCount);
    const viewsPercentile = percentileRank(logViews, Math.log10(video.viewsCount + 1));

    const engagementScore = clampScore(
      percentileRank(engagementRates, video.engagementRate) * 0.75 + Math.min(video.engagementRate * 8, 25),
    );

    const viralScore = clampScore(
      viewsPercentile * 0.5 +
        percentileRank(shareRates, shareRate) * 0.28 +
        percentileRank(commentRates, commentRate) * 0.22,
    );

    const retentionProxy = clampScore(
      typeof video.retentionRate === "number" && Number.isFinite(video.retentionRate)
        ? video.retentionRate
        : percentileRank(retentionProxiesRaw, retentionProxiesRaw[index] ?? 0) * 0.65 +
            Math.min((commentRate + shareRate * 2) * 900, 35),
    );

    const hookStrength = clampScore(
      percentileRank(likeRates, likeRate) * 0.45 +
        percentileRank(commentRates, commentRate) * 0.3 +
        percentileRank(shareRates, shareRate) * 0.25,
    );

    const qualityTier = classifyTier(engagementScore, viralScore, retentionProxy, hookStrength, viewsPercentile);

    return {
      ...video,
      engagementScore,
      viralScore,
      retentionProxy,
      hookStrength,
      qualityTier,
      qualityLabel: tierLabels[qualityTier],
      retentionRate: video.retentionRate,
    };
  });
}

export function buildQualitySummary(videos: ContentVideoWithQuality[]): QualityAnalyticsSummary {
  if (!videos.length) {
    return {
      avgEngagementScore: 0,
      avgViralScore: 0,
      avgRetentionProxy: 0,
      avgHookStrength: 0,
      tierCounts: { viral: 0, "high-potential": 0, weak: 0 },
    };
  }

  const tierCounts: QualityTierCounts = { viral: 0, "high-potential": 0, weak: 0 };

  for (const video of videos) {
    tierCounts[video.qualityTier] += 1;
  }

  return {
    avgEngagementScore: videos.reduce((sum, video) => sum + video.engagementScore, 0) / videos.length,
    avgViralScore: videos.reduce((sum, video) => sum + video.viralScore, 0) / videos.length,
    avgRetentionProxy: videos.reduce((sum, video) => sum + video.retentionProxy, 0) / videos.length,
    avgHookStrength: videos.reduce((sum, video) => sum + video.hookStrength, 0) / videos.length,
    tierCounts,
  };
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function buildQualityTrends(videos: ContentVideoWithQuality[]): QualityTrendSeries {
  const buckets = new Map<
    string,
    {
      label: string;
      sortKey: number;
      engagement: number[];
      viral: number[];
      retention: number[];
      hook: number[];
      tiers: QualityTierCounts;
    }
  >();

  for (const video of videos) {
    if (!video.postedAt) continue;
    const posted = new Date(video.postedAt);
    if (Number.isNaN(posted.getTime())) continue;

    const weekStart = startOfWeek(posted);
    const key = weekStart.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(weekStart);

    const bucket = buckets.get(key) ?? {
      label,
      sortKey: weekStart.getTime(),
      engagement: [],
      viral: [],
      retention: [],
      hook: [],
      tiers: { viral: 0, "high-potential": 0, weak: 0 },
    };

    bucket.engagement.push(video.engagementScore);
    bucket.viral.push(video.viralScore);
    bucket.retention.push(video.retentionProxy);
    bucket.hook.push(video.hookStrength);
    bucket.tiers[video.qualityTier] += 1;
    buckets.set(key, bucket);
  }

  const ordered = [...buckets.values()].sort((a, b) => a.sortKey - b.sortKey).slice(-8);

  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return {
    engagementPoints: ordered.map((bucket) => ({
      label: bucket.label,
      value: Math.round(average(bucket.engagement)),
    })),
    viralPoints: ordered.map((bucket) => ({
      label: bucket.label,
      value: Math.round(average(bucket.viral)),
    })),
    retentionPoints: ordered.map((bucket) => ({
      label: bucket.label,
      value: Math.round(average(bucket.retention)),
    })),
    hookPoints: ordered.map((bucket) => ({
      label: bucket.label,
      value: Math.round(average(bucket.hook)),
    })),
    tierBars: ordered.map((bucket) => ({
      label: bucket.label,
      viral: bucket.tiers.viral,
      highPotential: bucket.tiers["high-potential"],
      weak: bucket.tiers.weak,
    })),
  };
}

export function pickVideosByTier(videos: ContentVideoWithQuality[], tier: QualityTier, limit = 5) {
  const filtered = videos.filter((video) => video.qualityTier === tier);

  const sorted = [...filtered].sort((left, right) => {
    if (tier === "viral") return right.viralScore - left.viralScore;
    if (tier === "high-potential") {
      return right.engagementScore + right.hookStrength - (left.engagementScore + left.hookStrength);
    }
    return left.engagementScore + left.viralScore - (right.engagementScore + right.viralScore);
  });

  return sorted.slice(0, limit);
}

export const qualityTierStyles: Record<
  QualityTier,
  { badge: string; dot: string }
> = {
  viral: {
    badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  "high-potential": {
    badge: "bg-[color-mix(in_srgb,var(--carolina-blue)_18%,white)] text-[var(--space-cadet)] dark:text-[var(--carolina-blue)]",
    dot: "bg-[var(--carolina-blue)]",
  },
  weak: {
    badge: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};
