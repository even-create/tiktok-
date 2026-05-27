import { NextResponse } from "next/server";
import { syncAllTrackedAccounts } from "@/lib/sync-all-accounts";

export const maxDuration = 300;

export async function POST() {
  try {
    const result = await syncAllTrackedAccounts();

    if (result.totalAccounts === 0) {
      return NextResponse.json({
        ...result,
        message: "暂无已追踪账号，请先添加账号。",
      });
    }

    return NextResponse.json({
      ...result,
      message:
        result.failedCount === 0
          ? `全部 ${result.successCount} 个账号同步成功`
          : `${result.successCount} 个成功，${result.failedCount} 个失败`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量同步失败" },
      { status: 500 },
    );
  }
}
