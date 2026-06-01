import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const videoUrl = new URL(request.url).searchParams.get("url")?.trim();

  if (!videoUrl || !videoUrl.includes("tiktok.com")) {
    return NextResponse.json({ error: "无效的视频链接" }, { status: 400 });
  }

  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const response = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "无法获取封面" }, { status: 502 });
    }

    const payload = (await response.json()) as { thumbnail_url?: string };
    const thumbnailUrl = payload.thumbnail_url?.trim() || null;

    if (!thumbnailUrl) {
      return NextResponse.json({ error: "封面为空" }, { status: 404 });
    }

    return NextResponse.json({ thumbnailUrl });
  } catch {
    return NextResponse.json({ error: "获取封面失败" }, { status: 500 });
  }
}
