"use client";

import { LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败");
      }

      router.replace(searchParams.get("from") || "/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--card)] p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-[var(--space-cadet)] text-[var(--eggshell)]">
            <LockKeyhole className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--space-cadet)]">TikTok 数据追踪后台</h1>
            <p className="text-sm text-[var(--cadet-gray)]">请输入通行码继续访问</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--space-cadet)]">通行码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入通行码"
              className="mt-2 h-12 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 px-4 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--space-cadet)] text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)] disabled:opacity-70"
          >
            {isSubmitting ? "验证中..." : "进入后台"}
          </button>
        </form>
      </div>
    </main>
  );
}
