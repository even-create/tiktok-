"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Clapperboard, LoaderCircle, Play, RefreshCw, Sparkles, Upload, Wand2 } from "lucide-react";
import { ANIME_CHARACTERS } from "@/lib/vidmor/config";
import { buildImageToVideoPrompt, EXAMPLE_ACTIONS } from "@/lib/anime/prompts";
import type { AnimeJobRecord } from "@/lib/anime/jobs";
import { formatBeijingTime } from "@/lib/format-beijing-time";

const REF_STORAGE_KEY = "anime-character-refs";

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

export default function AiAnimePage() {
  const [characterId, setCharacterId] = useState(ANIME_CHARACTERS[0]?.id ?? "");
  const [action, setAction] = useState("脱下手套");
  const [customRefUrls, setCustomRefUrls] = useState<Record<string, string>>({});
  const [activeJob, setActiveJob] = useState<AnimeJobRecord | null>(null);
  const [recentJobs, setRecentJobs] = useState<AnimeJobRecord[]>([]);
  const [configured, setConfigured] = useState(true);
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCharacter = useMemo(
    () => ANIME_CHARACTERS.find((character) => character.id === characterId) ?? ANIME_CHARACTERS[0],
    [characterId],
  );

  const videoPromptPreview = useMemo(() => buildImageToVideoPrompt(action), [action]);

  const currentRefPreview = useMemo(() => {
    if (!selectedCharacter) return "";
    return customRefUrls[selectedCharacter.id] || selectedCharacter.refImagePath;
  }, [customRefUrls, selectedCharacter]);

  const currentReferenceImageUrl = selectedCharacter ? customRefUrls[selectedCharacter.id] : undefined;

  useEffect(() => {
    setCustomRefUrls(loadStoredRefs());
  }, []);

  const refreshJobs = useCallback(async () => {
    const response = await fetch("/api/anime/generate");
    const payload = (await response.json()) as {
      jobs?: AnimeJobRecord[];
      configured?: boolean;
      config?: { missing?: string[] };
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "读取任务失败");
    }

    setRecentJobs(payload.jobs ?? []);
    setConfigured(payload.configured ?? false);
    setMissingEnvVars(payload.config?.missing ?? []);
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/anime/jobs/${jobId}`);
    const payload = (await response.json()) as { job?: AnimeJobRecord; error?: string };

    if (!response.ok || !payload.job) {
      throw new Error(payload.error ?? "读取任务状态失败");
    }

    setActiveJob(payload.job);

    if (payload.job.status === "pending" || payload.job.status === "running") {
      window.setTimeout(() => {
        void pollJob(jobId);
      }, 2500);
      return;
    }

    await refreshJobs();
  }, [refreshJobs]);

  const handleUploadRef = useCallback(
    async (file: File) => {
      if (!selectedCharacter) return;

      setIsUploading(true);
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
          const next = { ...previous, [selectedCharacter.id]: payload.url! };
          saveStoredRefs(next);
          return next;
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "上传失败");
      } finally {
        setIsUploading(false);
      }
    },
    [selectedCharacter],
  );

  const handleGenerate = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/anime/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          action,
          referenceImageUrl: currentReferenceImageUrl,
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
        setActiveJob(payload.job);
      }

      const jobId = payload.jobId ?? payload.job?.id;
      if (jobId) {
        void pollJob(jobId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [action, characterId, currentReferenceImageUrl, pollJob]);

  useEffect(() => {
    void refreshJobs().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "读取任务失败");
    });
  }, [refreshJobs]);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Clapperboard className="size-4" />
              AI Anime Studio
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--space-cadet)]">一键动漫成片</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cadet-gray)]">
              为四个账号分别上传角色参考图，填写动作后自动完成 GPT Image 2.0 图生图与 Seedance 2.0
              图生视频（720p / 5s）。图生视频台词会随动作自动替换。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshJobs()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-4 text-sm text-[var(--space-cadet)] transition hover:bg-[var(--eggshell)]/70"
          >
            <RefreshCw className="size-4" />
            刷新任务
          </button>
        </div>
      </header>

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

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--space-cadet)]">选择角色与动作</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ANIME_CHARACTERS.map((character) => {
              const active = character.id === characterId;
              const preview = customRefUrls[character.id] || character.refImagePath;
              const hasCustom = Boolean(customRefUrls[character.id]);

              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => setCharacterId(character.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[var(--carolina-blue)] bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)]"
                      : "border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] hover:bg-[var(--eggshell)]/60"
                  }`}
                >
                  <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[var(--eggshell)]">
                    {preview.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={character.name} className="h-full w-full object-cover" />
                    ) : (
                      <Image src={preview} alt={character.name} fill className="object-cover" unoptimized />
                    )}
                    {hasCustom ? (
                      <span className="absolute left-2 top-2 rounded-full bg-[var(--space-cadet)] px-2 py-0.5 text-[10px] text-white">
                        已上传
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-medium text-[var(--space-cadet)]">{character.name}</p>
                  <p className="text-xs text-[var(--cadet-gray)]">{character.accountLabel}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--space-cadet)]">
                  上传 {selectedCharacter?.accountLabel} 参考图
                </p>
                <p className="mt-1 text-xs text-[var(--cadet-gray)]">JPG / PNG / WEBP，最大 10MB，建议 9:16</p>
              </div>
              <button
                type="button"
                disabled={isUploading || !configured}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-4 text-sm text-[var(--space-cadet)] transition hover:bg-white disabled:opacity-60"
              >
                {isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {isUploading ? "上传中…" : "选择照片"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUploadRef(file);
                event.target.value = "";
              }}
            />
            {currentRefPreview ? (
              <p className="mt-3 truncate text-xs text-[var(--cadet-gray)]">
                当前参考：{currentReferenceImageUrl ? "已上传至 Vidmor" : "使用默认占位图"}
              </p>
            ) : null}
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-[var(--space-cadet)]">漫画动作</span>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-4 py-3 text-sm outline-none ring-[var(--carolina-blue)] focus:ring-2"
              placeholder="例如：脱下手套"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_ACTIONS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setAction(example)}
                className="rounded-full border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] px-3 py-1 text-xs text-[var(--cadet-gray)] hover:bg-[var(--eggshell)]/70"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isSubmitting || !configured || !action.trim()}
            onClick={() => void handleGenerate()}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--space-cadet)] to-[var(--jet)] text-sm font-medium text-[var(--eggshell)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            生成漫画视频
          </button>

          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--space-cadet)]">当前参数</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[var(--cadet-gray)]">图生图模型</dt>
                <dd className="font-medium text-[var(--space-cadet)]">GPT Image 2.0</dd>
              </div>
              <div>
                <dt className="text-[var(--cadet-gray)]">图生视频模型</dt>
                <dd className="font-medium text-[var(--space-cadet)]">Seedance 2.0</dd>
              </div>
              <div>
                <dt className="text-[var(--cadet-gray)]">视频参数</dt>
                <dd className="font-medium text-[var(--space-cadet)]">720p · 5s · 固定镜头</dd>
              </div>
              <div>
                <dt className="text-[var(--cadet-gray)]">当前角色</dt>
                <dd className="font-medium text-[var(--space-cadet)]">
                  {selectedCharacter?.name}（{selectedCharacter?.accountLabel}）
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--space-cadet)]">
              <Sparkles className="size-4 text-[var(--carolina-blue)]" />
              图生视频提示词（随动作变化）
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--cadet-gray)]">{videoPromptPreview}</p>
          </div>

          {activeJob ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--space-cadet)]">当前任务</h2>
              <p className="mt-2 text-sm text-[var(--cadet-gray)]">
                状态：{activeJob.status} · 阶段：{activeJob.stage} · 进度：{activeJob.progress}%
              </p>
              {activeJob.error_message ? (
                <p className="mt-2 text-sm text-red-600">{activeJob.error_message}</p>
              ) : null}
              {activeJob.image_url ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-[var(--space-cadet)]">漫画图</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeJob.image_url} alt="Generated comic" className="max-h-80 rounded-xl object-contain" />
                </div>
              ) : null}
              {activeJob.video_url ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-[var(--space-cadet)]">成片</p>
                  <video src={activeJob.video_url} controls className="w-full rounded-xl" />
                  <a
                    href={activeJob.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--carolina-blue)]"
                  >
                    <Play className="size-4" />
                    打开视频链接
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--space-cadet)]">最近任务</h2>
        <div className="mt-4 space-y-3">
          {recentJobs.length === 0 ? (
            <p className="text-sm text-[var(--cadet-gray)]">还没有生成记录。</p>
          ) : (
            recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--space-cadet)]">
                    {job.character_id} · {job.action}
                  </p>
                  <p className="text-xs text-[var(--cadet-gray)]">
                    {formatBeijingTime(job.created_at)} · {job.status} · {job.stage}
                  </p>
                </div>
                {job.video_url ? (
                  <a
                    href={job.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[var(--carolina-blue)]"
                  >
                    查看成片
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
