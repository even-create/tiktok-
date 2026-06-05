import { assertPermission } from "@/lib/rbac/permissions";
import type { SessionUser } from "@/lib/workspace/types";
import { supabase } from "@/lib/supabase";

export type AccountScopeRow = {
  id: string;
  handle: string;
  workspace_id: string | null;
  assigned_to: string | null;
};

export function canReadAllAccounts(user: SessionUser) {
  return user.role === "OWNER" || user.role === "ADMIN";
}

export function applyAccountListScope<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  user: SessionUser,
) {
  let scoped = query.eq("workspace_id", user.workspaceId);
  if (!canReadAllAccounts(user)) {
    scoped = scoped.eq("assigned_to", user.id);
  }
  return scoped;
}

export async function getAccountByHandle(handle: string) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, handle, workspace_id, assigned_to")
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AccountScopeRow | null) ?? null;
}

export async function assertAccountReadable(user: SessionUser, handle: string) {
  const account = await getAccountByHandle(handle);
  if (!account) {
    return null;
  }

  if (account.workspace_id && account.workspace_id !== user.workspaceId) {
    throw new Error("无权访问该账号");
  }

  if (!canReadAllAccounts(user) && account.assigned_to !== user.id) {
    throw new Error("无权访问该账号");
  }

  return account;
}

export async function assertAccountWritable(user: SessionUser, handle: string) {
  const account = await assertAccountReadable(user, handle);
  if (!account) {
    return null;
  }

  if (!canReadAllAccounts(user) && account.assigned_to !== user.id) {
    throw new Error("无权管理该账号");
  }

  return account;
}

export function assertCanAssignAccounts(user: SessionUser) {
  assertPermission(user.role, "accounts:assign");
}

export function assertCanManageTeam(user: SessionUser) {
  assertPermission(user.role, "team:manage");
}
