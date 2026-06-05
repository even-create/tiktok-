import { NextResponse } from "next/server";
import { applyAccountListScope } from "@/lib/workspace/account-access";
import { requireAuth } from "@/lib/workspace/require-auth";
import { buildAiInsightsContext, buildHeuristicInsights } from "@/lib/ai-insights";
import { generateGeminiInsights, getGeminiModelName, isGeminiConfigured } from "@/lib/gemini-insights";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuth(request, "analytics:read:own");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    let query = supabase
      .from("accounts")
      .select("*, videos(*)")
      .order("created_at", { ascending: false });

    query = applyAccountListScope(query, auth.user);

    const { data: accounts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const context = buildAiInsightsContext(accounts ?? []);

    if (!context.videoCount) {
      return NextResponse.json({
        error: "暂无视频数据，请先在 Dashboard 添加账号并同步。",
      }, { status: 400 });
    }

    const heuristic = buildHeuristicInsights(context);

    if (!(await isGeminiConfigured())) {
      return NextResponse.json({
        insights: heuristic,
        warning: "未配置 GEMINI_API_KEY（环境变量或 Settings），已使用本地规则生成分析。",
      });
    }

    try {
      const insights = await generateGeminiInsights(context);
      return NextResponse.json({
        insights,
        model: getGeminiModelName(),
      });
    } catch (geminiError) {
      const message = geminiError instanceof Error ? geminiError.message : "Gemini 分析失败";
      console.error("[ai-insights] Gemini error:", message);

      return NextResponse.json({
        insights: heuristic,
        model: getGeminiModelName(),
        warning: `Gemini 分析失败，已回退本地规则：${message}`,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 分析失败" },
      { status: 500 },
    );
  }
}
