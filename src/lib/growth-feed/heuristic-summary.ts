import type { GrowthFeedAiSummary, GrowthFeedItem } from "@/lib/growth-feed/types";

function topTitles(items: GrowthFeedItem[], category: GrowthFeedItem["category"], limit = 2) {
  return items
    .filter((item) => item.category === category)
    .slice(0, limit)
    .map((item) => `「${item.title}」`)
    .join("、");
}

export function buildHeuristicGrowthSummary(items: GrowthFeedItem[]): GrowthFeedAiSummary {
  const hookRefs = topTitles(items, "Hook Strategy");
  const retentionRefs = topTitles(items, "Retention");
  const viralRefs = topTitles(items, "Viral Structure");
  const postingRefs = topTitles(items, "Posting Strategy");

  return {
    hookStrategy: hookRefs
      ? `近期讨论强调前 3 秒明确价值主张与视觉反差。参考：${hookRefs}。建议每条视频开头直接展示结果或冲突。`
      : "用问题、反差画面或结果前置抓住前 3 秒；避免冗长铺垫，标题与封面需与开头画面一致。",
    retentionStrategy: retentionRefs
      ? `完播与中段留存被多次提及。参考：${retentionRefs}。建议在 8–15 秒设置情节转折或信息增量。`
      : "中段加入转折、清单递进或「接下来更重要」提示；控制单镜头时长，用字幕强化关键信息。",
    viralStructure: viralRefs
      ? `爆款结构讨论集中在叙事节奏与可模仿模板。参考：${viralRefs}。推荐问题—演示—结论三段式。`
      : "采用可复制的叙事骨架：痛点 → 快速演示 → CTA；结合趋势音频但替换自有脚本。",
    postingStrategy: postingRefs
      ? `发布节奏与测试窗口是热点话题。参考：${postingRefs}。建议固定 3–5 个发布窗口并保留 20% 流量做 A/B。`
      : "保持稳定发布频率（如每周 4–6 条），在受众活跃时段发布；新账号优先积累 10–15 条再判断爆款方向。",
    source: "heuristic",
    generatedAt: new Date().toISOString(),
  };
}
