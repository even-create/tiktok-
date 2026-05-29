import { resolveGeminiApiKey } from "@/lib/app-settings";
import { buildHeuristicGrowthSummary } from "@/lib/growth-feed/heuristic-summary";
import type { GrowthFeedAiSummary, GrowthFeedItem } from "@/lib/growth-feed/types";

const DEFAULT_MODEL = "gemini-2.0-flash";
const REQUEST_TIMEOUT_MS = 28_000;

function serializeItemsForPrompt(items: GrowthFeedItem[]) {
  return JSON.stringify(
    items.slice(0, 18).map((item) => ({
      title: item.title,
      source: item.sourceLabel,
      category: item.category,
      excerpt: item.excerpt.slice(0, 160),
    })),
  );
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as Record<string, unknown>;
}

export async function generateGrowthFeedSummary(items: GrowthFeedItem[]): Promise<{
  summary: GrowthFeedAiSummary;
  model: string;
  warning?: string;
}> {
  const fallback = buildHeuristicGrowthSummary(items);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const apiKey = await resolveGeminiApiKey();

  if (!apiKey || items.length === 0) {
    return {
      summary: fallback,
      model,
      warning: apiKey ? undefined : "未配置 Gemini，已使用本地规则摘要。",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "你是 TikTok 增长策略分析师。仅根据提供的标题与短摘要（非全文）输出可执行的中文策略总结。只返回 JSON，不要 markdown。",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `根据以下聚合条目（仅标题+短摘要），输出 JSON：
{
  "hookStrategy": "2-3句",
  "retentionStrategy": "2-3句",
  "viralStructure": "2-3句",
  "postingStrategy": "2-3句"
}
条目：${serializeItemsForPrompt(items)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!content) {
      throw new Error("Gemini 未返回摘要");
    }

    const parsed = extractJsonObject(content);

    return {
      summary: {
        hookStrategy:
          typeof parsed.hookStrategy === "string" && parsed.hookStrategy.trim()
            ? parsed.hookStrategy
            : fallback.hookStrategy,
        retentionStrategy:
          typeof parsed.retentionStrategy === "string" && parsed.retentionStrategy.trim()
            ? parsed.retentionStrategy
            : fallback.retentionStrategy,
        viralStructure:
          typeof parsed.viralStructure === "string" && parsed.viralStructure.trim()
            ? parsed.viralStructure
            : fallback.viralStructure,
        postingStrategy:
          typeof parsed.postingStrategy === "string" && parsed.postingStrategy.trim()
            ? parsed.postingStrategy
            : fallback.postingStrategy,
        source: "gemini",
        generatedAt: new Date().toISOString(),
      },
      model,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini 摘要失败";
    return {
      summary: fallback,
      model,
      warning: `Gemini 摘要失败，已回退本地规则：${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
