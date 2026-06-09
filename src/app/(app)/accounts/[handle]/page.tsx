"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  CirclePlay,
  Clock3,
  ExternalLink,
  Eye,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { AccountGrowthMetric } from "@/lib/growth-overview";
import { AccountAvatar } from "@/components/account-avatar";
import { VideoDetailModal } from "@/components/dashboard/video-detail-modal";
import { VideoFeedCard, VideoFeedSkeleton } from "@/components/dashboard/video-feed-card";
import { mapApiAccount, type ApiAccount } from "@/lib/accounts";
import { flattenVideosFromAccounts } from "@/lib/content-analytics";
import { enrichVideosWithQuality, type ContentVideoWithQuality } from "@/lib/content-quality";

export default function AccountDetailPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const handle = decodeURIComponent(params.handle ?? "");

  const [apiAccount, setApiAccount] = useState<ApiAccount | null>(null);
  const [growthMetrics, setGrowthMetrics] = useState<AccountGrowthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentVideoWithQuality | null>(null);

  const loadAccount = useCallback(async () => {
    if (!handle) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(handle)}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        account?: ApiAccount;
        growthMetrics?: AccountGrowthMetric[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取账号详情失败");
      }

      if (!payload.account) {
        throw new Error("账号不存在");
      }

      setApiAccount(payload.account);
      setGrowthMetrics(payload.growthMetrics ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取账号详情失败");
      setApiAccount(null);
      setGrowthMetrics([]);
    } finally {
      setIsLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccount();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccount]);

  const account = useMemo(() => (apiAccount ? mapApiAccount(apiAccount) : null), [apiAccount]);
  const videoCards = useMemo(
    () => (apiAccount ? enrichVideosWithQuality(flattenVideosFromAccounts([apiAccount])) : []),
    [apiAccount],
  );

  async function handleDeleteAccount() {
    if (!account) return;

    const confirmed = window.confirm(`确定要停止追踪 @${account.handle} 吗？相关视频数据也会一并删除。`);
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts?handle=${encodeURIComponent(account.handle)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除账号失败");
      }

      router.push("/accounts");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除账号失败");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`total-${index}`}
              className="h-24 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`growth-${index}`}
              className="h-24 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
        <VideoFeedSkeleton />
      </div>
    );
  }

  if (!account) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <p className="text-sm text-rose-700">{errorMessage || "未找到该账号"}</p>
        <Link
          href="/accounts"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--space-cadet)] px-4 py-2 text-sm font-medium text-[var(--eggshell)] transition hover:bg-[var(--jet)]"
        >
          <ArrowLeft className="size-4" />
          返回账号列表
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/accounts"
              className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-[var(--cadet-gray)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
              aria-label="返回账号列表"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <AccountAvatar
              name={account.displayName}
              avatarUrl={account.avatarUrl}
              initialsText={account.initials}
              className="size-14"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
                Account Detail
              </p>
              <h1 className="mt-2 truncate text-3xl font-semibold text-[var(--space-cadet)]">{account.displayName}</h1>
              <p className="mt-1 text-sm text-[var(--cadet-gray)]">@{account.handle}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--cadet-gray)]">
                <Clock3 className="size-3.5" />
                上次同步：{account.lastSyncedLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--space-cadet)] transition hover:border-[var(--carolina-blue)] hover:text-[var(--carolina-blue)]"
            >
              <ExternalLink className="size-4" />
              TikTok 主页
            </a>
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={isDeleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              {isDeleting ? <Clock3 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              删除账号
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "粉丝数", value: account.followersLabel, icon: Users },
          { label: "总点赞", value: account.likesLabel, icon: ThumbsUp },
          { label: "总播放", value: account.viewsLabel, icon: Eye },
          { label: "互动率", value: account.engagementLabel, icon: TrendingUp },
        ].map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--cadet-gray)]">{metric.label}</p>
              <metric.icon className="size-5 text-[var(--space-cadet)]" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[var(--space-cadet)]">{metric.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          growthMetrics.length
            ? growthMetrics
            : [
                { key: "followers", label: "新增粉丝", value: "N/A" },
                { key: "views", label: "新增播放", value: "N/A" },
                { key: "likes", label: "新增点赞", value: "N/A" },
                { key: "collects", label: "新增收藏", value: "N/A" },
              ]
        ).map((metric) => {
          const growthIcons = {
            followers: UserPlus,
            views: Eye,
            likes: ThumbsUp,
            collects: Bookmark,
          } as const;
          const Icon = growthIcons[metric.key as keyof typeof growthIcons] ?? TrendingUp;
          const valueClassName =
            metric.value === "N/A"
              ? "text-[var(--cadet-gray)]"
              : metric.value.startsWith("+")
                ? "text-[var(--space-cadet)]"
                : metric.value.startsWith("-")
                  ? "text-rose-600"
                  : "text-[var(--space-cadet)]";

          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-4 shadow-sm transition duration-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--cadet-gray)]">{metric.label}</p>
                <Icon className="size-5 text-[var(--space-cadet)]" />
              </div>
              <p className={`mt-3 text-3xl font-semibold ${valueClassName}`}>{metric.value}</p>
            </article>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
          <h2 className="text-base font-semibold">视频数据</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{videoCards.length} 条</span>
        </div>

        <div className="p-4 sm:p-5">
          {videoCards.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videoCards.map((video) => (
                <VideoFeedCard key={video.id} video={video} onSelect={setSelectedVideo} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <CirclePlay className="size-10 text-[var(--cadet-gray)]" />
              <p className="mt-3 text-sm font-medium text-[var(--space-cadet)]">暂无视频数据</p>
              <p className="mt-1 text-sm text-[var(--cadet-gray)]">请先在 Sync Center 同步该账号。</p>
            </div>
          )}
        </div>
      </section>

      <VideoDetailModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}
