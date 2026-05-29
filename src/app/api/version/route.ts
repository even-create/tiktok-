import { NextResponse } from "next/server";
import { isTikHubConfigured } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

  return NextResponse.json({
    provider: "tikhub",
    commit,
    tikhubConfigured: await isTikHubConfigured(),
    builtAt: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  });
}
