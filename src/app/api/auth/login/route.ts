import { NextResponse } from "next/server";
import { buildSessionCookie, createSessionToken } from "@/lib/auth";
import { ensureWorkspaceBootstrap } from "@/lib/workspace/bootstrap";
import { getWorkspaceUserByEmail, verifyPassword } from "@/lib/workspace/users";
import type { SessionUser } from "@/lib/workspace/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "请输入公司邮箱和密码" }, { status: 400 });
    }

    const { workspace } = await ensureWorkspaceBootstrap();
    const user = await getWorkspaceUserByEmail(workspace.id, email);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    if (user.status === "PENDING") {
      return NextResponse.json({ error: "账号待管理员审核，通过后即可登录" }, { status: 403 });
    }

    if (user.status === "REJECTED" || user.status === "DISABLED") {
      return NextResponse.json({ error: "账号已被拒绝或停用，请联系管理员" }, { status: 403 });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      status: user.status,
    };

    const token = await createSessionToken(sessionUser);
    const response = NextResponse.json({ ok: true, user: sessionUser });
    response.cookies.set(buildSessionCookie(token));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登录失败" },
      { status: 500 },
    );
  }
}
