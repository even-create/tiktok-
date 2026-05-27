import { NextResponse } from "next/server";
import { deleteAccountByHandle } from "@/lib/tiktok-data";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*, videos(*)")
    .order("created_at", { ascending: false })
    .order("posted_at", {
      ascending: false,
      referencedTable: "videos",
      nullsFirst: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ accounts: data ?? [] });
}

export async function DELETE(request: Request) {
  const handle = new URL(request.url).searchParams.get("handle")?.trim();

  if (!handle) {
    return NextResponse.json({ error: "请提供要删除的账号 handle" }, { status: 400 });
  }

  const { error, count } = await deleteAccountByHandle(handle);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "未找到该账号" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, handle });
}
