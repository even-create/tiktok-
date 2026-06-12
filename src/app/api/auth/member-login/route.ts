import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  hashPassword,
  signSession,
  type SessionUser,
} from "@/lib/session";

type AppMemberRow = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: string | null;
  status: string | null;
};

/**
 * Team member login via email + password.
 * Member provisioning/approval ships in a later phase, so this authenticates against the
 * app_members table when present and simply rejects when there are no member accounts yet.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  let member: AppMemberRow | null = null;
  try {
    const { data } = await supabase
      .from("app_members")
      .select("id, name, email, password_hash, role, status")
      .eq("email", email)
      .maybeSingle();
    member = (data as AppMemberRow | null) ?? null;
  } catch {
    member = null;
  }

  if (!member) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  if (member.status && member.status !== "ACTIVE" && member.status !== "active") {
    return NextResponse.json({ error: "该成员账号尚未激活，请联系管理员" }, { status: 403 });
  }

  const hashed = await hashPassword(password);
  if (hashed !== member.password_hash) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const user: SessionUser = {
    id: member.id,
    name: member.name?.trim() || member.email,
    role: member.role?.toUpperCase() === "ADMIN" ? "ADMIN" : "MEMBER",
    email: member.email,
  };

  const token = await signSession(user);
  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
