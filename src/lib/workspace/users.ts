import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import type { MemberStatus, WorkspaceRole } from "@/lib/rbac/roles";
import type { WorkspaceUserPublic, WorkspaceUserRecord } from "@/lib/workspace/types";

const BCRYPT_ROUNDS = 12;

export function toPublicUser(user: WorkspaceUserRecord): WorkspaceUserPublic {
  const { password_hash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function getWorkspaceUserByEmail(workspaceId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("workspace_users")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceUserRecord | null) ?? null;
}

export async function getWorkspaceUserById(userId: string) {
  const { data, error } = await supabase.from("workspace_users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceUserRecord | null) ?? null;
}

export async function listWorkspaceUsers(workspaceId: string, status?: MemberStatus) {
  let query = supabase.from("workspace_users").select("*").eq("workspace_id", workspaceId).order("created_at", {
    ascending: false,
  });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WorkspaceUserRecord[];
}

export async function createWorkspaceUser(input: {
  workspaceId: string;
  email: string;
  password: string;
  displayName: string;
  role?: WorkspaceRole;
  status?: MemberStatus;
}) {
  const passwordHash = await hashPassword(input.password);
  const { data, error } = await supabase
    .from("workspace_users")
    .insert({
      workspace_id: input.workspaceId,
      email: input.email.trim().toLowerCase(),
      password_hash: passwordHash,
      display_name: input.displayName.trim(),
      role: input.role ?? "MEMBER",
      status: input.status ?? "PENDING",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceUserRecord;
}

export async function updateWorkspaceUser(
  userId: string,
  patch: Partial<Pick<WorkspaceUserRecord, "display_name" | "role" | "status">>,
) {
  const { data, error } = await supabase
    .from("workspace_users")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceUserRecord;
}

export async function deleteWorkspaceUser(userId: string) {
  const { error } = await supabase.from("workspace_users").delete().eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }
}
