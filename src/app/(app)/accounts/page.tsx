"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Users } from "lucide-react";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountsFilterBar, type AccountSortMode } from "@/components/accounts/accounts-filter-bar";
import { AddAccountForm } from "@/components/accounts/add-account-form";
import type { PlatformFilterValue } from "@/components/accounts/platform-filter-select";
import {
  filterAccounts,
  getAvailablePlatforms,
  mapApiAccount,
  sortAccounts,
  type AccountListItem,
  type ApiAccount,
} from "@/lib/accounts";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilterValue>("all");
  const [sortMode, setSortMode] = useState<AccountSortMode>("latest");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const availablePlatforms = useMemo(() => getAvailablePlatforms(accounts), [accounts]);

  useEffect(() => {
    if (platformFilter !== "all" && !availablePlatforms.includes(platformFilter)) {
      setPlatformFilter("all");
    }
  }, [availablePlatforms, platformFilter]);

  const visibleAccounts = useMemo(() => {
    let filtered = filterAccounts(accounts, searchQuery);
    if (platformFilter !== "all") {
      filtered = filtered.filter((account) => account.platform === platformFilter);
    }
    return sortAccounts(filtered, sortMode);
  }, [accounts, searchQuery, platformFilter, sortMode]);

  async function handleDeleteAccount(id: string) {
    const target = accounts.find((account) => account.id === id);
    const confirmed = window.confirm(
      `确定要停止追踪 @${target?.handle ?? ""} 吗？相关视频数据也会一并删除。`,
    );
    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除账号失败");
      }

      setAccounts((current) => current.filter((account) => account.id !== id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除账号失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
              <Users className="size-4" />
              Accounts
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">账号管理</h1>
          </div>

          <AddAccountForm
            className="w-full shrink-0 lg:w-auto lg:min-w-[28rem] xl:min-w-[32rem]"
            disabled={isLoading || deletingId !== null}
            onError={(message) => {
              setSuccessMessage(null);
              setErrorMessage(message);
            }}
            onAdded={(handle, videosCount) => {
              setErrorMessage("");
              setSuccessMessage(
                handle
                  ? `账号 @${handle} 已添加并同步，共 ${videosCount ?? 0} 条视频。`
                  : `账号已添加并同步，共 ${videosCount ?? 0} 条视频。`,
              );
              void loadAccounts();
            }}
          />
        </div>

        <AccountsFilterBar
          availablePlatforms={availablePlatforms}
          platform={platformFilter}
          onPlatformChange={setPlatformFilter}
          sort={sortMode}
          onSortChange={setSortMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--cadet-gray)]">
          <span>
            共 <strong className="text-[var(--space-cadet)]">{accounts.length}</strong> 个账号
          </span>
          {searchQuery.trim() || platformFilter !== "all" ? (
            <span>
              筛选结果 <strong className="text-[var(--space-cadet)]">{visibleAccounts.length}</strong> 个
            </span>
          ) : null}
        </div>

        {successMessage ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        ) : null}

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
              isDeleting={deletingId === account.id}
              onDelete={handleDeleteAccount}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cadet-gray)_35%,transparent)] bg-[var(--card)] px-6 py-16 text-center shadow-sm">
          <Users className="mx-auto size-10 text-[var(--cadet-gray)]" />
          <p className="mt-4 text-base font-medium text-[var(--space-cadet)]">
            {searchQuery.trim() || platformFilter !== "all" ? "没有匹配的账号" : "暂无追踪账号"}
          </p>
          <p className="mt-2 text-sm text-[var(--cadet-gray)]">
            {searchQuery.trim() || platformFilter !== "all"
              ? "试试其他关键词或筛选条件。"
              : "请在右上角粘贴 抖音 / 小红书 / Instagram / TikTok 链接并添加账号。"}
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
