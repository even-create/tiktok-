import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/video-cover") ||
    pathname.startsWith("/api/version") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await verifySession(token);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only areas: members are blocked from both the pages and their dedicated APIs.
  const adminOnlyPages = ["/settings", "/sync-center", "/ai-anime", "/team-management"];
  const adminOnlyApis = ["/api/settings", "/api/sync-center", "/api/anime", "/api/team"];

  if (user.role !== "ADMIN") {
    if (adminOnlyApis.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    if (adminOnlyPages.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
