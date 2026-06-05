"use client";

import { useMemo, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import type { AnimeJobRecord } from "@/lib/anime/jobs";
import { resolveCharacterName } from "@/lib/anime/character-names";
import {
  filterJobsByTab,
  getJobDisplayStatus,
  getJobStageLabel,
  getJobStatusLabel,
  type AnimeJobTab,
} from "@/lib/anime/job-status";
import { VideoDownloadButton } from "@/components/anime/video-download-button";
import { formatBeijingTime } from "@/lib/format-beijing-time";

const TABS: Array<{ id: AnimeJobTab; label: string }> = [
  { id: "active", label: "进行中 / 排队" },
  { id: "success", label: "已完成" },
  { id: "failed", label: "失败" },
];

type AnimeJobListProps = {
  jobs: AnimeJobRecord[];
  characterNames?: Record<string, string>;
  selectedJobId?: string | null;
  onSelectJob?: (job: AnimeJobRecord) => void;
  onSyncJob?: (jobId: string) => void;
  syncingJobId?: string | null;
};

export function AnimeJobList({
  jobs,
  characterNames,
  selectedJobId,
  onSelectJob,
  onSyncJob,
  syncingJobId,
}: AnimeJobListProps) {
  const [tab, setTab] = useState<AnimeJobTab>("active");

  const filteredJobs = useMemo(() => filterJobsByTab(jobs, tab), [jobs, tab]);
  const tabCounts = useMemo(
    () => ({
      active: filterJobsByTab(jobs, "active").length,
      success: filterJobsByTab(jobs, "success").length,
      failed: filterJobsByTab(jobs, "failed").length,
    }),
    [jobs],
  );

  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--space-cadet)]">任务列表</h2>
          <p className="mt-1 text-xs text-[var(--cadet-gray)]">
            切换页面不会中断后台生成；此处会自动刷新队列与同步状态。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tab === item.id
                  ? "bg-[var(--space-cadet)] text-white"
                  : "border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] text-[var(--cadet-gray)] hover:bg-[var(--eggshell)]/70"
              }`}
            >
              {item.label} ({tabCounts[item.id]})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filteredJobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] px-4 py-8 text-center text-sm text-[var(--cadet-gray)]">
            暂无{tab === "active" ? "进行中或排队" : tab === "success" ? "已完成" : "失败"}任务。
          </p>
        ) : (
          filteredJobs.map((job) => {
            const displayStatus = getJobDisplayStatus(job);
            const selected = selectedJobId === job.id;

            return (
              <div
                key={job.id}
                className={`rounded-xl border px-4 py-3 transition ${
                  selected
                    ? "border-[var(--carolina-blue)] bg-[color-mix(in_srgb,var(--carolina-blue)_8%,white)]"
                    : "border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)]"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectJob?.(job)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[var(--space-cadet)]">
                        {resolveCharacterName(job.character_id, characterNames)} · {job.action}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          displayStatus === "queued"
                            ? "bg-amber-100 text-amber-800"
                            : displayStatus === "running"
                              ? "bg-sky-100 text-sky-800"
                              : displayStatus === "success"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {getJobStatusLabel(job)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--cadet-gray)]">
                      {formatBeijingTime(job.created_at)} · {getJobStageLabel(job)}
                      {displayStatus === "running" ? ` · ${job.progress}%` : ""}
                    </p>
                    {job.error_message ? (
                      <p
                        className={`mt-1 text-xs ${
                          displayStatus === "failed" ? "text-red-600" : "text-amber-700"
                        }`}
                      >
                        {job.error_message}
                      </p>
                    ) : null}
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    {displayStatus === "running" && !job.video_url ? (
                      <button
                        type="button"
                        disabled={syncingJobId === job.id}
                        onClick={() => onSyncJob?.(job.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] px-3 text-xs text-[var(--space-cadet)] hover:bg-[var(--eggshell)]/70 disabled:opacity-60"
                      >
                        <RefreshCw className={`size-3.5 ${syncingJobId === job.id ? "animate-spin" : ""}`} />
                        同步
                      </button>
                    ) : null}
                    {job.video_url ? (
                      <>
                        <a
                          href={job.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--carolina-blue)] px-3 text-xs font-medium text-white"
                        >
                          <Play className="size-3.5" />
                          查看成片
                        </a>
                        <VideoDownloadButton job={job} characterNames={characterNames} />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
