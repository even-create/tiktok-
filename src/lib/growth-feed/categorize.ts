import type { GrowthFeedCategory } from "@/lib/growth-feed/types";

const rules: Array<{ category: GrowthFeedCategory; pattern: RegExp }> = [
  { category: "Hook Strategy", pattern: /hook|opening|first\s*3|开头|吸睛|intro/i },
  { category: "Retention", pattern: /retention|watch\s*time|完播|留存|hold|audience/i },
  { category: "Viral Structure", pattern: /viral|trend|爆款|structure|format|storytelling|challenge/i },
  { category: "Posting Strategy", pattern: /post(ing)?\s*time|schedule|frequency|发布|cadence|when\s+to\s+post/i },
  { category: "Algorithm", pattern: /algorithm|fyp|for\s*you|推荐|reach|distribution/i },
];

export function categorizeGrowthContent(title: string, excerpt: string): GrowthFeedCategory {
  const text = `${title} ${excerpt}`;

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return rule.category;
    }
  }

  return "Growth Tips";
}
