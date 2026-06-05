import { NextResponse } from "next/server";
import { ensureWorkspaceBootstrap } from "@/lib/workspace/bootstrap";
import { createWorkspaceUser, getWorkspaceUserByEmail, toPublicUser } from "@/lib/workspace/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      displayName?: string;
      email?: string;
      password?: string;
    } | null;

    const displayName = body?.displayName?.trim() ?? "";
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";

    if (!displayName || !email || !password) {
      return NextResponse.json({ error: "请填写姓名、公司邮箱和密码" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }

    const { workspace } = await ensureWorkspaceBootstrap();
    const existing = await getWorkspaceUserByEmail(workspace.id, email);

    if (existing) {
      return NextResponse.json({ error: "该邮箱已提交申请或已存在" }, { status: 409 });
    }

    const user = await createWorkspaceUser({
      workspaceId: workspace.id,
      email,
      password,
      displayName,
      role: "MEMBER",
      status: "PENDING",
    });

    return NextResponse.json({
      ok: true,
      message: "申请已提交，等待管理员审核",
      user: toPublicUser(user),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "注册失败" },
      { status: 500 },
    );
  }
}
