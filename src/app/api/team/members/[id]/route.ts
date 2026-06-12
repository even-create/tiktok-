import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/current-user";
import { ADMIN_USER } from "@/lib/session";
import { supabase } from "@/lib/supabase";

function isProtectedMember(id: string) {
  return id === ADMIN_USER.id;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await context.params;
  if (isProtectedMember(id)) {
    return NextResponse.json({ error: "管理员账号受保护，无法修改" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { status?: string; role?: string } | null;

  if (body?.role !== undefined) {
    const nextRole = body.role === "ADMIN" ? "ADMIN" : body.role === "MEMBER" ? "MEMBER" : null;
    if (!nextRole) {
      return NextResponse.json({ error: "无效角色" }, { status: 400 });
    }

    const { error } = await supabase
      .from("app_members")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, role: nextRole });
  }

  const next = body?.status === "DISABLED" ? "DISABLED" : body?.status === "ACTIVE" ? "ACTIVE" : null;
  if (!next) {
    return NextResponse.json({ error: "无效状态" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_members")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: next });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await context.params;
  if (isProtectedMember(id)) {
    return NextResponse.json({ error: "管理员账号受保护，无法删除" }, { status: 403 });
  }

  const { error } = await supabase.from("app_members").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
