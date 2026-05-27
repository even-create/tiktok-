import { NextResponse } from "next/server";
import { scrapeTikTokProfile } from "@/lib/apify-tiktok";
import { assertTikTokTablesReady, saveTikTokProfile } from "@/lib/supabase-storage";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const tiktokUrl = body?.url?.trim();

    if (!tiktokUrl) {
      return NextResponse.json({ error: "请输入 TikTok 账号链接" }, { status: 400 });
    }

    await assertTikTokTablesReady();

    const profile = await scrapeTikTokProfile(tiktokUrl);
    const result = await saveTikTokProfile(profile);

    return NextResponse.json({
      account: result.account,
      videosCount: result.videosCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TikTok 同步失败" },
      { status: 500 },
    );
  }
}
