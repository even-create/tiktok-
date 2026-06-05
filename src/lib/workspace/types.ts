import type { MemberStatus, WorkspaceRole } from "@/lib/rbac/roles";

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceUserRecord = {
  id: string;
  workspace_id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: WorkspaceRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
};

export type WorkspaceUserPublic = Omit<WorkspaceUserRecord, "password_hash">;

export type SessionUser = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  displayName: string;
  role: WorkspaceRole;
  status: MemberStatus;
};
