import { NextResponse } from "next/server";
import { listWorkspaceUsers, toPublicUser } from "@/lib/workspace/users";
import { requireAuth } from "@/lib/workspace/require-auth";

export async function GET(request: Request) {
  const auth = await requireAuth(request, "team:read");
  if (auth.response || !auth.user) {
    return auth.response!;
  }

  try {
    const members = await listWorkspaceUsers(auth.user.workspaceId);
    return NextResponse.json({
      members: members.map(toPublicUser),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取成员失败" },
      { status: 500 },
    );
  }
}
