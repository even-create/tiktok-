import type { WorkspaceRole } from "@/lib/rbac/roles";

export const PERMISSIONS = {
  "workspace:read": ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
  "accounts:read:all": ["OWNER", "ADMIN"],
  "accounts:read:own": ["OWNER", "ADMIN", "MEMBER"],
  "accounts:write:own": ["OWNER", "ADMIN", "MEMBER"],
  "accounts:assign": ["OWNER", "ADMIN"],
  "accounts:delete": ["OWNER", "ADMIN"],
  "team:read": ["OWNER", "ADMIN"],
  "team:invite": ["OWNER", "ADMIN"],
  "team:approve": ["OWNER", "ADMIN"],
  "team:manage": ["OWNER", "ADMIN"],
  "analytics:read:all": ["OWNER", "ADMIN"],
  "analytics:read:own": ["OWNER", "ADMIN", "MEMBER"],
  "settings:manage": ["OWNER", "ADMIN"],
  "sync:all": ["OWNER", "ADMIN"],
  "sync:own": ["OWNER", "ADMIN", "MEMBER"],
} as const satisfies Record<string, WorkspaceRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function roleHasPermission(role: WorkspaceRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly WorkspaceRole[]).includes(role);
}

export function assertPermission(role: WorkspaceRole, permission: Permission) {
  if (!roleHasPermission(role, permission)) {
    throw new Error("无权执行此操作");
  }
}
