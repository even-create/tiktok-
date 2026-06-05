"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Clapperboard,
  Coins,
  LoaderCircle,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { AnimeJobList } from "@/components/anime/anime-job-list";
import { VideoDownloadButton } from "@/components/anime/video-download-button";
import { ANIME_CHARACTERS } from "@/lib/vidmor/config";
import {
  loadStoredCharacterNames,
  resolveCharacterName,
  saveStoredCharacterNames,
} from "@/lib/anime/character-names";
import {
  buildImageToImagePrompt,
  buildImageToVideoPrompt,
  DEFAULT_IMAGE_PROMPT_TEMPLATE,
  DEFAULT_VIDEO_PROMPT_TEMPLATE,
  VIDEO_DURATION_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from "@/lib/anime/prompts";
import type { AnimeJobRecord } from "@/lib/anime/jobs";
import { getJobDisplayStatus } from "@/lib/anime/job-status";

const REF_STORAGE_KEY = "anime-character-refs";
const PARAMS_STORAGE_KEY = "anime-generation-params";

type StoredParams = {
  imagePromptTemplate: string;
  videoPromptTemplate: string;
  videoDuration: number;
  videoResolution: string;
};

const DEFAULT_PARAMS: StoredParams = {
  imagePromptTemplate: DEFAULT_IMAGE_PROMPT_TEMPLATE,
  videoPromptTemplate: DEFAULT_VIDEO_PROMPT_TEMPLATE,
  videoDuration: 5,
  videoResolution: "720p",
};

function loadStoredRefs(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REF_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveStoredRefs(refs: Record<string, string>) {
  window.localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(refs));
}

function loadStoredParams(): StoredParams {
  if (typeof window === "undefined") return DEFAULT_PARAMS;
  try {
    const raw = window.localStorage.getItem(PARAMS_STORAGE_KEY);
    if (!raw) return DEFAULT_PARAMS;
    return { ...DEFAULT_PARAMS, ...(JSON.parse(raw) as Partial<StoredParams>) };
  } catch {
    return DEFAULT_PARAMS;
  }
}

function saveStoredParams(params: StoredParams) {
  window.localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params));
}

export default function AiAnimePage() {
  const [characterId, setCharacterId] = useState(ANIME_CHARACTERS[0]?.id ?? "");
  const [action, setAction] = useState("脱下手套");
  const [params, setParams] = useState<StoredParams>(DEFAULT_PARAMS);
  const [customRefUrls, setCustomRefUrls] = useState<Record<string, string>>({});
  const [characterNames, setCharacterNames] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<AnimeJobRecord | null>(null);
  const [recentJobs, setRecentJobs] = useState<AnimeJobRecord[]>([]);
  const [configured, setConfigured] = useState(true);
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>([]);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [vidmorCoin, setVidmorCoin] = useState<number | null>(null);
  const [vidmorCoinError, setVidmorCoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCharacterId, setUploadingCharacterId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  const selectedCharacter = useMemo(
    () => ANIME_CHARACTERS.find((character) => character.id === characterId) ?? ANIME_CHARACTERS[0],
    [characterId],
  );

  const imagePromptPreview = useMemo(
    () => buildImageToImagePrompt(action, params.imagePromptTemplate),
    [action, params.imagePromptTemplate],
  );

  const videoPromptPreview = useMemo(
    () => buildImageToVideoPrompt(action, params.videoPromptTemplate),
    [action, params.videoPromptTemplate],
  );

  const currentReferenceImageUrl = selectedCharacter ? customRefUrls[selectedCharacter.id] : undefined;

  useEffect(() => {
    setCustomRefUrls(loadStoredRefs());
    setParams(loadStoredParams());
    setCharacterNames(loadStoredCharacterNames());
  }, []);

  const refreshJobs = useCallback(async () => {
    const response = await fetch("/api/anime/generate");
    const payload = (await response.json()) as {
      jobs?: AnimeJobRecord[];
      configured?: boolean;
      config?: { missing?: string[] };
      maxConcurrent?: number;
      wallet?: { total?: number; permanent?: number; expiring?: number } | null;
      walletError?: string | null;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "读取任务失败");
    }

    setRecentJobs(payload.jobs ?? []);
    setConfigured(payload.configured ?? false);
    setMissingEnvVars(payload.config?.missing ?? []);
    setMaxConcurrent(payload.maxConcurrent ?? 5);
    setVidmorCoin(typeof payload.wallet?.total === "number" ? payload.wallet.total : null);
    setVidmorCoinError(payload.walletError ?? null);

    setSelectedJob((current) => {
      if (!current) {
        return current;
      }
      return payload.jobs?.find((job) => job.id === current.id) ?? current;
    });
  }, []);

  const syncJob = useCallback(
    async (jobId: string) => {
      setSyncingJobId(jobId);
      setIsSyncing(true);
      try {
        const response = await fetch(`/api/anime/jobs/${jobId}/sync`, { method: "POST" });
        const payload = (await response.json()) as {
          job?: AnimeJobRecord;
          synced?: boolean;
          message?: string;
          error?: string;
        };

        if (!response.ok || !payload.job) {
          throw new Error(payload.error ?? "同步失败");
        }

        setSelectedJob(payload.job);
        await refreshJobs();

        if (payload.synced) {
          setErrorMessage("");
        } else {
          setErrorMessage(payload.message ?? "暂未在 Vidmor 找到已完成成片");
        }

        return payload.job;
      } finally {
        setIsSyncing(false);
        setSyncingJobId(null);
      }
    },
    [refreshJobs],
  );

  const handleUploadRef = useCallback(async (file: File, targetCharacterId: string) => {
    setIsUploading(true);
    setUploadingCharacterId(targetCharacterId);
    setErrorMessage("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/anime/upload-ref", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "上传失败");
      }

      setCustomRefUrls((previous) => {
        const next = { ...previous, [targetCharacterId]: payload.url! };
        saveStoredRefs(next);
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIsUploading(false);
      setUploadingCharacterId(null);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    saveStoredParams(params);

    try {
      const response = await fetch("/api/anime/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          action,
          referenceImageUrl: currentReferenceImageUrl,
          imagePromptTemplate: params.imagePromptTemplate,
          videoPromptTemplate: params.videoPromptTemplate,
          videoDuration: params.videoDuration,
          videoResolution: params.videoResolution,
        }),
      });

      const payload = (await response.json()) as {
        job?: AnimeJobRecord;
        jobId?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "创建任务失败");
      }

      if (payload.job) {
        setSelectedJob(payload.job);
      }

      await refreshJobs();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [action, characterId, currentReferenceImageUrl, params, refreshJobs]);

  const updateParams = useCallback((patch: Partial<StoredParams>) => {
    setParams((current) => {
      const next = { ...current, ...patch };
      saveStoredParams(next);
      return next;
    });
  }, []);

  const updateCharacterName = useCallback((id: string, name: string) => {
    setCharacterNames((current) => {
      const next = { ...current, [id]: name };
      saveStoredCharacterNames(next);
      return next;
    });
  }, []);

  useEffect(() => {
    void refreshJobs().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "读取任务失败");
    });
  }, [refreshJobs]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshJobs().catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [refreshJobs]);

  const activeCount = recentJobs.filter((job) => {
    const status = getJobDisplayStatus(job);
    return status === "queued" || status === "running";
  }).length;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Clapperboard className="size-4" />
              AI Anime Studio
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--space-cadet)]">一键动漫成片</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cadet-gray)]">
              支持多任务并行（最多 {maxConcurrent} 个同时生成，其余自动排队）。切换页面不会中断后台任务。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
            {configured ? (
              <div
                className="rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-4 py-2.5"
                title={vidmorCoinError ?? "当前 Vidmor 账号可用积分"}
              >
                <div className="flex items-center gap-2 text-[11px] text-[var(--cadet-gray)]">
                  <Coins className="size-3.5 text-[var(--carolina-blue)]" />
                  Vidmor 积分
                </div>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--space-cadet)]">
                  {vidmorCoinError ? "—" : vidmorCoin !== null ? vidmorCoin.toLocaleString("zh-CN") : "…"}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void refreshJobs()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-4 text-sm text-[var(--space-cadet)] transition hover:bg-[var(--eggshell)]/70"
            >
              <RefreshCw className="size-4" />
              刷新任务
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Sparkles className="size-4" />
              生成参数
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cadet-gray)]">
              图生图 / 图生视频模板与视频输出设置。模板支持占位符，修改后下次提交任务时生效。
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateParams(DEFAULT_PARAMS)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-4 text-sm text-[var(--space-cadet)] transition hover:bg-[var(--eggshell)]/70"
          >
            <RotateCcw className="size-4" />
            恢复默认
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-[var(--cadet-gray)]">视频时长</span>
              <select
                value={params.videoDuration}
                onChange={(event) => updateParams({ videoDuration: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 py-2 text-sm"
              >
                {VIDEO_DURATION_OPTIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}s
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--cadet-gray)]">视频分辨率</span>
              <select
                value={params.videoResolution}
                onChange={(event) => updateParams({ videoResolution: event.target.value })}
                className="mt-1 w-full rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 py-2 text-sm"
              >
                {VIDEO_RESOLUTION_OPTIONS.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block min-w-0">
            <span className="text-xs text-[var(--cadet-gray)]">图生图模板（{"{action}"}）</span>
            <textarea
              value={params.imagePromptTemplate}
              onChange={(event) => updateParams({ imagePromptTemplate: event.target.value })}
              rows={5}
              className="mt-1 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 py-2 text-xs leading-5 outline-none ring-[var(--carolina-blue)] focus:ring-2"
            />
          </label>

          <label className="block min-w-0">
            <span className="text-xs text-[var(--cadet-gray)]">
              图生视频模板（{"{motionAction}"} / {"{speechAction}"}）
            </span>
            <textarea
              value={params.videoPromptTemplate}
              onChange={(event) => updateParams({ videoPromptTemplate: event.target.value })}
              rows={5}
              className="mt-1 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 py-2 text-xs leading-5 outline-none ring-[var(--carolina-blue)] focus:ring-2"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl bg-[var(--eggshell)]/40 p-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-[var(--space-cadet)]">图生图预览</p>
            <p className="mt-2 text-[11px] leading-5 text-[var(--cadet-gray)]">{imagePromptPreview}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--space-cadet)]">图生视频预览</p>
            <p className="mt-2 text-[11px] leading-5 text-[var(--cadet-gray)]">{videoPromptPreview}</p>
          </div>
        </div>
      </section>

      {!configured ? (
        <section className="rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900">
          <p>尚未配置 Vidmor（Production 环境未读到变量）。</p>
          {missingEnvVars.length > 0 ? (
            <p className="mt-2">
              当前缺少：<code>{missingEnvVars.join(", ")}</code>
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--space-cadet)]">创建成片</h2>
            <p className="mt-1 text-sm text-[var(--cadet-gray)]">选择角色、填写动作，一键提交生成任务</p>
          </div>
          <span className="rounded-full bg-[var(--eggshell)]/70 px-3 py-1 text-xs text-[var(--cadet-gray)]">
            {activeCount} 个活跃任务
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ANIME_CHARACTERS.map((character) => {
            const active = character.id === characterId;
            const preview = customRefUrls[character.id] || character.refImagePath;
            const hasCustom = Boolean(customRefUrls[character.id]);
            const isEditing = editingCharacterId === character.id;

            return (
              <div
                key={character.id}
                className={`rounded-xl border p-2 transition ${
                  active
                    ? "border-[var(--carolina-blue)] bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)]"
                    : "border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] hover:bg-[var(--eggshell)]/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCharacterId(character.id);
                    setEditingCharacterId(null);
                  }}
                  className="w-full text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--eggshell)]">
                    {preview.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={character.name} className="h-full w-full object-cover object-top" />
                    ) : (
                      <Image src={preview} alt={character.name} fill className="object-cover object-top" unoptimized />
                    )}
                    {hasCustom ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--space-cadet)] px-1.5 py-0.5 text-[10px] text-white">
                        已上传
                      </span>
                    ) : null}
                  </div>
                </button>

                <div className="mt-2 flex items-center gap-1">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={characterNames[character.id] ?? character.name}
                      onChange={(event) => updateCharacterName(character.id, event.target.value)}
                      onBlur={() => setEditingCharacterId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === "Escape") {
                          setEditingCharacterId(null);
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--carolina-blue)] bg-[var(--card)] px-2 py-1 text-sm outline-none ring-2 ring-[color-mix(in_srgb,var(--carolina-blue)_30%,transparent)]"
                    />
                  ) : (
                    <>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--space-cadet)]">
                        {resolveCharacterName(character.id, characterNames)}
                      </p>
                      <button
                        type="button"
                        aria-label={`更换${resolveCharacterName(character.id, characterNames)}的参考图`}
                        disabled={(isUploading && uploadingCharacterId === character.id) || !configured}
                        onClick={() => {
                          setCharacterId(character.id);
                          setEditingCharacterId(null);
                          fileInputRef.current?.click();
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)] disabled:opacity-60"
                      >
                        {isUploading && uploadingCharacterId === character.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`修改${resolveCharacterName(character.id, characterNames)}的名称`}
                        onClick={() => {
                          setCharacterId(character.id);
                          setEditingCharacterId(character.id);
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <p className="truncate text-[11px] text-[var(--cadet-gray)]">{character.accountLabel}</p>
              </div>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && characterId) {
              void handleUploadRef(file, characterId);
            }
            event.target.value = "";
          }}
        />

        <div className="mt-5 space-y-3 border-t border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--space-cadet)]">漫画动作</span>
              <input
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-4 py-2.5 text-sm outline-none ring-[var(--carolina-blue)] focus:ring-2"
                placeholder="例如：踢足球"
              />
            </label>
            <button
              type="button"
              disabled={isSubmitting || !configured || !action.trim()}
              onClick={() => void handleGenerate()}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] px-8 text-sm font-medium text-[var(--eggshell)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              提交生成任务
            </button>
          </div>
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        </div>
      </section>

      {selectedJob ? (
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--space-cadet)]">任务详情</h2>
          <p className="mt-2 text-sm text-[var(--cadet-gray)]">
            {getJobDisplayStatus(selectedJob) === "queued" ? "排队中" : getJobDisplayStatus(selectedJob) === "running" ? "进行中" : getJobDisplayStatus(selectedJob) === "success" ? "已完成" : "失败"}
            {" · "}
            {selectedJob.stage} · {selectedJob.progress}%
          </p>
          {selectedJob.error_message ? (
            <p className="mt-2 text-sm text-amber-700">{selectedJob.error_message}</p>
          ) : null}
          {selectedJob.status === "running" && !selectedJob.video_url ? (
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => void syncJob(selectedJob.id)}
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-3 text-sm text-[var(--space-cadet)] transition hover:bg-[var(--eggshell)]/70 disabled:opacity-60"
            >
              {isSyncing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              从 Vidmor 同步成片
            </button>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {selectedJob.image_url ? (
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--space-cadet)]">漫画图</p>
                <div className="aspect-video overflow-hidden rounded-xl bg-[var(--eggshell)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedJob.image_url} alt="Generated comic" className="h-full w-full object-contain" />
                </div>
              </div>
            ) : null}
            {selectedJob.video_url ? (
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--space-cadet)]">成片</p>
                <video src={selectedJob.video_url} controls className="aspect-video w-full rounded-xl bg-black" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={selectedJob.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[var(--carolina-blue)]"
                  >
                    <Play className="size-4" />
                    打开视频链接
                  </a>
                  <VideoDownloadButton
                    job={selectedJob}
                    characterNames={characterNames}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-3 text-sm text-[var(--space-cadet)] hover:bg-[var(--eggshell)]/70 disabled:opacity-60"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <AnimeJobList
        jobs={recentJobs}
        characterNames={characterNames}
        selectedJobId={selectedJob?.id}
        onSelectJob={setSelectedJob}
        onSyncJob={(jobId) => void syncJob(jobId)}
        syncingJobId={syncingJobId}
      />
    </div>
  );
}
