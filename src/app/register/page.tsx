"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "注册失败");
      }

      setMessage(payload.message ?? "申请已提交，等待管理员审核");
      setDisplayName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "注册失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--card)] p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-[var(--space-cadet)] text-[var(--eggshell)]">
            <UserPlus className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--space-cadet)]">申请加入团队</h1>
            <p className="text-sm text-[var(--cadet-gray)]">提交后由管理员审核，通过即可登录</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--space-cadet)]">姓名</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例如：Tom"
              className="mt-2 h-12 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 px-4 text-sm outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--space-cadet)]">公司邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tom@company.com"
              className="mt-2 h-12 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 px-4 text-sm outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--space-cadet)]">密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位"
              className="mt-2 h-12 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--eggshell)]/40 px-4 text-sm outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              minLength={8}
              required
            />
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--space-cadet)] text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)] disabled:opacity-70"
          >
            {isSubmitting ? "提交中..." : "提交申请"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--cadet-gray)]">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-[var(--carolina-blue)] hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </main>
  );
}
