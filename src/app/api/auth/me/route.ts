import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { roleHasPermission, type Permission } from "@/lib/rbac/permissions";

export async function GET(request: Request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const permissions = (Object.keys({
    "accounts:read:all": true,
    "accounts:assign": true,
    "team:manage": true,
    "settings:manage": true,
    "sync:all": true,
  }) as Permission[]).filter((permission) => roleHasPermission(user.role, permission));

  return NextResponse.json({ user, permissions });
}
