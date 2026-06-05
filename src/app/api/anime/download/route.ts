import { NextResponse } from "next/server";
import { getAnimeJob } from "@/lib/anime/jobs";
import { requireAuth } from "@/lib/workspace/require-auth";

function sanitizeFilename(filename: string) {
  const cleaned = filename.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
  return cleaned.endsWith(".mp4") ? cleaned : `${cleaned || "anime-video"}.mp4`;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId")?.trim();
    const filename = sanitizeFilename(searchParams.get("filename") || "anime-video.mp4");

    if (!jobId) {
      return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });
    }

    const job = await getAnimeJob(jobId);
    if (!job?.video_url) {
      return NextResponse.json({ error: "视频不存在" }, { status: 404 });
    }

    const videoResponse = await fetch(job.video_url);
    if (!videoResponse.ok) {
      return NextResponse.json({ error: "获取视频失败" }, { status: 502 });
    }

    const buffer = await videoResponse.arrayBuffer();
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "下载失败" },
      { status: 500 },
    );
  }
}
