import { supabase } from "@/lib/supabase";

export type AccountRow = {
  id: string;
  handle: string;
  display_name: string | null;
  profile_url: string;
  avatar_url: string | null;
  followers_count: number;
  likes_count: number;
  video_count: number;
  total_views: number;
  engagement_rate: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VideoRow = {
  id: string;
  account_id: string;
  tiktok_video_id: string | null;
  title: string;
  video_url: string | null;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  retention_rate: number | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAccounts() {
  return supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function getVideosByAccount(accountId: string) {
  return supabase
    .from("videos")
    .select("*")
    .eq("account_id", accountId)
    .order("posted_at", { ascending: false, nullsFirst: false });
}

export async function upsertAccount(account: Pick<AccountRow, "handle" | "profile_url"> & Partial<AccountRow>) {
  return supabase
    .from("accounts")
    .upsert(account, { onConflict: "handle" })
    .select()
    .single();
}

export async function deleteAccountByHandle(handle: string) {
  return supabase.from("accounts").delete({ count: "exact" }).eq("handle", handle);
}
