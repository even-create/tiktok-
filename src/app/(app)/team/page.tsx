"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Shield, Users } from "lucide-react";
import type { WorkspaceUserPublic } from "@/lib/workspace/types";

export default function TeamPage() {
  const [members, setMembers] = useState<WorkspaceUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const pendingMembers = useMemo(
    () => members.filter((member) => member.status === "PENDING"),
    [members],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/team/members");
      const payload = (await response.json()) as {
        members?: WorkspaceUserPublic[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取成员失败");
      }

      setMembers(payload.members ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function updateMember(memberId: string, body: Record<string, string>) {
    setActionId(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "操作失败");
      }
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--cadet-gray)]">
        <LoaderCircle className="mr-2 size-5 animate-spin" />
        加载团队数据…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--carolina-blue)]">
          <Users className="size-4" />
          Team Management
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--space-cadet)]">团队管理</h1>
        <p className="mt-2 text-sm text-[var(--cadet-gray)]">
          审核成员申请、管理角色。成员可在 Accounts 页面自行添加自己运营的 TikTok 账号。
        </p>
      </header>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--space-cadet)]">
          <Shield className="size-5" />
          待审核成员 ({pendingMembers.length})
        </h2>
        <div className="mt-4 space-y-3">
          {pendingMembers.length === 0 ? (
            <p className="text-sm text-[var(--cadet-gray)]">暂无待审核申请。</p>
          ) : (
            pendingMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--cadet-gray)_20%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--space-cadet)]">{member.display_name}</p>
                  <p className="text-sm text-[var(--cadet-gray)]">{member.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionId === member.id}
                    onClick={() => void updateMember(member.id, { action: "approve" })}
                    className="rounded-lg bg-[var(--space-cadet)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    批准
                  </button>
                  <button
                    type="button"
                    disabled={actionId === member.id}
                    onClick={() => void updateMember(member.id, { action: "reject" })}
                    className="rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] px-3 py-1.5 text-xs text-[var(--space-cadet)] disabled:opacity-60"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--space-cadet)]">成员列表</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-[var(--cadet-gray)]">
              <tr>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">邮箱</th>
                <th className="px-3 py-2">角色</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-[color-mix(in_srgb,var(--cadet-gray)_15%,transparent)]">
                  <td className="px-3 py-3 font-medium">{member.display_name}</td>
                  <td className="px-3 py-3 text-[var(--cadet-gray)]">{member.email}</td>
                  <td className="px-3 py-3">
                    <select
                      value={member.role}
                      disabled={actionId === member.id}
                      onChange={(event) => void updateMember(member.id, { role: event.target.value })}
                      className="rounded-lg border border-[color-mix(in_srgb,var(--cadet-gray)_25%,transparent)] bg-[var(--eggshell)]/40 px-2 py-1 text-xs"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">{member.status}</td>
                  <td className="px-3 py-3">
                    {member.status === "ACTIVE" ? (
                      <button
                        type="button"
                        disabled={actionId === member.id}
                        onClick={() => void updateMember(member.id, { action: "disable" })}
                        className="text-xs text-rose-600 hover:underline disabled:opacity-60"
                      >
                        停用
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
