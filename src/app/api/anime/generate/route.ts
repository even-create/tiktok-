import { after } from "next/server";
import { NextResponse } from "next/server";
import { createAnimeJob, listRecentAnimeJobs } from "@/lib/anime/jobs";
import { runAnimePipelineSafe } from "@/lib/anime/pipeline";
import { getVidmorConfigStatus, isVidmorConfigured } from "@/lib/vidmor/config";

export const maxDuration = 300;

export async function GET() {
  try {
    const jobs = await listRecentAnimeJobs(12);
    const config = getVidmorConfigStatus();
    return NextResponse.json({ jobs, configured: config.configured, config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取任务失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
    };
    const characterId = body.characterId?.trim();
    const action = body.action?.trim();
    const referenceImageUrl = body.referenceImageUrl?.trim() || null;

    if (!characterId || !action) {
      return NextResponse.json({ error: "请选择角色并填写动作" }, { status: 400 });
    }

    const job = await createAnimeJob(characterId, action);

    after(async () => {
      await runAnimePipelineSafe(job.id, characterId, action, referenceImageUrl);
    });

    return NextResponse.json({ jobId: job.id, job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建任务失败" },
      { status: 500 },
    );
  }
}
