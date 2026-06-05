"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardList, Loader2, X } from "lucide-react";
import { TeamTabs } from "@/components/team/team-tabs";
import { formatBeijingTime } from "@/lib/format-beijing-time";

type Application = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  created_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/team/applications", { cache: "no-store" });
      const payload = (await response.json()) as { applications?: Application[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "读取申请列表失败");
      setApplications(payload.applications ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取申请列表失败");
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setPendingId(id);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/team/applications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "操作失败");
      setApplications((current) =>
        current.map((app) => (app.id === id ? { ...app, status: payload.status ?? app.status } : app)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <ClipboardList className="size-4" />
          Team Management
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">Pending Applications</h1>
        <p className="mt-1 text-sm text-[var(--cadet-gray)]">待审核申请</p>
        <div className="mt-4">
          <TeamTabs />
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </header>

      <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] shadow-sm">
        {isLoading ? (
          <div className="grid place-items-center py-16 text-[var(--cadet-gray)]">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <ClipboardList className="size-10 text-[var(--cadet-gray)]" />
            <p className="mt-3 text-sm font-medium text-[var(--space-cadet)]">暂无申请</p>
            <p className="mt-1 text-sm text-[var(--cadet-gray)]">新的加入申请会显示在这里。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] text-left text-xs uppercase tracking-wide text-[var(--cadet-gray)]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Apply Time</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const status = (app.status || "PENDING").toUpperCase();
                  const isPending = status === "PENDING";
                  const busy = pendingId === app.id;
                  return (
                    <tr
                      key={app.id}
                      className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_15%,transparent)] last:border-0"
                    >
                      <td className="px-5 py-3 font-medium text-[var(--space-cadet)]">{app.name || "—"}</td>
                      <td className="px-5 py-3 text-[var(--cadet-gray)]">{app.email}</td>
                      <td className="px-5 py-3 text-[var(--cadet-gray)]">
                        {formatBeijingTime(app.created_at, "—")}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[status] ?? STATUS_STYLES.PENDING
                          }`}
                        >
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAction(app.id, "approve")}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                              >
                                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAction(app.id, "reject")}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                <X className="size-3.5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-[var(--cadet-gray)]">已处理</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
