import { supabase } from "@/lib/supabase";

export const APP_SETTINGS_ID = "default";

export type ThemeMode = "light" | "dark";

export type AppSettingsRow = {
  id: string;
  apify_token: string | null;
  sync_interval_minutes: number;
  theme: ThemeMode;
  notify_sync_success: boolean;
  notify_sync_error: boolean;
  notify_weekly_digest: boolean;
  updated_at: string;
};

export type NotificationSettings = {
  syncSuccess: boolean;
  syncError: boolean;
  weeklyDigest: boolean;
};

export type AppSettingsPublic = {
  syncIntervalMinutes: number;
  theme: ThemeMode;
  darkMode: boolean;
  notifications: NotificationSettings;
  apifyTokenConfigured: boolean;
  apifyTokenMasked: string | null;
  apifyTokenSource: "database" | "environment" | "none";
  updatedAt: string | null;
};

export type SaveAppSettingsInput = {
  apifyToken?: string;
  clearApifyToken?: boolean;
  syncIntervalMinutes?: number;
  theme?: ThemeMode;
  notifications?: Partial<NotificationSettings>;
};

const DEFAULT_SETTINGS: Omit<AppSettingsRow, "id" | "updated_at"> = {
  apify_token: null,
  sync_interval_minutes: 360,
  theme: "light",
  notify_sync_success: true,
  notify_sync_error: true,
  notify_weekly_digest: false,
};

export function maskApifyToken(token: string) {
  const trimmed = token.trim();
  if (trimmed.length <= 10) {
    return "••••••••";
  }
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

function clampSyncInterval(minutes: number) {
  if (!Number.isFinite(minutes)) return 360;
  return Math.min(10_080, Math.max(15, Math.round(minutes)));
}

export function toPublicSettings(row: AppSettingsRow | null): AppSettingsPublic {
  const envToken = process.env.APIFY_TOKEN?.trim() || null;
  const dbToken = row?.apify_token?.trim() || null;
  const effectiveToken = dbToken || envToken;

  return {
    syncIntervalMinutes: clampSyncInterval(row?.sync_interval_minutes ?? DEFAULT_SETTINGS.sync_interval_minutes),
    theme: normalizeTheme(row?.theme),
    darkMode: normalizeTheme(row?.theme) === "dark",
    notifications: {
      syncSuccess: row?.notify_sync_success ?? DEFAULT_SETTINGS.notify_sync_success,
      syncError: row?.notify_sync_error ?? DEFAULT_SETTINGS.notify_sync_error,
      weeklyDigest: row?.notify_weekly_digest ?? DEFAULT_SETTINGS.notify_weekly_digest,
    },
    apifyTokenConfigured: Boolean(effectiveToken),
    apifyTokenMasked: effectiveToken ? maskApifyToken(effectiveToken) : null,
    apifyTokenSource: dbToken ? "database" : envToken ? "environment" : "none",
    updatedAt: row?.updated_at ?? null,
  };
}

export async function getAppSettingsRow() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", APP_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AppSettingsRow | null;
}

export async function getAppSettings() {
  const row = await getAppSettingsRow();
  return toPublicSettings(row);
}

export async function resolveApifyToken() {
  const row = await getAppSettingsRow();
  const dbToken = row?.apify_token?.trim();
  if (dbToken) return dbToken;

  return process.env.APIFY_TOKEN?.trim() || null;
}

export async function resolveSyncIntervalMinutes() {
  const row = await getAppSettingsRow();
  if (row?.sync_interval_minutes) {
    return clampSyncInterval(row.sync_interval_minutes);
  }

  const envMinutes = Number(process.env.APIFY_SYNC_CACHE_MINUTES ?? 360);
  return clampSyncInterval(envMinutes);
}

export async function saveAppSettings(input: SaveAppSettingsInput) {
  const existing = await getAppSettingsRow();

  const nextRecord = {
    id: APP_SETTINGS_ID,
    apify_token: existing?.apify_token ?? null,
    sync_interval_minutes: clampSyncInterval(
      input.syncIntervalMinutes ?? existing?.sync_interval_minutes ?? DEFAULT_SETTINGS.sync_interval_minutes,
    ),
    theme: normalizeTheme(input.theme ?? existing?.theme ?? DEFAULT_SETTINGS.theme),
    notify_sync_success:
      input.notifications?.syncSuccess ?? existing?.notify_sync_success ?? DEFAULT_SETTINGS.notify_sync_success,
    notify_sync_error:
      input.notifications?.syncError ?? existing?.notify_sync_error ?? DEFAULT_SETTINGS.notify_sync_error,
    notify_weekly_digest:
      input.notifications?.weeklyDigest ?? existing?.notify_weekly_digest ?? DEFAULT_SETTINGS.notify_weekly_digest,
    updated_at: new Date().toISOString(),
  };

  if (input.clearApifyToken) {
    nextRecord.apify_token = null;
  } else if (input.apifyToken?.trim()) {
    nextRecord.apify_token = input.apifyToken.trim();
  }

  const { data, error } = await supabase.from("app_settings").upsert(nextRecord).select().single();

  if (error) {
    throw new Error(error.message);
  }

  return toPublicSettings(data as AppSettingsRow);
}
