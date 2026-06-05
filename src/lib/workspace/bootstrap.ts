import { supabase } from "@/lib/supabase";
import { createWorkspaceUser } from "@/lib/workspace/users";
import type { WorkspaceRecord } from "@/lib/workspace/types";

function slugifyWorkspaceName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function getDefaultWorkspace(): Promise<WorkspaceRecord | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceRecord | null) ?? null;
}

export async function ensureDefaultWorkspace() {
  const existing = await getDefaultWorkspace();
  if (existing) {
    return existing;
  }

  const name = process.env.WORKSPACE_NAME?.trim() || "My Company";
  const slug = slugifyWorkspaceName(name) || "my-company";

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, slug })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceRecord;
}

export async function ensureWorkspaceBootstrap() {
  const workspace = await ensureDefaultWorkspace();

  const { count, error: countError } = await supabase
    .from("workspace_users")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    return { workspace, createdAdmin: false };
  }

  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || "admin@company.com").toLowerCase();
  const password =
    process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() ||
    process.env.TRACKER_PASSWORD?.trim() ||
    "zhaoeven";
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Admin";

  const admin = await createWorkspaceUser({
    workspaceId: workspace.id,
    email,
    password,
    displayName,
    role: "ADMIN",
    status: "ACTIVE",
  });

  await supabase
    .from("accounts")
    .update({
      workspace_id: workspace.id,
      assigned_to: admin.id,
      updated_at: new Date().toISOString(),
    })
    .is("workspace_id", null);

  return { workspace, createdAdmin: true, admin };
}
