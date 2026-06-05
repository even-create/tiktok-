"use client";

import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accessCode, setAccessCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  function goToApp() {
    router.replace(searchParams.get("from") || "/");
    router.refresh();
  }

  async function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminSubmitting(true);
    setAdminError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: accessCode }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败");
      }
      goToApp();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "登录失败");
    } finally {
      setAdminSubmitting(false);
    }
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberSubmitting(true);
    setMemberError("");

    try {
      const response = await fetch("/api/auth/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败");
      }
      goToApp();
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "登录失败");
    } finally {
      setMemberSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--space-cadet)]">TikTok Tracker</h1>
          <p className="mt-1 text-sm text-[var(--cadet-gray)]">登录以继续访问数据后台</p>
        </div>

        {/* 管理员登录 */}
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-6 shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--carolina-blue)]" />
            <h2 className="text-sm font-semibold text-[var(--space-cadet)]">管理员登录</h2>
          </div>

          <form onSubmit={handleAdminSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-[var(--cadet-gray)]">通行码</span>
              <div className="relative mt-1.5">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
                <input
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="输入通行码"
                  className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 pl-9 pr-4 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            {adminError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {adminError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={adminSubmitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--space-cadet)] text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)] disabled:opacity-70"
            >
              {adminSubmitting ? "验证中..." : "进入管理后台"}
            </button>
          </form>
        </section>

        <div className="my-5 flex items-center gap-3 text-xs text-[var(--cadet-gray)]">
          <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]" />
          或
          <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]" />
        </div>

        {/* 团队成员登录 */}
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-6 shadow-lg">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-[var(--carolina-blue)]" />
            <h2 className="text-sm font-semibold text-[var(--space-cadet)]">团队成员登录</h2>
          </div>

          <form onSubmit={handleMemberSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-[var(--cadet-gray)]">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 px-4 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[var(--cadet-gray)]">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="输入密码"
                className="mt-1.5 h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 px-4 text-sm text-[var(--space-cadet)] outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
                autoComplete="current-password"
                required
              />
            </label>

            {memberError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {memberError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={memberSubmitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--space-cadet)] text-sm font-semibold text-[var(--space-cadet)] transition hover:bg-[var(--eggshell)]/70 disabled:opacity-70"
            >
              {memberSubmitting ? "登录中..." : "登录"}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-[var(--cadet-gray)]">登录状态保持 30 天</p>
      </div>
    </main>
  );
}
