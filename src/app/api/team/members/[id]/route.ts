import { NextResponse } from "next/server";
import {
  deleteWorkspaceUser,
  getWorkspaceUserById,
  toPublicUser,
  updateWorkspaceUser,
} from "@/lib/workspace/users";
import { requireAuth } from "@/lib/workspace/require-auth";
import { isWorkspaceRole } from "@/lib/rbac/roles";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, "team:manage");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: "approve" | "reject" | "disable";
      role?: string;
    };

    const member = await getWorkspaceUserById(id);
    if (!member || member.workspace_id !== auth.user.workspaceId) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    if (member.id === auth.user.id && body.action === "disable") {
      return NextResponse.json({ error: "不能停用自己的账号" }, { status: 400 });
    }

    const patch: Parameters<typeof updateWorkspaceUser>[1] = {};

    if (body.action === "approve") {
      patch.status = "ACTIVE";
    } else if (body.action === "reject") {
      patch.status = "REJECTED";
    } else if (body.action === "disable") {
      patch.status = "DISABLED";
    }

    if (body.role && isWorkspaceRole(body.role)) {
      patch.role = body.role;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "无有效更新" }, { status: 400 });
    }

    const updated = await updateWorkspaceUser(id, patch);
    return NextResponse.json({ member: toPublicUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新成员失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth(_request, "team:manage");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    const { id } = await context.params;
    const member = await getWorkspaceUserById(id);

    if (!member || member.workspace_id !== auth.user.workspaceId) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    if (member.id === auth.user.id) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
    }

    await supabase.from("accounts").update({ assigned_to: null }).eq("assigned_to", id);
    await deleteWorkspaceUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除成员失败" },
      { status: 500 },
    );
  }
}
