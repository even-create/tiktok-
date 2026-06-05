import { supabase } from "@/lib/supabase";
import { syncTikTokAccount } from "@/lib/tiktok-sync";

export type SyncAccountResult = {
  handle: string;
  ok: boolean;
  status: "success" | "cached" | "error";
  cached?: boolean;
  videosCount?: number;
  videosInserted?: number;
  videosUpdated?: number;
  apifyCalls?: number;
  durationMs?: number;
  error?: string;
  message?: string;
};

export type SyncAllAccountsResult = {
  syncedAt: string;
  totalAccounts: number;
  successCount: number;
  failedCount: number;
  cachedCount: number;
  apifyCalls: number;
  totalVideos: number;
  results: SyncAccountResult[];
};

export type SyncAllAccountsOptions = {
  force?: boolean;
  workspaceId?: string;
  ownerUserId?: string;
  canManageAllAccounts?: boolean;
  assignedTo?: string;
};

export async function syncAllTrackedAccounts(
  options: SyncAllAccountsOptions = {},
): Promise<SyncAllAccountsResult> {
  let query = supabase.from("accounts").select("*").order("created_at", { ascending: false });

  if (options.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  if (options.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }

  const { data: accounts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!accounts?.length) {
    return {
      syncedAt: new Date().toISOString(),
      totalAccounts: 0,
      successCount: 0,
      failedCount: 0,
      cachedCount: 0,
      apifyCalls: 0,
      totalVideos: 0,
      results: [],
    };
  }

  const results: SyncAccountResult[] = [];
  let totalVideos = 0;
  let apifyCalls = 0;
  let cachedCount = 0;

  for (const account of accounts) {
    const syncUrl = account.profile_url?.trim() || `https://www.tiktok.com/@${account.handle}`;
    const startedAt = Date.now();

    try {
      const result = await syncTikTokAccount({
        url: syncUrl,
        force: options.force,
        lastSyncedAt: account.last_synced_at,
        workspaceId: account.workspace_id ?? options.workspaceId ?? "",
        ownerUserId: account.assigned_to ?? options.ownerUserId ?? "",
        canManageAllAccounts: options.canManageAllAccounts ?? !options.assignedTo,
      });

      const durationMs = Date.now() - startedAt;

      if (result.skipped) {
        cachedCount += 1;
        results.push({
          handle: account.handle,
          ok: true,
          status: "cached",
          cached: true,
          videosCount: 0,
          apifyCalls: 0,
          durationMs,
          message: result.message,
        });
        continue;
      }

      apifyCalls += result.apifyCalls;
      totalVideos += result.videosProcessed;
      results.push({
        handle: account.handle,
        ok: true,
        status: "success",
        cached: false,
        videosCount: result.videosProcessed,
        videosInserted: result.videosInserted,
        videosUpdated: result.videosUpdated,
        apifyCalls: result.apifyCalls,
        durationMs,
      });
    } catch (syncError) {
      results.push({
        handle: account.handle,
        ok: false,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: syncError instanceof Error ? syncError.message : "同步失败",
      });
    }
  }

  const successCount = results.filter((item) => item.ok).length;

  return {
    syncedAt: new Date().toISOString(),
    totalAccounts: accounts.length,
    successCount,
    failedCount: results.length - successCount,
    cachedCount,
    apifyCalls,
    totalVideos,
    results,
  };
}
