"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CirclePlay,
  Clock3,
  ExternalLink,
  Eye,
  MessageCircle,
  Share2,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { LineChart } from "@/components/dashboard/line-chart";
import { buildViewsTrendPoints, formatCompact, mapApiAccount, type ApiAccount } from "@/lib/accounts";

function formatPostedAt(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calcInteractionRate(likes: number, comments: number, shares: number, views: number) {
  if (views <= 0) return "0%";
  return `${(((likes + comments + shares) / views) * 100).toFixed(2)}%`;
}

export default function AccountDetailPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const handle = decodeURIComponent(params.handle ?? "");

  const [account, setAccount] = useState<ReturnType<typeof mapApiAccount> | null>(null);
  const [videos, setVideos] = useState<NonNullable<ApiAccount["videos"]>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!handle) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(handle)}`, { cache: "no-store" });
      const payload = (await response.json()) as { account?: ApiAccount; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取账号详情失败");
      }

      if (!payload.account) {
        throw new Error("账号不存在");
      }

      setAccount(mapApiAccount(payload.account));
      setVideos(payload.account.videos ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取账号详情失败");
      setAccount(null);
      setVideos([]);
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

  const chartPoints = useMemo(() => buildViewsTrendPoints(videos), [videos]);

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
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--card)]"
            />
          ))}
        </div>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-gradient-to-r from-[var(--space-cadet)] via-[var(--jet)] to-[var(--space-cadet)] p-4 text-[var(--eggshell)]">
            <h2 className="text-base font-semibold">视频数据</h2>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{videos.length} 条</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-xs uppercase tracking-[0.16em] text-[var(--cadet-gray)]">
                  <th className="px-4 py-3 font-medium">Video</th>
                  <th className="px-4 py-3 font-medium">Views</th>
                  <th className="px-4 py-3 font-medium">Likes</th>
                  <th className="px-4 py-3 font-medium">Comments</th>
                  <th className="px-4 py-3 font-medium">Shares</th>
                  <th className="px-4 py-3 font-medium">互动率</th>
                  <th className="px-4 py-3 font-medium">Posted</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => {
                  const views = video.views_count ?? 0;
                  const likes = video.likes_count ?? 0;
                  const comments = video.comments_count ?? 0;
                  const shares = video.shares_count ?? 0;

                  return (
                    <tr
                      key={video.id}
                      className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_18%,transparent)] transition duration-200 last:border-0 hover:bg-[var(--eggshell)]/50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {video.video_url ? (
                            <a
                              href={video.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="grid size-10 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] text-[var(--carolina-blue)] shadow-sm transition hover:border-[var(--carolina-blue)]"
                            >
                              <CirclePlay className="size-5" />
                            </a>
                          ) : (
                            <div className="grid size-10 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/60 text-[var(--cadet-gray)]">
                              <CirclePlay className="size-5" />
                            </div>
                          )}
                          <p className="max-w-sm truncate text-sm font-medium text-[var(--space-cadet)]">
                            {video.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--jet)]">{formatCompact(views)}</td>
                      <td className="px-4 py-4 text-sm text-[var(--jet)]">{formatCompact(likes)}</td>
                      <td className="px-4 py-4 text-sm text-[var(--jet)]">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3.5 text-[var(--cadet-gray)]" />
                          {formatCompact(comments)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--jet)]">
                        <span className="inline-flex items-center gap-1">
                          <Share2 className="size-3.5 text-[var(--cadet-gray)]" />
                          {formatCompact(shares)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--carolina-blue)_15%,white)] px-2.5 py-1 text-sm font-medium text-[var(--space-cadet)]">
                          {calcInteractionRate(likes, comments, shares, views)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--cadet-gray)]">{formatPostedAt(video.posted_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!videos.length ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--cadet-gray)]">暂无视频数据，请先在 Sync Center 同步。</p>
            ) : null}
          </div>
        </section>

        <LineChart
          title="播放量趋势"
          subtitle="按发布时间展示最近视频播放走势"
          points={chartPoints}
          className="h-full min-h-[320px]"
        />
      </div>
    </div>
  );
}
