"use client";

import { useState } from "react";
import { Clock3, Link2, Plus, X } from "lucide-react";

type AddBenchmarkModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded?: (handle?: string, videosCount?: number) => void;
  onError?: (message: string) => void;
};

export function AddBenchmarkModal({ open, onClose, onAdded, onError }: AddBenchmarkModalProps) {
  const [url, setUrl] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!url.trim() || isSyncing) return;

    setIsSyncing(true);
    onError?.("");

    try {
      const response = await fetch("/api/benchmark-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as {
        account?: { handle: string };
        videosCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "同步失败");
      }

      setUrl("");
      onAdded?.(payload.account?.handle, payload.videosCount);
      onClose();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "同步失败");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="关闭弹窗"
        onClick={() => !isSyncing && onClose()}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] bg-[var(--card)] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              Add Benchmark Account
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--space-cadet)]">添加对标账号</h2>
            <p className="mt-1 text-sm text-[var(--cadet-gray)]">粘贴竞品主页链接，系统将自动抓取账号与视频数据。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="grid size-9 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] text-[var(--cadet-gray)] transition hover:text-[var(--space-cadet)] disabled:opacity-50"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="relative mt-5 block">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.tiktok.com/@khaby.lame"
            className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-white pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_20%,transparent)]"
            disabled={isSyncing}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_28%,transparent)] px-4 text-sm font-medium text-[var(--cadet-gray)] transition hover:text-[var(--space-cadet)] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSyncing || !url.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] px-5 text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? <Clock3 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isSyncing ? "抓取中…" : "添加并同步"}
          </button>
        </div>
      </div>
    </div>
  );
}
