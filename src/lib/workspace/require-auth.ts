import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { assertPermission, type Permission } from "@/lib/rbac/permissions";
import type { SessionUser } from "@/lib/workspace/types";

export async function requireAuth(request: Request, permission?: Permission) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return {
      user: null as SessionUser | null,
      response: NextResponse.json({ error: "未登录" }, { status: 401 }),
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      user: null as SessionUser | null,
      response: NextResponse.json({ error: "账号未激活或待审核" }, { status: 403 }),
    };
  }

  if (permission) {
    try {
      assertPermission(user.role, permission);
    } catch (error) {
      return {
        user: null as SessionUser | null,
        response: NextResponse.json(
          { error: error instanceof Error ? error.message : "无权执行此操作" },
          { status: 403 },
        ),
      };
    }
  }

  return { user, response: null as NextResponse | null };
}
