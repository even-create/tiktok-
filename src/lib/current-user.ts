import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "@/lib/session";

/** Resolve the signed-in user on the server (Node runtime, RSC / route handlers). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN";
}

/** For API route handlers: returns the admin user, or null when the caller is not an admin. */
export async function getAdminOrNull(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return isAdmin(user) ? user : null;
}
