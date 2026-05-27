import {
  buildHeuristicInsights,
  type AiInsightsPayload,
  type AiInsightsContext,
  serializeContextForPrompt,
} from "@/lib/ai-insights";

const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 1_200;

const SYSTEM_PROMPT = `你是 TikTok 运营数据分析助手。根据用户提供的精简 JSON 统计，输出简体中文、可执行的运营洞察。
规则：
- 仅返回一个 JSON 对象，不要 markdown
- summary 2-3 句；engagementInsights/contentOptimization/growthRecommendations 各 2-4 条
- bestHashtags 最多 6 个；viralVideoAnalysis 最多 5 条；bestPostingTime.slots 最多 5 个
- 数字与结论需与输入数据一致，不要编造不存在的账号`;

function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  return { apiKey, model };
}

export function isOpenAiConfigured() {
  return Boolean(getOpenAiConfig().apiKey);
}

function parseOpenAiError(status: number, body: string) {
  try {
    const payload = JSON.parse(body) as { error?: { message?: string; type?: string } };
    const message = payload.error?.message;

    if (status === 401) {
      return "OpenAI API Key 无效或未授权，请检查环境变量 OPENAI_API_KEY";
    }
    if (status === 429) {
      return "OpenAI 请求过于频繁或额度不足，请稍后重试";
    }
    if (status === 503) {
      return "OpenAI 服务暂时不可用，请稍后重试";
    }
    if (message) {
      return `OpenAI：${message}`;
    }
  } catch {
    // ignore JSON parse errors
  }

  return `OpenAI 请求失败（HTTP ${status}）`;
}

function asStringArray(value: unknown, max = 6) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, max);
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

export async function generateOpenAiInsights(context: AiInsightsContext): Promise<AiInsightsPayload> {
  const { apiKey, model } = getOpenAiConfig();
  const fallback = buildHeuristicInsights(context);

  if (!apiKey) {
    throw new Error("未配置 OPENAI_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `请基于以下 TikTok 追踪数据生成运营洞察 JSON：\n${serializeContextForPrompt(context)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(parseOpenAiError(response.status, message));
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OpenAI 未返回分析内容");
    }

    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error("OpenAI 返回的内容不是有效 JSON");
    }

    const normalized = normalizePayload(parsed, fallback);

    return {
      ...normalized,
      generatedAt: new Date().toISOString(),
      source: "openai",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI 请求超时，请稍后重试");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getOpenAiModelName() {
  return getOpenAiConfig().model;
}
