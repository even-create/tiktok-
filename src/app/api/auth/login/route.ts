import { NextResponse } from "next/server";
import { getTrackerPassword } from "@/lib/auth";
import { ADMIN_USER, SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

/** Administrator login via access code (通行码). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";

  if (password !== getTrackerPassword()) {
    return NextResponse.json({ error: "通行码错误" }, { status: 401 });
  }

  const token = await signSession(ADMIN_USER);
  const response = NextResponse.json({ ok: true, user: ADMIN_USER });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
