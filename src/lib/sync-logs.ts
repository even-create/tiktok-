import { supabase } from "@/lib/supabase";

export type SyncLogStatus = "success" | "cached" | "error";

export type SyncLogEntry = {
  id: string;
  accountHandle: string | null;
  syncType: string;
  status: SyncLogStatus;
  message: string | null;
  durationMs: number | null;
  apifyCalls: number;
  videosProcessed: number;
  errorDetail: string | null;
  createdAt: string;
};

export type CreateSyncLogInput = {
  accountHandle?: string | null;
  syncType?: string;
  status: SyncLogStatus;
  message?: string | null;
  durationMs?: number | null;
  apifyCalls?: number;
  videosProcessed?: number;
  errorDetail?: string | null;
};

function mapRow(row: Record<string, unknown>): SyncLogEntry {
  return {
    id: String(row.id),
    accountHandle: row.account_handle ? String(row.account_handle) : null,
    syncType: String(row.sync_type ?? "manual"),
    status: row.status as SyncLogStatus,
    message: row.message ? String(row.message) : null,
    durationMs: typeof row.duration_ms === "number" ? row.duration_ms : null,
    apifyCalls: Number(row.apify_calls ?? 0),
    videosProcessed: Number(row.videos_processed ?? 0),
    errorDetail: row.error_detail ? String(row.error_detail) : null,
    createdAt: String(row.created_at),
  };
}

export async function insertSyncLog(input: CreateSyncLogInput) {
  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      account_handle: input.accountHandle ?? null,
      sync_type: input.syncType ?? "manual",
      status: input.status,
      message: input.message ?? null,
      duration_ms: input.durationMs ?? null,
      apify_calls: input.apifyCalls ?? 0,
      videos_processed: input.videosProcessed ?? 0,
      error_detail: input.errorDetail ?? null,
    })
    .select()
    .single();

  if (error) {
    return { log: null, error };
  }

  return { log: mapRow(data as Record<string, unknown>), error: null };
}

export async function getRecentSyncLogs(limit = 50) {
  const { data, error } = await supabase
    .from("sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { logs: [] as SyncLogEntry[], error };
  }

  return {
    logs: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
    error: null,
  };
}

/** Count provider API calls since timestamp (stored in sync_logs.apify_calls). */
export async function countProviderApiCallsSince(sinceIso: string) {
  return countApifyCallsSince(sinceIso);
}

export async function countApifyCallsSince(sinceIso: string) {
  const { count, error } = await supabase
    .from("sync_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso)
    .gt("apify_calls", 0);

  if (error) {
    return { count: 0, error };
  }

  return { count: count ?? 0, error: null };
}
