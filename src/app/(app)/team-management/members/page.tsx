"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Power, ShieldCheck, ShieldOff, Trash2, UsersRound } from "lucide-react";
import { TeamTabs } from "@/components/team/team-tabs";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: string;
  protected: boolean;
};

export default function MembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/team/members", { cache: "no-store" });
      const payload = (await response.json()) as { members?: TeamMember[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "读取成员列表失败");
      setMembers(payload.members ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取成员列表失败");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(member: TeamMember) {
    const next = member.status.toUpperCase() === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setPendingId(member.id);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "操作失败");
      setMembers((current) =>
        current.map((m) => (m.id === member.id ? { ...m, status: payload.status ?? next } : m)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleRole(member: TeamMember) {
    const nextRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const message =
      nextRole === "ADMIN"
        ? `确定将 ${member.name} 设为管理员吗？该成员将获得完整管理权限（需重新登录后生效）。`
        : `确定取消 ${member.name} 的管理员身份吗？（需重新登录后生效）`;

    if (!window.confirm(message)) return;

    setPendingId(member.id);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = (await response.json()) as { role?: TeamMember["role"]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "操作失败");
      setMembers((current) =>
        current.map((m) => (m.id === member.id ? { ...m, role: payload.role ?? nextRole } : m)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPendingId(null);
    }
  }

  async function removeMember(member: TeamMember) {
    if (!window.confirm(`确定要删除成员 ${member.name}（${member.email}）吗？`)) return;
    setPendingId(member.id);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/team/members/${member.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "删除失败");
      setMembers((current) => current.filter((m) => m.id !== member.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <UsersRound className="size-4" />
          Team Management
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--space-cadet)] sm:text-4xl">Team Members</h1>
        <p className="mt-1 text-sm text-[var(--cadet-gray)]">
          团队成员 · 管理员可将成员提升为管理员，授予完整后台权限
        </p>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] text-left text-xs uppercase tracking-wide text-[var(--cadet-gray)]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const active = member.status.toUpperCase() === "ACTIVE";
                  const busy = pendingId === member.id;
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-[color-mix(in_srgb,var(--cadet-gray)_15%,transparent)] last:border-0"
                    >
                      <td className="px-5 py-3 font-medium text-[var(--space-cadet)]">
                        <span className="inline-flex items-center gap-1.5">
                          {member.name}
                          {member.protected ? <ShieldCheck className="size-3.5 text-[var(--carolina-blue)]" /> : null}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--cadet-gray)]">{member.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            member.role === "ADMIN"
                              ? "border-[color-mix(in_srgb,var(--carolina-blue)_45%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_12%,white)] text-[var(--space-cadet)]"
                              : "border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/50 text-[var(--cadet-gray)]"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {active ? "ACTIVE" : "DISABLED"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {member.protected ? (
                            <span className="text-xs text-[var(--cadet-gray)]">受保护</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleRole(member)}
                                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium transition disabled:opacity-60 ${
                                  member.role === "ADMIN"
                                    ? "border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 text-[var(--cadet-gray)] hover:text-[var(--space-cadet)]"
                                    : "border-[color-mix(in_srgb,var(--carolina-blue)_35%,transparent)] bg-[color-mix(in_srgb,var(--carolina-blue)_10%,white)] text-[var(--space-cadet)] hover:bg-[color-mix(in_srgb,var(--carolina-blue)_16%,white)]"
                                }`}
                              >
                                {busy ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : member.role === "ADMIN" ? (
                                  <ShieldOff className="size-3.5" />
                                ) : (
                                  <ShieldCheck className="size-3.5" />
                                )}
                                {member.role === "ADMIN" ? "取消管理员" : "设为管理员"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleStatus(member)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--eggshell)]/40 px-3 text-xs font-medium text-[var(--cadet-gray)] transition hover:text-[var(--space-cadet)] disabled:opacity-60"
                              >
                                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
                                {active ? "Disable" : "Enable"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => removeMember(member)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </button>
                            </>
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
