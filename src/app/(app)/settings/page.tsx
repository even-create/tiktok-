"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BrainCircuit,
  Clock3,
  KeyRound,
  Loader2,
  Moon,
  Palette,
  Save,
  Settings,
  Sun,
} from "lucide-react";
import { useAppSettings } from "@/components/settings/theme-provider";
import type { AppSettingsPublic, ThemeMode } from "@/lib/app-settings";

type FormState = {
  tikhubApiKey: string;
  clearTikHubApiKey: boolean;
  geminiApiKey: string;
  clearGeminiApiKey: boolean;
  syncIntervalMinutes: number;
  theme: ThemeMode;
  notifications: {
    syncSuccess: boolean;
    syncError: boolean;
    weeklyDigest: boolean;
  };
};

const syncIntervalPresets = [
  { label: "15 分钟", value: 15 },
  { label: "1 小时", value: 60 },
  { label: "6 小时", value: 360 },
  { label: "12 小时", value: 720 },
  { label: "24 小时", value: 1440 },
];

function settingsToForm(settings: AppSettingsPublic): FormState {
  return {
    tikhubApiKey: "",
    clearTikHubApiKey: false,
    geminiApiKey: "",
    clearGeminiApiKey: false,
    syncIntervalMinutes: settings.syncIntervalMinutes,
    theme: settings.theme,
    notifications: { ...settings.notifications },
  };
}

export default function SettingsPage() {
  const { settings, isLoading, loadError, applyTheme, refreshSettings } = useAppSettings();
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoading && settings && !form) {
      setForm(settingsToForm(settings));
    }
  }, [settings, form, isLoading]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setIsSaving(true);
    setErrorMessage("");
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tikhubApiKey: form.tikhubApiKey.trim() || undefined,
          clearTikHubApiKey: form.clearTikHubApiKey,
          geminiApiKey: form.geminiApiKey.trim() || undefined,
          clearGeminiApiKey: form.clearGeminiApiKey,
          syncIntervalMinutes: form.syncIntervalMinutes,
          theme: form.theme,
          notifications: form.notifications,
        }),
      });

      const payload = (await response.json()) as {
        settings?: AppSettingsPublic;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "保存失败");
      }

      applyTheme(form.theme);
      await refreshSettings();

      if (payload.settings) {
        setForm(settingsToForm(payload.settings));
      }

      setMessage(payload.message ?? "设置已保存到 Supabase");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  const darkMode = form?.theme === "dark";

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Settings className="size-4" />
              Settings
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">系统设置</h1>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              管理 TikHub API Key、同步间隔、主题与通知偏好，配置保存在 Supabase。
            </p>
          </div>
          <button
            type="submit"
            form="settings-form"
            disabled={isSaving || isLoading || !form}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--space-cadet)] px-5 text-sm font-semibold text-[var(--eggshell)] transition hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </header>

      {isLoading || !form ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : (
        <form id="settings-form" onSubmit={(event) => void handleSave(event)} className="space-y-5">
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
          {loadError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              设置读取异常：{loadError}。若保存 TikHub Key 失败，请在 Supabase 执行迁移{" "}
              <code className="text-xs">20260529120000_app_settings_tikhub_key.sql</code>。
            </p>
          ) : null}

          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <KeyRound className="size-4 text-[var(--carolina-blue)]" />
              TikHub API Key
            </div>
            <p className="mt-1 text-xs text-[var(--cadet-gray)]">
              用于 TikTok 数据同步。已在 Vercel 配置 TIKHUB_API_KEY 时，此处应显示「已配置 · 来源 environment」。
              也可在此保存到 Supabase（优先于环境变量）。
            </p>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-[var(--cadet-gray)]">
                当前状态：
                {settings?.tikhubApiKeyConfigured ? (
                  <span className="ml-1 font-medium text-[var(--foreground)]">
                    已配置 ({settings.tikhubApiKeyMasked}) · 来源 {settings.tikhubApiKeySource}
                  </span>
                ) : (
                  <span className="ml-1 font-medium text-rose-600">未配置</span>
                )}
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--cadet-gray)]">新 API Key（可选）</span>
                <input
                  type="password"
                  value={form.tikhubApiKey}
                  onChange={(event) => setForm({ ...form, tikhubApiKey: event.target.value })}
                  placeholder="输入新的 TikHub API Key"
                  className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--cadet-gray)]">
                <input
                  type="checkbox"
                  checked={form.clearTikHubApiKey}
                  onChange={(event) => setForm({ ...form, clearTikHubApiKey: event.target.checked })}
                  className="size-4 rounded accent-[var(--space-cadet)]"
                />
                清除 Supabase 中保存的 Key（回退到环境变量）
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <BrainCircuit className="size-4 text-[var(--carolina-blue)]" />
              Gemini API Key
            </div>
            <p className="mt-1 text-xs text-[var(--cadet-gray)]">
              用于 AI Insights 分析。优先使用 Supabase 保存的 Key，环境变量 GEMINI_API_KEY 作为后备。
            </p>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-[var(--cadet-gray)]">
                当前状态：
                {settings?.geminiApiKeyConfigured ? (
                  <span className="ml-1 font-medium text-[var(--foreground)]">
                    已配置 ({settings.geminiApiKeyMasked}) · 来源 {settings.geminiApiKeySource}
                  </span>
                ) : (
                  <span className="ml-1 font-medium text-rose-600">未配置</span>
                )}
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--cadet-gray)]">新 API Key（可选）</span>
                <input
                  type="password"
                  value={form.geminiApiKey}
                  onChange={(event) => setForm({ ...form, geminiApiKey: event.target.value })}
                  placeholder="输入 Gemini API Key"
                  className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--carolina-blue)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--cadet-gray)]">
                <input
                  type="checkbox"
                  checked={form.clearGeminiApiKey}
                  onChange={(event) => setForm({ ...form, clearGeminiApiKey: event.target.checked })}
                  className="size-4 rounded accent-[var(--space-cadet)]"
                />
                清除 Supabase 中保存的 Key（回退到环境变量）
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Clock3 className="size-4 text-[var(--carolina-blue)]" />
              Sync Interval
            </div>
            <p className="mt-1 text-xs text-[var(--cadet-gray)]">同步缓存窗口：此时间内重复同步将跳过 TikHub 调用。</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {syncIntervalPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setForm({ ...form, syncIntervalMinutes: preset.value })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    form.syncIntervalMinutes === preset.value
                      ? "bg-[var(--space-cadet)] text-[var(--eggshell)]"
                      : "border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/30 text-[var(--cadet-gray)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-[var(--cadet-gray)]">自定义间隔（分钟）</span>
              <input
                type="number"
                min={15}
                max={10080}
                value={form.syncIntervalMinutes}
                onChange={(event) =>
                  setForm({ ...form, syncIntervalMinutes: Number(event.target.value) || 360 })
                }
                className="h-11 w-full max-w-xs rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--carolina-blue)]"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Palette className="size-4 text-[var(--carolina-blue)]" />
              Theme & Dark Mode
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, theme: "light" });
                  applyTheme("light");
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition ${
                  form.theme === "light"
                    ? "border-[var(--carolina-blue)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] text-[var(--foreground)]"
                    : "border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] text-[var(--cadet-gray)]"
                }`}
              >
                <Sun className="size-4" />
                Light
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, theme: "dark" });
                  applyTheme("dark");
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition ${
                  form.theme === "dark"
                    ? "border-[var(--carolina-blue)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] text-[var(--foreground)]"
                    : "border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] text-[var(--cadet-gray)]"
                }`}
              >
                <Moon className="size-4" />
                Dark
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm text-[var(--cadet-gray)]">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(event) => {
                    const theme: ThemeMode = event.target.checked ? "dark" : "light";
                    setForm({ ...form, theme });
                    applyTheme(theme);
                  }}
                  className="size-4 rounded accent-[var(--space-cadet)]"
                />
                Dark mode
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Bell className="size-4 text-[var(--carolina-blue)]" />
              Notification Settings
            </div>
            <p className="mt-1 text-xs text-[var(--cadet-gray)]">控制同步成功/失败等场景的提示偏好（已持久化）。</p>

            <div className="mt-4 space-y-3">
              {[
                { key: "syncSuccess" as const, label: "同步成功通知" },
                { key: "syncError" as const, label: "同步失败通知" },
                { key: "weeklyDigest" as const, label: "每周数据摘要（预留）" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_22%,transparent)] bg-[var(--eggshell)]/25 px-4 py-3"
                >
                  <span className="text-sm text-[var(--foreground)]">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={form.notifications[item.key]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notifications: {
                          ...form.notifications,
                          [item.key]: event.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded accent-[var(--space-cadet)]"
                  />
                </label>
              ))}
            </div>
          </section>

          {settings?.updatedAt ? (
            <p className="text-center text-xs text-[var(--cadet-gray)]">
              上次保存：{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(settings.updatedAt),
              )}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
