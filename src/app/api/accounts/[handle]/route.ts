import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { handle: rawHandle } = await context.params;
  const handle = decodeURIComponent(rawHandle).trim();

  if (!handle) {
    return NextResponse.json({ error: "请提供账号 handle" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("*, videos(*)")
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "未找到该账号" }, { status: 404 });
  }

  const videos = [...(data.videos ?? [])].sort((left, right) => {
    const leftTime = left.posted_at ? new Date(left.posted_at).getTime() : 0;
    const rightTime = right.posted_at ? new Date(right.posted_at).getTime() : 0;
    return rightTime - leftTime;
  });

  return NextResponse.json({ account: { ...data, videos } });
}
