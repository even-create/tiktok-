import { formatCompact, type ApiAccount, type ApiVideo } from "@/lib/accounts";
import type { LineChartPoint } from "@/components/dashboard/line-chart";

export type TrendsRange = "7d" | "30d" | "90d";

type VideoWithAccount = ApiVideo & {
  accountId: string;
  accountHandle: string;
  accountDisplayName: string;
  accountFollowers: number;
};

type DayBucket = {
  key: string;
  label: string;
  start: number;
  end: number;
};

export type FastestGrowingAccount = {
  handle: string;
  displayName: string;
  growthPercent: number;
  viewsDelta: number;
  viewsLabel: string;
};

export type FrequencyPoint = {
  label: string;
  count: number;
};

export type TrendsInsights = {
  range: TrendsRange;
  rangeLabel: string;
  summary: string;
  highlights: string[];
  followersPoints: LineChartPoint[];
  viewsPoints: LineChartPoint[];
  engagementPoints: LineChartPoint[];
  fastestGrowingAccount: FastestGrowingAccount | null;
  viralFrequency: FrequencyPoint[];
  postingFrequency: FrequencyPoint[];
  stats: {
    totalPosts: number;
    viralCount: number;
    avgPostsPerWeek: number;
    viewsGrowthPercent: number;
    engagementChange: number;
    totalFollowers: number;
  };
};

function calcEngagementRate(likes: number, comments: number, shares: number, views: number) {
  if (views <= 0) return 0;
  return ((likes + comments + shares) / views) * 100;
}

function flattenVideos(accounts: ApiAccount[]): VideoWithAccount[] {
  const items: VideoWithAccount[] = [];

  for (const account of accounts) {
    const displayName = account.display_name?.trim() || account.handle;

    for (const video of account.videos ?? []) {
      items.push({
        ...video,
        accountId: account.id,
        accountHandle: account.handle,
        accountDisplayName: displayName,
        accountFollowers: account.followers_count ?? 0,
      });
    }
  }

  return items;
}

function getRangeDays(range: TrendsRange) {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    default:
      return 90;
  }
}

function getRangeLabel(range: TrendsRange) {
  switch (range) {
    case "7d":
      return "最近 7 天";
    case "30d":
      return "最近 30 天";
    default:
      return "最近 90 天";
  }
}

function buildDayBuckets(range: TrendsRange): DayBucket[] {
  const days = getRangeDays(range);
  const step = range === "90d" ? 7 : 1;
  const bucketCount = range === "90d" ? Math.ceil(days / 7) : days;
  const rangeEnd = Date.now();
  const rangeStart = rangeEnd - days * 24 * 60 * 60 * 1000;
  const buckets: DayBucket[] = [];

  for (let index = 0; index < bucketCount; index += 1) {
    const start = rangeStart + index * step * 24 * 60 * 60 * 1000;
    const end = Math.min(rangeStart + (index + 1) * step * 24 * 60 * 60 * 1000, rangeEnd + 1);
    const labelDate = new Date(end - 1);
    const label =
      range === "90d"
        ? `${labelDate.getMonth() + 1}/${labelDate.getDate()}`
        : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(labelDate);

    buckets.push({
      key: `${start}-${end}`,
      label,
      start,
      end,
    });
  }

  return buckets;
}

function videoPostedTime(video: VideoWithAccount) {
  if (!video.posted_at) return null;
  const time = new Date(video.posted_at).getTime();
  return Number.isNaN(time) ? null : time;
}

function videosInRange(videos: VideoWithAccount[], range: TrendsRange) {
  const days = getRangeDays(range);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return videos.filter((video) => {
    const posted = videoPostedTime(video);
    if (posted === null) return false;
    return posted >= cutoff;
  });
}

function videoInBucket(video: VideoWithAccount, bucket: DayBucket) {
  const posted = videoPostedTime(video);
  if (posted === null) return false;
  return posted >= bucket.start && posted < bucket.end;
}

function buildViewsTrend(videos: VideoWithAccount[], buckets: DayBucket[]): LineChartPoint[] {
  let cumulative = 0;

  return buckets.map((bucket) => {
    const bucketViews = videos
      .filter((video) => videoInBucket(video, bucket))
      .reduce((sum, video) => sum + (video.views_count ?? 0), 0);

    cumulative += bucketViews;

    return {
      label: bucket.label,
      value: cumulative,
    };
  });
}

function buildEngagementTrend(videos: VideoWithAccount[], buckets: DayBucket[]): LineChartPoint[] {
  return buckets.map((bucket) => {
    const bucketVideos = videos.filter((video) => videoInBucket(video, bucket));

    if (!bucketVideos.length) {
      return { label: bucket.label, value: 0 };
    }

    const avg =
      bucketVideos.reduce((sum, video) => {
        const views = video.views_count ?? 0;
        const likes = video.likes_count ?? 0;
        const comments = video.comments_count ?? 0;
        const shares = video.shares_count ?? 0;
        return sum + calcEngagementRate(likes, comments, shares, views);
      }, 0) / bucketVideos.length;

    return {
      label: bucket.label,
      value: Number(avg.toFixed(2)),
    };
  });
}

function buildFollowersTrend(accounts: ApiAccount[], videos: VideoWithAccount[], buckets: DayBucket[]): LineChartPoint[] {
  const totalFollowers = accounts.reduce((sum, account) => sum + (account.followers_count ?? 0), 0);
  const totalViews = videos.reduce((sum, video) => sum + (video.views_count ?? 0), 0);

  let cumulativeViews = 0;
  const startRatio = buckets.length <= 7 ? 0.92 : buckets.length <= 30 ? 0.82 : 0.68;

  return buckets.map((bucket, index) => {
    const bucketViews = videos
      .filter((video) => videoInBucket(video, bucket))
      .reduce((sum, video) => sum + (video.views_count ?? 0), 0);

    cumulativeViews += bucketViews;
    const progress = totalViews > 0 ? cumulativeViews / totalViews : index / Math.max(buckets.length - 1, 1);
    const estimated = Math.round(totalFollowers * (startRatio + (1 - startRatio) * progress));

    return {
      label: bucket.label,
      value: estimated,
    };
  });
}

function findFastestGrowingAccount(videos: VideoWithAccount[], range: TrendsRange): FastestGrowingAccount | null {
  const inRange = videosInRange(videos, range);
  const byAccount = new Map<string, { handle: string; displayName: string; first: number; second: number }>();

  for (const video of inRange) {
    const posted = videoPostedTime(video);
    if (posted === null) continue;

    const days = getRangeDays(range);
    const midpoint = Date.now() - (days / 2) * 24 * 60 * 60 * 1000;
    const views = video.views_count ?? 0;

    const current = byAccount.get(video.accountId) ?? {
      handle: video.accountHandle,
      displayName: video.accountDisplayName,
      first: 0,
      second: 0,
    };

    if (posted < midpoint) {
      current.first += views;
    } else {
      current.second += views;
    }

    byAccount.set(video.accountId, current);
  }

  let best: FastestGrowingAccount | null = null;

  for (const account of byAccount.values()) {
    const viewsDelta = account.second - account.first;
    const growthPercent = account.first > 0 ? (viewsDelta / account.first) * 100 : account.second > 0 ? 100 : 0;

    if (!best || growthPercent > best.growthPercent) {
      best = {
        handle: account.handle,
        displayName: account.displayName,
        growthPercent: Number(growthPercent.toFixed(1)),
        viewsDelta,
        viewsLabel: formatCompact(Math.max(viewsDelta, 0)),
      };
    }
  }

  return best;
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[index];
}

function buildViralFrequency(videos: VideoWithAccount[], buckets: DayBucket[]): FrequencyPoint[] {
  const views = videos.map((video) => video.views_count ?? 0).filter((value) => value > 0);
  const threshold = Math.max(percentile(views, 0.9), 50_000);

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: videos.filter((video) => videoInBucket(video, bucket) && (video.views_count ?? 0) >= threshold).length,
  }));
}

function buildPostingFrequency(videos: VideoWithAccount[], buckets: DayBucket[]): FrequencyPoint[] {
  return buckets.map((bucket) => ({
    label: bucket.label,
    count: videos.filter((video) => videoInBucket(video, bucket)).length,
  }));
}

function buildSummary(
  range: TrendsRange,
  stats: TrendsInsights["stats"],
  fastest: FastestGrowingAccount | null,
): { summary: string; highlights: string[] } {
  const rangeLabel = getRangeLabel(range);
  const highlights: string[] = [];

  highlights.push(
    `${rangeLabel}共发布 ${stats.totalPosts} 条视频，其中爆款（高播放）视频 ${stats.viralCount} 条。`,
  );
  highlights.push(`播放量累计增长 ${stats.viewsGrowthPercent.toFixed(1)}%，平均每周发布 ${stats.avgPostsPerWeek.toFixed(1)} 条。`);

  if (stats.engagementChange >= 0) {
    highlights.push(`互动率较期初提升 ${stats.engagementChange.toFixed(2)} 个百分点。`);
  } else {
    highlights.push(`互动率较期初下降 ${Math.abs(stats.engagementChange).toFixed(2)} 个百分点。`);
  }

  if (fastest) {
    highlights.push(
      `增长最快账号为 @${fastest.handle}（${fastest.displayName}），后半段播放较前半段提升 ${fastest.growthPercent}%。`,
    );
  }

  const summary = `在${rangeLabel}内，内容播放呈${
    stats.viewsGrowthPercent > 10 ? "上升" : stats.viewsGrowthPercent < -5 ? "回落" : "平稳"
  }态势；发布节奏${
    stats.avgPostsPerWeek >= 3 ? "活跃" : stats.avgPostsPerWeek >= 1 ? "适中" : "偏慢"
  }，建议结合爆款频率优化选题与发布时间。`;

  return { summary, highlights };
}

export function buildTrendsInsights(accounts: ApiAccount[], range: TrendsRange): TrendsInsights {
  const allVideos = flattenVideos(accounts);
  const videos = videosInRange(allVideos, range);
  const buckets = buildDayBuckets(range);

  const followersPoints = buildFollowersTrend(accounts, videos, buckets);
  const viewsPoints = buildViewsTrend(videos, buckets);
  const engagementPoints = buildEngagementTrend(videos, buckets);
  const viralFrequency = buildViralFrequency(videos, buckets);
  const postingFrequency = buildPostingFrequency(videos, buckets);
  const fastestGrowingAccount = findFastestGrowingAccount(allVideos, range);

  const viewsStart = viewsPoints[0]?.value ?? 0;
  const viewsEnd = viewsPoints.at(-1)?.value ?? 0;
  const viewsGrowthPercent = viewsStart > 0 ? ((viewsEnd - viewsStart) / viewsStart) * 100 : viewsEnd > 0 ? 100 : 0;

  const engagementStart = engagementPoints.find((point) => point.value > 0)?.value ?? 0;
  const engagementEnd = [...engagementPoints].reverse().find((point) => point.value > 0)?.value ?? 0;
  const engagementChange = engagementEnd - engagementStart;

  const weeks = getRangeDays(range) / 7;
  const viralThreshold = Math.max(
    percentile(
      videos.map((video) => video.views_count ?? 0),
      0.9,
    ),
    50_000,
  );

  const stats = {
    totalPosts: videos.length,
    viralCount: videos.filter((video) => (video.views_count ?? 0) >= viralThreshold).length,
    avgPostsPerWeek: weeks > 0 ? videos.length / weeks : videos.length,
    viewsGrowthPercent,
    engagementChange,
    totalFollowers: accounts.reduce((sum, account) => sum + (account.followers_count ?? 0), 0),
  };

  const { summary, highlights } = buildSummary(range, stats, fastestGrowingAccount);

  return {
    range,
    rangeLabel: getRangeLabel(range),
    summary,
    highlights,
    followersPoints,
    viewsPoints,
    engagementPoints,
    fastestGrowingAccount,
    viralFrequency,
    postingFrequency,
    stats,
  };
}
