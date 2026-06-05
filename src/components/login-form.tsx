"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TabId = "admin" | "member" | "apply";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "admin", label: "管理员登录" },
  { id: "member", label: "成员登录" },
  { id: "apply", label: "申请加入" },
];

const fieldClass =
  "h-11 w-full rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-3.5 text-sm text-[var(--space-cadet)] outline-none transition focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_18%,transparent)]";

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--cadet-gray)]";

const primaryButtonClass =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--space-cadet)] text-sm font-semibold text-[var(--eggshell)] transition hover:bg-[var(--jet)] disabled:opacity-60";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("admin");

  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPassword, setApplyPassword] = useState("");
  const [applyConfirm, setApplyConfirm] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchTab(next: TabId) {
    setTab(next);
    setError("");
    setNotice("");
  }

  function goToApp() {
    router.replace(searchParams.get("from") || "/");
    router.refresh();
  }

  async function handleAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: accessCode }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "登录失败");
      goToApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "登录失败");
      goToApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: applyName,
          email: applyEmail,
          password: applyPassword,
          confirmPassword: applyConfirm,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "提交失败");
      setNotice("申请已提交，状态：Pending Approval。请等待管理员审核。");
      setApplyName("");
      setApplyEmail("");
      setApplyPassword("");
      setApplyConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--eggshell)]/30 px-4 py-10">
      <div className="w-full" style={{ maxWidth: 480 }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--space-cadet)]">
            TikTok Tracker
          </h1>
          <p className="mt-1.5 text-sm text-[var(--cadet-gray)]">登录以继续访问数据后台</p>
        </div>

        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--card)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-[var(--eggshell)]/60 p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className={`h-9 rounded-lg text-xs font-medium transition ${
                  tab === item.id
                    ? "bg-[var(--card)] text-[var(--space-cadet)] shadow-sm"
                    : "text-[var(--cadet-gray)] hover:text-[var(--space-cadet)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "admin" ? (
            <form onSubmit={handleAdmin} className="space-y-4">
              <div>
                <label className={labelClass}>通行码</label>
                <input
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="输入通行码"
                  className={fieldClass}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error ? <ErrorText message={error} /> : null}
              <button type="submit" disabled={submitting} className={primaryButtonClass}>
                {submitting ? "验证中..." : "进入管理后台"}
              </button>
            </form>
          ) : null}

          {tab === "member" ? (
            <form onSubmit={handleMember} className="space-y-4">
              <div>
                <label className={labelClass}>邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className={fieldClass}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="输入密码"
                  className={fieldClass}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error ? <ErrorText message={error} /> : null}
              <button type="submit" disabled={submitting} className={primaryButtonClass}>
                {submitting ? "登录中..." : "登录"}
              </button>
            </form>
          ) : null}

          {tab === "apply" ? (
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className={labelClass}>姓名</label>
                <input
                  type="text"
                  value={applyName}
                  onChange={(event) => setApplyName(event.target.value)}
                  placeholder="你的姓名"
                  className={fieldClass}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>公司邮箱</label>
                <input
                  type="email"
                  value={applyEmail}
                  onChange={(event) => setApplyEmail(event.target.value)}
                  placeholder="name@company.com"
                  className={fieldClass}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>密码</label>
                <input
                  type="password"
                  value={applyPassword}
                  onChange={(event) => setApplyPassword(event.target.value)}
                  placeholder="设置密码（至少 6 位）"
                  className={fieldClass}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>确认密码</label>
                <input
                  type="password"
                  value={applyConfirm}
                  onChange={(event) => setApplyConfirm(event.target.value)}
                  placeholder="再次输入密码"
                  className={fieldClass}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error ? <ErrorText message={error} /> : null}
              {notice ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {notice}
                </p>
              ) : null}
              <button type="submit" disabled={submitting} className={primaryButtonClass}>
                {submitting ? "提交中..." : "提交申请"}
              </button>
            </form>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--cadet-gray)]">登录状态保持 30 天</p>
      </div>
    </main>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
      {message}
    </p>
  );
}
