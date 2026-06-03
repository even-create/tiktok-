import { supabase } from "@/lib/supabase";

export type AnimeJobStatus = "pending" | "running" | "success" | "failed";
export type AnimeJobStage =
  | "queued"
  | "uploading"
  | "image_to_image"
  | "image_to_video"
  | "completed"
  | "failed";

export type AnimeJobRecord = {
  id: string;
  character_id: string;
  action: string;
  status: AnimeJobStatus;
  stage: AnimeJobStage;
  progress: number;
  image_url: string | null;
  video_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function createAnimeJob(characterId: string, action: string) {
  const { data, error } = await supabase
    .from("anime_jobs")
    .insert({
      character_id: characterId,
      action,
      status: "pending",
      stage: "queued",
      progress: 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AnimeJobRecord;
}

export async function updateAnimeJob(
  id: string,
  patch: Partial<Pick<AnimeJobRecord, "status" | "stage" | "progress" | "image_url" | "video_url" | "error_message">>,
) {
  const { data, error } = await supabase
    .from("anime_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AnimeJobRecord;
}

export async function getAnimeJob(id: string) {
  const { data, error } = await supabase.from("anime_jobs").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as AnimeJobRecord | null) ?? null;
}

export async function listRecentAnimeJobs(limit = 10) {
  const { data, error } = await supabase
    .from("anime_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AnimeJobRecord[];
}
