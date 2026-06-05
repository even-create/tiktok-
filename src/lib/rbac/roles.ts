export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const MEMBER_STATUSES = ["PENDING", "ACTIVE", "REJECTED", "DISABLED"] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function isMemberStatus(value: string): value is MemberStatus {
  return (MEMBER_STATUSES as readonly string[]).includes(value);
}
