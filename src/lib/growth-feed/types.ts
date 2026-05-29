export type GrowthFeedSource = "reddit" | "medium" | "youtube" | "tiktok-blog";

export type GrowthFeedCategory =
  | "Hook Strategy"
  | "Retention"
  | "Viral Structure"
  | "Posting Strategy"
  | "Algorithm"
  | "Growth Tips";

export type GrowthFeedItem = {
  id: string;
  title: string;
  source: GrowthFeedSource;
  sourceLabel: string;
  url: string;
  publishedAt: string;
  category: GrowthFeedCategory;
  /** Short teaser only — never the full article body. */
  excerpt: string;
};

export type GrowthFeedAiSummary = {
  hookStrategy: string;
  retentionStrategy: string;
  viralStructure: string;
  postingStrategy: string;
  source: "gemini" | "heuristic";
  generatedAt: string;
};

export type GrowthFeedResponse = {
  items: GrowthFeedItem[];
  summary: GrowthFeedAiSummary;
  fetchedAt: string;
  model?: string;
  warning?: string;
  sourceStats: Record<GrowthFeedSource, number>;
};
