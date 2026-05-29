import {
  buildHeuristicInsights,
  type AiInsightsPayload,
  type AiInsightsContext,
  serializeContextForPrompt,
} from "@/lib/ai-insights";
import { resolveGeminiApiKey } from "@/lib/app-settings";

const DEFAULT_MODEL = "gemini-2.0-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 1_024;

const SYSTEM_PROMPT = `你是 TikTok 运营数据分析助手。根据用户提供的精简 JSON 统计，输出简体中文、可执行的运营洞察。
规则：
- 仅返回一个 JSON 对象，不要 markdown
- summary 2-3 句；engagementInsights/contentOptimization/growthRecommendations 各 2-4 条
- bestHashtags 最多 6 个；viralVideoAnalysis 最多 5 条；bestPostingTime.slots 最多 5 个
- 数字与结论需与输入数据一致，不要编造不存在的账号`;

async function getGeminiConfig() {
  const apiKey = (await resolveGeminiApiKey()) || null;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  return { apiKey, model };
}

export async function isGeminiConfigured() {
  const { apiKey } = await getGeminiConfig();
  return Boolean(apiKey);
}

function parseGeminiError(status: number, body: string) {
  try {
    const payload = JSON.parse(body) as { error?: { message?: string; status?: string; code?: number } };
    const message = payload.error?.message;

    if (status === 400 && message?.toLowerCase().includes("api key")) {
      return "Gemini API Key 无效，请检查环境变量 GEMINI_API_KEY";
    }
    if (status === 401 || status === 403) {
      return "Gemini API Key 无效或未授权，请检查环境变量 GEMINI_API_KEY";
    }
    if (status === 429) {
      if (message?.toLowerCase().includes("quota") || message?.toLowerCase().includes("billing")) {
        return "Gemini 免费额度已用尽或未开通计费，请在 Google AI Studio 检查配额与账单后重试";
      }
      return "Gemini 请求过于频繁，请稍后重试";
    }
    if (status === 503 || status === 500) {
      return "Gemini 服务暂时不可用，请稍后重试";
    }
    if (message) {
      return `Gemini：${message}`;
    }
  } catch {
    // ignore JSON parse errors
  }

  return `Gemini 请求失败（HTTP ${status}）`;
}

function asStringArray(value: unknown, max = 6) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, max);
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as Record<string, unknown>;
}

function normalizePayload(
  raw: Record<string, unknown>,
  fallback: AiInsightsPayload,
): Omit<AiInsightsPayload, "generatedAt" | "source"> {
  const bestPostingTimeRaw = raw.bestPostingTime;
  const bestPostingTime =
    bestPostingTimeRaw && typeof bestPostingTimeRaw === "object"
      ? (bestPostingTimeRaw as Record<string, unknown>)
      : null;

  const slotsRaw = bestPostingTime?.slots;
  const slots = Array.isArray(slotsRaw)
    ? slotsRaw
        .slice(0, 5)
        .map((slot, index) => {
          const item = slot as Record<string, unknown>;
          return {
            label: typeof item.label === "string" ? item.label : fallback.bestPostingTime.slots[index]?.label ?? "—",
            hour: typeof item.hour === "number" ? item.hour : 0,
            score: typeof item.score === "number" ? item.score : 0,
            videoCount: typeof item.videoCount === "number" ? item.videoCount : 0,
          };
        })
        .filter((slot) => slot.label !== "—")
    : fallback.bestPostingTime.slots;

  const bestHashtagsRaw = Array.isArray(raw.bestHashtags) ? raw.bestHashtags : [];
  const bestHashtags =
    bestHashtagsRaw.length > 0
      ? bestHashtagsRaw.slice(0, 6).map((item, index) => {
          const tag = item as Record<string, unknown>;
          const fallbackTag = fallback.bestHashtags[index];
          return {
            tag: typeof tag.tag === "string" ? tag.tag : (fallbackTag?.tag ?? ""),
            videoCount: typeof tag.videoCount === "number" ? tag.videoCount : (fallbackTag?.videoCount ?? 0),
            avgEngagement:
              typeof tag.avgEngagement === "number" ? tag.avgEngagement : (fallbackTag?.avgEngagement ?? 0),
            totalViews: typeof tag.totalViews === "number" ? tag.totalViews : (fallbackTag?.totalViews ?? 0),
            reason: typeof tag.reason === "string" ? tag.reason : fallbackTag?.reason,
          };
        })
      : fallback.bestHashtags;

  const topContentTypeRaw =
    raw.topContentType && typeof raw.topContentType === "object"
      ? (raw.topContentType as Record<string, unknown>)
      : null;

  const viralRaw = Array.isArray(raw.viralVideoAnalysis) ? raw.viralVideoAnalysis : [];

  return {
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary : fallback.summary,
    bestPostingTime: {
      recommendation:
        typeof bestPostingTime?.recommendation === "string" && bestPostingTime.recommendation.trim()
          ? bestPostingTime.recommendation
          : fallback.bestPostingTime.recommendation,
      slots: slots.length ? slots : fallback.bestPostingTime.slots,
    },
    bestHashtags: bestHashtags.filter((tag) => tag.tag),
    topContentType: {
      type:
        typeof topContentTypeRaw?.type === "string" ? topContentTypeRaw.type : fallback.topContentType.type,
      label:
        typeof topContentTypeRaw?.label === "string" ? topContentTypeRaw.label : fallback.topContentType.label,
      videoCount:
        typeof topContentTypeRaw?.videoCount === "number"
          ? topContentTypeRaw.videoCount
          : fallback.topContentType.videoCount,
      avgViews:
        typeof topContentTypeRaw?.avgViews === "number"
          ? topContentTypeRaw.avgViews
          : fallback.topContentType.avgViews,
      avgEngagement:
        typeof topContentTypeRaw?.avgEngagement === "number"
          ? topContentTypeRaw.avgEngagement
          : fallback.topContentType.avgEngagement,
      description:
        typeof topContentTypeRaw?.description === "string"
          ? topContentTypeRaw.description
          : fallback.topContentType.description,
      examples: Array.isArray(topContentTypeRaw?.examples)
        ? topContentTypeRaw.examples.filter((item): item is string => typeof item === "string").slice(0, 3)
        : fallback.topContentType.examples,
    },
    engagementInsights: asStringArray(raw.engagementInsights, 4).length
      ? asStringArray(raw.engagementInsights, 4)
      : fallback.engagementInsights,
    contentOptimization: asStringArray(raw.contentOptimization, 4).length
      ? asStringArray(raw.contentOptimization, 4)
      : fallback.contentOptimization,
    viralVideoAnalysis:
      viralRaw.length > 0
        ? viralRaw.slice(0, 5).map((item, index) => {
            const video = item as Record<string, unknown>;
            const fallbackVideo = fallback.viralVideoAnalysis[index];
            return {
              title: typeof video.title === "string" ? video.title : (fallbackVideo?.title ?? ""),
              accountHandle:
                typeof video.accountHandle === "string"
                  ? video.accountHandle
                  : (fallbackVideo?.accountHandle ?? ""),
              viewsLabel:
                typeof video.viewsLabel === "string" ? video.viewsLabel : (fallbackVideo?.viewsLabel ?? "0"),
              engagementLabel:
                typeof video.engagementLabel === "string"
                  ? video.engagementLabel
                  : (fallbackVideo?.engagementLabel ?? "0%"),
              reason: typeof video.reason === "string" ? video.reason : fallbackVideo?.reason,
            };
          })
        : fallback.viralVideoAnalysis,
    growthRecommendations: asStringArray(raw.growthRecommendations, 4).length
      ? asStringArray(raw.growthRecommendations, 4)
      : fallback.growthRecommendations,
  };
}

export async function generateGeminiInsights(context: AiInsightsContext): Promise<AiInsightsPayload> {
  const { apiKey, model } = await getGeminiConfig();
  const fallback = buildHeuristicInsights(context);

  if (!apiKey) {
    throw new Error("未配置 GEMINI_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `请基于以下 TikTok 追踪数据生成运营洞察 JSON：\n${serializeContextForPrompt(context)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(parseGeminiError(response.status, message));
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (payload.promptFeedback?.blockReason) {
      throw new Error(`Gemini 拒绝生成内容：${payload.promptFeedback.blockReason}`);
    }

    const finishReason = payload.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Gemini 输出被截断，请稍后重试");
    }

    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

    if (!content) {
      throw new Error("Gemini 未返回分析内容");
    }

    let parsed: Record<string, unknown>;

    try {
      parsed = extractJsonObject(content);
    } catch {
      throw new Error("Gemini 返回的内容不是有效 JSON");
    }

    const normalized = normalizePayload(parsed, fallback);

    return {
      ...normalized,
      generatedAt: new Date().toISOString(),
      source: "gemini",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini 请求超时，请稍后重试");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getGeminiModelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}
