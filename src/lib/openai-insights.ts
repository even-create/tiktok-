import {
  AI_INSIGHTS_JSON_SCHEMA,
  type AiInsightsPayload,
  type AiInsightsContext,
  serializeContextForPrompt,
} from "@/lib/ai-insights";

function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  return { apiKey, model };
}

export function isOpenAiConfigured() {
  return Boolean(getOpenAiConfig().apiKey);
}

export async function generateOpenAiInsights(context: AiInsightsContext): Promise<AiInsightsPayload> {
  const { apiKey, model } = getOpenAiConfig();

  if (!apiKey) {
    throw new Error("未配置 OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `你是 TikTok 运营数据分析专家。根据提供的追踪数据输出 JSON，语言为简体中文，建议要具体可执行。JSON 结构必须为：${AI_INSIGHTS_JSON_SCHEMA}`,
        },
        {
          role: "user",
          content: `请分析以下 TikTok 追踪数据并生成运营洞察：\n${serializeContextForPrompt(context)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI 请求失败：${message || response.statusText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI 未返回分析内容");
  }

  const parsed = JSON.parse(content) as Omit<AiInsightsPayload, "generatedAt" | "source">;

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    source: "openai",
  };
}
