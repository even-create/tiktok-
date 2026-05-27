"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, Clock3, RefreshCw, Search, Users } from "lucide-react";
import { AccountCard } from "@/components/accounts/account-card";
import {
  filterAccounts,
  mapApiAccount,
  sortAccountsByFollowers,
  type AccountListItem,
  type ApiAccount,
} from "@/lib/accounts";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByFollowers, setSortByFollowers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingHandle, setDeletingHandle] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const payload = (await response.json()) as { accounts?: ApiAccount[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取账号列表失败");
      }

      setAccounts((payload.accounts ?? []).map((account) => mapApiAccount(account)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取账号列表失败");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  const visibleAccounts = useMemo(() => {
    const filtered = filterAccounts(accounts, searchQuery);
    return sortAccountsByFollowers(filtered, sortByFollowers);
  }, [accounts, searchQuery, sortByFollowers]);

  async function handleDeleteAccount(handle: string) {
    const confirmed = window.confirm(`确定要停止追踪 @${handle} 吗？相关视频数据也会一并删除。`);
    if (!confirmed) return;

    setDeletingHandle(handle);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts?handle=${encodeURIComponent(handle)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除账号失败");
      }

      setAccounts((current) => current.filter((account) => account.handle !== handle));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除账号失败");
    } finally {
      setDeletingHandle(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Users className="size-4" />
              Accounts
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">账号管理</h1>
            <p className="mt-2 text-sm text-[var(--cadet-gray)]">
              查看所有追踪账号的核心指标、同步状态与播放趋势，点击进入详情页。
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cadet-gray)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索账号名或 @handle"
                className="h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 pl-10 pr-4 text-sm text-[var(--space-cadet)] outline-none transition placeholder:text-[var(--cadet-gray)] focus:border-[var(--carolina-blue)] focus:bg-[var(--card)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--carolina-blue)_25%,transparent)]"
              />
            </label>
            <button
              type="button"
              onClick={() => setSortByFollowers((current) => !current)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition duration-200 ${
                sortByFollowers
                  ? "border-[color-mix(in_srgb,var(--carolina-blue)_45%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] text-[var(--space-cadet)]"
                  : "border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--cadet-gray)] hover:border-[var(--carolina-blue)] hover:text-[var(--space-cadet)]"
              }`}
            >
              <ArrowDownWideNarrow className="size-4" />
              粉丝排序
            </button>
            <button
              type="button"
              onClick={() => void loadAccounts()}
              disabled={isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)] disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--cadet-gray)]">
          <span>
            共 <strong className="text-[var(--space-cadet)]">{accounts.length}</strong> 个账号
          </span>
          {searchQuery.trim() ? (
            <span>
              搜索结果 <strong className="text-[var(--space-cadet)]">{visibleAccounts.length}</strong> 个
            </span>
          ) : null}
          {sortByFollowers ? <span className="text-[var(--carolina-blue)]">已按粉丝数排序</span> : null}
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : visibleAccounts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isDeleting={deletingHandle === account.handle}
              onDelete={handleDeleteAccount}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--card)] px-6 py-16 text-center shadow-sm">
          <Users className="mx-auto size-10 text-[var(--cadet-gray)]" />
          <p className="mt-4 text-base font-medium text-[var(--space-cadet)]">
            {searchQuery.trim() ? "没有匹配的账号" : "暂无追踪账号"}
          </p>
          <p className="mt-2 text-sm text-[var(--cadet-gray)]">
            {searchQuery.trim()
              ? "试试其他关键词，或清空搜索条件。"
              : "请先在 Dashboard 添加 TikTok 账号，然后回到这里查看。"}
          </p>
        </section>
      )}

      {!isLoading && accounts.length > 0 ? (
        <p className="flex items-center justify-center gap-1 text-xs text-[var(--cadet-gray)]">
          <Clock3 className="size-3.5" />
          点击卡片进入账号详情页
        </p>
      ) : null}
    </div>
  );
}
