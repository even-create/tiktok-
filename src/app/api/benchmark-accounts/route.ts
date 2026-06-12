import { NextResponse } from "next/server";
import { deleteBenchmarkAccountById } from "@/lib/benchmark-storage";
import { getCurrentUser } from "@/lib/current-user";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("benchmark_accounts")
    .select("*, benchmark_videos(*)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("posted_at", {
      ascending: false,
      referencedTable: "benchmark_videos",
      nullsFirst: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = (data ?? []).map((row) => {
    const videos = row.benchmark_videos ?? [];
    const { benchmark_videos: _ignored, ...account } = row;
    return { ...account, videos };
  });

  return NextResponse.json({ accounts });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "请提供要删除的对标账号 id" }, { status: 400 });
  }

  try {
    const { deleted } = await deleteBenchmarkAccountById(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "未找到该对标账号" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
