import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { WorkspaceRole } from "@/lib/rbac/roles";
import type { MemberStatus } from "@/lib/rbac/roles";
import type { SessionUser } from "@/lib/workspace/types";

export const AUTH_COOKIE = "tracker_auth";

export type SessionPayload = {
  sub: string;
  wid: string;
  wname: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  status: MemberStatus;
};

function getSessionSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET?.trim() ||
      process.env.TRACKER_SESSION_TOKEN ||
      "tiktok-tracker-dev-session-secret-change-me",
  );
}

export function getTrackerPassword() {
  return process.env.TRACKER_PASSWORD ?? "zhaoeven";
}

export function getSessionToken() {
  return process.env.TRACKER_SESSION_TOKEN ?? "tiktok-tracker-session-zhaoeven";
}

/** @deprecated Legacy shared-password token check */
export function isValidAuthToken(token: string | undefined) {
  if (!token) return false;
  return token === getSessionToken();
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    wid: user.workspaceId,
    wname: user.workspaceName,
    email: user.email,
    name: user.displayName,
    role: user.role,
    status: user.status,
  } satisfies Omit<SessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const wid = typeof payload.wid === "string" ? payload.wid : null;
    const wname = typeof payload.wname === "string" ? payload.wname : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const role = typeof payload.role === "string" ? (payload.role as WorkspaceRole) : null;
    const status = typeof payload.status === "string" ? (payload.status as MemberStatus) : null;

    if (!sub || !wid || !role || !status) {
      return null;
    }

    return { sub, wid, wname, email, name, role, status };
  } catch {
    return null;
  }
}

export function sessionPayloadToUser(payload: SessionPayload): SessionUser {
  return {
    id: payload.sub,
    workspaceId: payload.wid,
    workspaceName: payload.wname,
    email: payload.email,
    displayName: payload.name,
    role: payload.role,
    status: payload.status,
  };
}

export async function getSessionFromRequest(request: NextRequest | Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  const token = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  const payload = await verifySessionToken(token);
  return payload ? sessionPayloadToUser(payload) : null;
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  return payload ? sessionPayloadToUser(payload) : null;
}

export function buildSessionCookie(token: string) {
  return {
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
