/**
 * Stateless, signed session used by both the Edge middleware and Node API routes.
 * Uses only Web Crypto / Web base64 APIs so it runs in every runtime.
 */

export type UserRole = "ADMIN" | "MEMBER";

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
};

/** The single fixed administrator (system owner). */
export const ADMIN_USER: SessionUser = {
  id: "admin",
  name: "Even",
  role: "ADMIN",
};

export const SESSION_COOKIE = "tracker_auth";
/** 30 days (in seconds). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSessionSecret() {
  return (
    process.env.TRACKER_SESSION_SECRET?.trim() ||
    process.env.TRACKER_SESSION_TOKEN?.trim() ||
    "tiktok-tracker-session-zhaoeven"
  );
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToBytes(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSign(data: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signSession(user: SessionUser) {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(user)));
  const signature = await hmacSign(payload);
  return `${payload}.${signature}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = await hmacSign(payload);
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(base64UrlDecodeToBytes(payload));
    const user = JSON.parse(json) as SessionUser;
    if (!user || typeof user.id !== "string" || (user.role !== "ADMIN" && user.role !== "MEMBER")) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

/** SHA-256 hex hash, used for member passwords (member management ships in a later phase). */
export async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
