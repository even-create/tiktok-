import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Team join request. Stores a PENDING application for the administrator to review.
 * Does NOT create a member account — approval/provisioning ships in a later phase.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string; confirmPassword?: string }
    | null;

  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const confirmPassword = body?.confirmPassword ?? "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "请填写姓名、公司邮箱和密码" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "请输入有效的公司邮箱" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const { error } = await supabase.from("member_applications").upsert(
    {
      name,
      email,
      password_hash: passwordHash,
      status: "PENDING",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (error) {
    const message = error.message || "提交失败";
    const code = (error as { code?: string }).code;

    // Table genuinely missing → migration not run.
    if (code === "42P01" || /relation .* does not exist/i.test(message)) {
      return NextResponse.json(
        { error: "申请功能尚未初始化：member_applications 表不存在，请在 Supabase 执行迁移后重试。" },
        { status: 503 },
      );
    }

    // Table exists but PostgREST has a stale schema cache (common right after creating a table).
    if (/schema cache/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "数据库 schema 缓存未刷新，请在 Supabase SQL Editor 执行：NOTIFY pgrst, 'reload schema';（或稍等一分钟）后重试。",
        },
        { status: 503 },
      );
    }

    console.error("[apply] member_applications upsert failed:", code, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "Pending Approval" });
}
