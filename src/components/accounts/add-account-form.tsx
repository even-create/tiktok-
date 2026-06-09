"use client";

import { useState, type FormEvent } from "react";
import { Clock3, Link2, Plus } from "lucide-react";

type AddAccountFormProps = {
  disabled?: boolean;
  className?: string;
  onAdded?: (handle?: string, videosCount?: number) => void;
  onError?: (message: string) => void;
};

export function AddAccountForm({ disabled = false, className = "", onAdded, onError }: AddAccountFormProps) {
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tiktokUrl.trim() || disabled || isSyncing) return;

    setIsSyncing(true);
    onError?.("");

    try {
      const response = await fetch("/api/sync-tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tiktokUrl, force: true }),
      });
      const payload = (await response.json()) as {
        account?: { handle: string };
        videosCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "TikTok 同步失败");
      }

      setTiktokUrl("");
      onAdded?.(payload.account?.handle, payload.videosCount);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "TikTok 同步失败");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full flex-col gap-2 sm:flex-row sm:items-center ${className}`.trim()}
    >
      <label className="relative flex-1">
        <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
        <input
          value={tiktokUrl}
          onChange={(event) => setTiktokUrl(event.target.value)}
          placeholder="粘贴 抖音 / 小红书 / Instagram / TikTok 链接"
          className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)] focus:bg-[var(--card)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
          disabled={disabled || isSyncing}
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] px-5 text-sm font-semibold text-[var(--eggshell)] transition duration-200 hover:bg-[var(--jet)] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled || isSyncing}
      >
        {isSyncing ? <Clock3 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {isSyncing ? "抓取中" : "添加账号"}
      </button>
    </form>
  );
}
