import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/workspace/require-auth";
import { listWorkspaceUsers, toPublicUser } from "@/lib/workspace/users";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireAuth(request, "accounts:assign");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    const [accountsResult, members] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, handle, display_name, assigned_to, workspace_id, followers_count, video_count, last_synced_at")
        .eq("workspace_id", auth.user.workspaceId)
        .order("created_at", { ascending: false }),
      listWorkspaceUsers(auth.user.workspaceId),
    ]);

    if (accountsResult.error) {
      throw new Error(accountsResult.error.message);
    }

    const memberMap = new Map(members.map((member) => [member.id, toPublicUser(member)]));

    return NextResponse.json({
      accounts: (accountsResult.data ?? []).map((account) => ({
        ...account,
        assignee: account.assigned_to ? memberMap.get(account.assigned_to) ?? null : null,
      })),
      members: members.filter((member) => member.status === "ACTIVE").map(toPublicUser),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取账号归属失败" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, "accounts:assign");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    const body = (await request.json()) as {
      accountId?: string;
      assignedTo?: string | null;
    };

    const accountId = body.accountId?.trim();
    if (!accountId) {
      return NextResponse.json({ error: "请提供 accountId" }, { status: 400 });
    }

    if (body.assignedTo) {
      const member = await listWorkspaceUsers(auth.user.workspaceId);
      const target = member.find((item) => item.id === body.assignedTo && item.status === "ACTIVE");
      if (!target) {
        return NextResponse.json({ error: "目标成员不存在或未激活" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("accounts")
      .update({
        assigned_to: body.assignedTo ?? null,
        workspace_id: auth.user.workspaceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("workspace_id", auth.user.workspaceId)
      .select("id, handle, display_name, assigned_to")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    }

    return NextResponse.json({ account: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新账号归属失败" },
      { status: 500 },
    );
  }
}
