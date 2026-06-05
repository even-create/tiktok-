import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/current-user";
import { supabase } from "@/lib/supabase";

type ApplicationRow = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  status: string | null;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  }

  const { data: application, error: readError } = await supabase
    .from("member_applications")
    .select("id, name, email, password_hash, status")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const app = application as ApplicationRow | null;
  if (!app) {
    return NextResponse.json({ error: "申请不存在" }, { status: 404 });
  }

  if (app.status && app.status !== "PENDING") {
    return NextResponse.json({ error: "该申请已被处理" }, { status: 409 });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("member_applications")
      .update({ status: "REJECTED", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  // Approve: create (or reactivate) the member account, then mark the application approved.
  const { error: memberError } = await supabase.from("app_members").upsert(
    {
      name: app.name,
      email: app.email,
      password_hash: app.password_hash,
      role: "MEMBER",
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("member_applications")
    .update({ status: "APPROVED", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "APPROVED" });
}
