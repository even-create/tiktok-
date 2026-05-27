import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Placeholders so `next build` completes when env vars are not injected yet.
 * On Vercel, add real values: Project → Settings → Environment Variables.
 */
const BUILD_FALLBACK_URL = "https://build-placeholder.invalid";
const BUILD_FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.build_placeholder";

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function resolveSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (url && key) {
    return { url: normalizeSupabaseUrl(url), key };
  }

  return {
    url: normalizeSupabaseUrl(BUILD_FALLBACK_URL),
    key: BUILD_FALLBACK_ANON_KEY,
  };
}

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!cached) {
    const cfg = resolveSupabaseConfig();
    cached = createClient(cfg.url, cfg.key);
  }
  return cached;
}

/** True when real Supabase env is set (otherwise API/data calls will fail). */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return !!(url && key);
}

/** @deprecated Prefer getSupabase(); lazy Proxy keeps existing imports working. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client as unknown as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
