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
  image_task_id: string | null;
  video_task_id: string | null;
  reference_image_url: string | null;
  image_prompt_template: string | null;
  video_prompt_template: string | null;
  video_duration: number;
  video_resolution: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAnimeJobInput = {
  characterId: string;
  action: string;
  referenceImageUrl?: string | null;
  imagePromptTemplate?: string | null;
  videoPromptTemplate?: string | null;
  videoDuration?: number;
  videoResolution?: string;
};

export function resolveMaxConcurrentAnimeJobs() {
  const parsed = Number(process.env.ANIME_MAX_CONCURRENT_JOBS ?? 5);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }
  return Math.min(Math.floor(parsed), 5);
}

export async function createAnimeJob(input: CreateAnimeJobInput) {
  const { data, error } = await supabase
    .from("anime_jobs")
    .insert({
      character_id: input.characterId,
      action: input.action,
      status: "pending",
      stage: "queued",
      progress: 0,
      reference_image_url: input.referenceImageUrl?.trim() || null,
      image_prompt_template: input.imagePromptTemplate?.trim() || null,
      video_prompt_template: input.videoPromptTemplate?.trim() || null,
      video_duration: input.videoDuration ?? 5,
      video_resolution: input.videoResolution ?? "720p",
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
  patch: Partial<
    Pick<
      AnimeJobRecord,
      | "status"
      | "stage"
      | "progress"
      | "image_url"
      | "video_url"
      | "image_task_id"
      | "video_task_id"
      | "error_message"
    >
  >,
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

/** Atomically claim the one allowed video submission for a job (progress must be 60). */
export async function claimAnimeVideoSubmit(jobId: string) {
  const { data, error } = await supabase
    .from("anime_jobs")
    .update({
      progress: 62,
      stage: "image_to_video",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .is("video_task_id", null)
    .eq("progress", 60)
    .eq("status", "running")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AnimeJobRecord | null) ?? null;
}

export async function getAnimeJob(id: string) {
  const { data, error } = await supabase.from("anime_jobs").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as AnimeJobRecord | null) ?? null;
}

export async function countRunningAnimeJobs() {
  const { count, error } = await supabase
    .from("anime_jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "running");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function claimNextQueuedAnimeJob() {
  const { data: queued, error: selectError } = await supabase
    .from("anime_jobs")
    .select("*")
    .eq("status", "pending")
    .eq("stage", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (!queued) {
    return null;
  }

  const { data, error } = await supabase
    .from("anime_jobs")
    .update({
      status: "running",
      stage: "uploading",
      progress: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", queued.id)
    .eq("status", "pending")
    .eq("stage", "queued")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AnimeJobRecord | null) ?? null;
}

export async function listRecentAnimeJobs(limit = 50) {
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

export async function listActiveAnimeJobs() {
  const { data, error } = await supabase
    .from("anime_jobs")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AnimeJobRecord[];
}
