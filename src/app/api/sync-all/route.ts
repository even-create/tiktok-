import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { syncAllBenchmarkAccounts } from "@/lib/sync-all-benchmark-accounts";
import { syncAllTrackedAccounts } from "@/lib/sync-all-accounts";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
    const force = body?.force === true;
    const user = await getCurrentUser();

    const trackedResult = await syncAllTrackedAccounts({ force });
    const benchmarkResult = await syncAllBenchmarkAccounts({
      force,
      ownerId: user?.id,
    });

    const totalAccounts = trackedResult.totalAccounts + benchmarkResult.totalAccounts;

    if (totalAccounts === 0) {
      return NextResponse.json({
        ...trackedResult,
        benchmark: benchmarkResult,
        message: "暂无已追踪或对标账号，请先添加账号。",
      });
    }

    const cacheNote =
      trackedResult.cachedCount + benchmarkResult.cachedCount > 0
        ? `，${trackedResult.cachedCount + benchmarkResult.cachedCount} 个使用缓存（未调用 TikHub）`
        : "";
    const apifyNote = `TikHub 调用 ${trackedResult.apifyCalls + benchmarkResult.apifyCalls} 次`;
    const failedCount = trackedResult.failedCount + benchmarkResult.failedCount;
    const successCount = trackedResult.successCount + benchmarkResult.successCount;

    return NextResponse.json({
      ...trackedResult,
      apifyCalls: trackedResult.apifyCalls + benchmarkResult.apifyCalls,
      totalVideos: trackedResult.totalVideos + benchmarkResult.totalVideos,
      cachedCount: trackedResult.cachedCount + benchmarkResult.cachedCount,
      successCount,
      failedCount,
      benchmark: benchmarkResult,
      message:
        failedCount === 0
          ? `全部 ${successCount} 个账号同步成功${cacheNote}（${apifyNote}）`
          : `${successCount} 个成功，${failedCount} 个失败${cacheNote}（${apifyNote}）`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量同步失败" },
      { status: 500 },
    );
  }
}
