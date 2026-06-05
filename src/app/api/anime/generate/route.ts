import { NextResponse } from "next/server";
import { createAnimeJob, listRecentAnimeJobs, resolveMaxConcurrentAnimeJobs } from "@/lib/anime/jobs";
import { processAnimeJobQueue } from "@/lib/anime/queue";
import { requireAuth } from "@/lib/workspace/require-auth";
import { queryVidmorWalletBalance } from "@/lib/vidmor/client";
import { getVidmorConfigStatus, isVidmorConfigured } from "@/lib/vidmor/config";

export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    const jobs = await listRecentAnimeJobs(50);
    const config = getVidmorConfigStatus();
    let wallet: Awaited<ReturnType<typeof queryVidmorWalletBalance>> | null = null;
    let walletError: string | null = null;

    if (isVidmorConfigured()) {
      try {
        wallet = await queryVidmorWalletBalance();
      } catch (error) {
        walletError = error instanceof Error ? error.message : "读取 Vidmor 积分失败";
      }
    }

    return NextResponse.json({
      jobs,
      configured: config.configured,
      config,
      maxConcurrent: resolveMaxConcurrentAnimeJobs(),
      wallet,
      walletError,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取任务失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    if (!isVidmorConfigured()) {
      return NextResponse.json(
        {
          error: "未配置 Vidmor。请在 Vercel 环境变量中设置 VIDMOR_TOKEN 与 VIDMOR_USER_CODE。",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      characterId?: string;
      action?: string;
      referenceImageUrl?: string;
      imagePromptTemplate?: string;
      videoPromptTemplate?: string;
      videoDuration?: number;
      videoResolution?: string;
    };
    const characterId = body.characterId?.trim();
    const action = body.action?.trim();
    const referenceImageUrl = body.referenceImageUrl?.trim() || null;

    if (!characterId || !action) {
      return NextResponse.json({ error: "请选择角色并填写动作" }, { status: 400 });
    }

    const job = await createAnimeJob({
      characterId,
      action,
      referenceImageUrl,
      imagePromptTemplate: body.imagePromptTemplate,
      videoPromptTemplate: body.videoPromptTemplate,
      videoDuration: body.videoDuration,
      videoResolution: body.videoResolution,
    });

    const queueResult = await processAnimeJobQueue();

    return NextResponse.json({ jobId: job.id, job, queue: queueResult });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建任务失败" },
      { status: 500 },
    );
  }
}
