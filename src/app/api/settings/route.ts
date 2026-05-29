import { NextResponse } from "next/server";
import { getAppSettings, saveAppSettings, type ThemeMode } from "@/lib/app-settings";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取设置失败" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      tikhubApiKey?: string;
      clearTikHubApiKey?: boolean;
      geminiApiKey?: string;
      clearGeminiApiKey?: boolean;
      syncIntervalMinutes?: number;
      theme?: ThemeMode;
      darkMode?: boolean;
      notifications?: {
        syncSuccess?: boolean;
        syncError?: boolean;
        weeklyDigest?: boolean;
      };
    } | null;

    if (!body) {
      return NextResponse.json({ error: "无效的设置数据" }, { status: 400 });
    }

    const theme: ThemeMode | undefined =
      body.theme ?? (typeof body.darkMode === "boolean" ? (body.darkMode ? "dark" : "light") : undefined);

    const settings = await saveAppSettings({
      tikhubApiKey: body.tikhubApiKey,
      clearTikHubApiKey: body.clearTikHubApiKey,
      geminiApiKey: body.geminiApiKey,
      clearGeminiApiKey: body.clearGeminiApiKey,
      syncIntervalMinutes: body.syncIntervalMinutes,
      theme,
      notifications: body.notifications,
    });

    return NextResponse.json({ settings, message: "设置已保存" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存设置失败" },
      { status: 500 },
    );
  }
}
