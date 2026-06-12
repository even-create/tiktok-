import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId).trim();

  if (!id) {
    return NextResponse.json({ error: "请提供账号 id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("benchmark_accounts")
    .select("*, benchmark_videos(*)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "未找到该对标账号" }, { status: 404 });
  }

  const videos = [...(data.benchmark_videos ?? [])].sort((left, right) => {
    const leftTime = left.posted_at ? new Date(left.posted_at).getTime() : 0;
    const rightTime = right.posted_at ? new Date(right.posted_at).getTime() : 0;
    return rightTime - leftTime;
  });

  const { benchmark_videos: _ignored, ...account } = data;

  return NextResponse.json({ account: { ...account, videos } });
}
