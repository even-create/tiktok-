import { categorizeGrowthContent } from "@/lib/growth-feed/categorize";
import { parseFeedXml, truncateExcerpt } from "@/lib/growth-feed/rss";
import type { GrowthFeedItem, GrowthFeedSource } from "@/lib/growth-feed/types";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = "TikTokGrowthFeed/1.0 (+https://github.com/even-create/tiktok-)";

type RawFeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

function hashId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `gf-${Math.abs(hash)}`;
}

function normalizeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function toFeedItem(
  source: GrowthFeedSource,
  sourceLabel: string,
  raw: RawFeedItem,
): GrowthFeedItem | null {
  if (!raw.title || !raw.link) return null;

  const excerpt = truncateExcerpt(raw.description || raw.title);

  return {
    id: hashId(raw.link),
    title: raw.title.trim(),
    source,
    sourceLabel,
    url: raw.link.trim(),
    publishedAt: normalizeDate(raw.pubDate),
    category: categorizeGrowthContent(raw.title, excerpt),
    excerpt,
  };
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchReddit(subreddit: string, sort: "hot" | "new" | "top", limit: number) {
  const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
  const text = await fetchText(url);
  const payload = JSON.parse(text) as {
    data?: { children?: Array<{ data?: { title?: string; permalink?: string; created_utc?: number; selftext?: string } }> };
  };

  return (payload.data?.children ?? [])
    .map((child) => child.data)
    .filter((data): data is NonNullable<typeof data> => Boolean(data?.title && data.permalink))
    .map((data) => ({
      title: data.title ?? "",
      link: `https://www.reddit.com${data.permalink}`,
      pubDate: new Date((data.created_utc ?? 0) * 1000).toISOString(),
      description: truncateExcerpt((data.selftext ?? "").trim() || data.title || ""),
    }));
}

async function fetchRss(url: string, limit: number) {
  const xml = await fetchText(url);
  return parseFeedXml(xml, limit);
}

export async function fetchRedditGrowthItems() {
  const batches = await Promise.allSettled([
    fetchReddit("Tiktokhelp", "hot", 5),
    fetchReddit("socialmedia", "hot", 4),
    fetchReddit("marketing", "new", 4),
  ]);

  const items: GrowthFeedItem[] = [];

  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue;
    for (const raw of batch.value) {
      const item = toFeedItem("reddit", "Reddit", raw);
      if (item) items.push(item);
    }
  }

  return items;
}

export async function fetchMediumGrowthItems() {
  const feeds = [
    "https://medium.com/feed/tag/tiktok",
    "https://medium.com/feed/tag/tiktok-marketing",
    "https://medium.com/feed/tag/social-media-growth",
  ];

  const items: GrowthFeedItem[] = [];

  for (const feedUrl of feeds) {
    try {
      const rows = await fetchRss(feedUrl, 4);
      for (const raw of rows) {
        const item = toFeedItem("medium", "Medium", raw);
        if (item) items.push(item);
      }
    } catch {
      // skip failed feed
    }
  }

  return items;
}

export async function fetchYouTubeGrowthItems() {
  const feeds = [
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCbmNph6atAckjgdRkIFokQ",
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ",
  ];

  const items: GrowthFeedItem[] = [];

  for (const feedUrl of feeds) {
    try {
      const rows = await fetchRss(feedUrl, 5);
      for (const raw of rows) {
        const item = toFeedItem("youtube", "YouTube", {
          ...raw,
          description: raw.description || "Creator growth & short-form video strategy.",
        });
        if (item) items.push(item);
      }
    } catch {
      // skip failed feed
    }
  }

  return items;
}

export async function fetchTikTokBlogGrowthItems() {
  const feeds = [
    "https://newsroom.tiktok.com/en-us/rss.xml",
    "https://newsroom.tiktok.com/rss.xml",
    "https://www.tiktok.com/business/en/blog/rss",
  ];

  const items: GrowthFeedItem[] = [];

  for (const feedUrl of feeds) {
    try {
      const rows = await fetchRss(feedUrl, 6);
      for (const raw of rows) {
        const item = toFeedItem("tiktok-blog", "TikTok Blog", raw);
        if (item) items.push(item);
      }
      if (items.length) break;
    } catch {
      // try next feed url
    }
  }

  return items;
}

export async function aggregateGrowthFeedItems() {
  const results = await Promise.allSettled([
    fetchRedditGrowthItems(),
    fetchMediumGrowthItems(),
    fetchYouTubeGrowthItems(),
    fetchTikTokBlogGrowthItems(),
  ]);

  const merged: GrowthFeedItem[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      merged.push(item);
    }
  }

  return merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 32);
}
