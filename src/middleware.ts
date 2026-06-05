import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, isValidAuthToken, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/video-cover") ||
    pathname.startsWith("/api/version") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (session?.status === "ACTIVE") {
    const isTeamRoute =
      pathname.startsWith("/team") || pathname.startsWith("/api/team");
    const isTeamAdmin = session.role === "ADMIN" || session.role === "OWNER";

    if (isTeamRoute && !isTeamAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "无权执行此操作" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (isValidAuthToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
