import { NextResponse } from "next/server";
import { resolveVideoCoverUrl } from "@/lib/video-cover";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const videoUrl = new URL(request.url).searchParams.get("url")?.trim();

  if (!videoUrl || !/(tiktok|douyin)\.com/i.test(videoUrl)) {
    return NextResponse.json({ error: "无效的视频链接" }, { status: 400 });
  }

  try {
    const thumbnailUrl = await resolveVideoCoverUrl(videoUrl);

    if (!thumbnailUrl) {
      return NextResponse.json({ error: "封面为空" }, { status: 404 });
    }

    return NextResponse.json({ thumbnailUrl });
  } catch {
    return NextResponse.json({ error: "获取封面失败" }, { status: 500 });
  }
}
