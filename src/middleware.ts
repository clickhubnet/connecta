import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, verifyAuthToken } from "@/lib/jwt";
import { visualPreviewResponse } from "@/lib/visual-preview";
import { canonicalOrigin, legacyPageHosts } from "@/lib/site-config";

const publicRoutes = [
  "/login",
  "/brand",
  "/api/health",
  "/api/auth/login",
  "/api/webhooks/meta",
  "/api/cron/conversations-follow-up",
];

export async function middleware(request: NextRequest) {
  const preview = visualPreviewResponse(request);
  if (preview) return preview;
  const pathname = request.nextUrl.pathname;

  const isPage = pathname !== "/api" && !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") && !pathname.startsWith("/brand/") &&
    !/\.[^/]+$/.test(pathname);
  if (isPage && ["GET", "HEAD"].includes(request.method) && legacyPageHosts.includes(request.nextUrl.hostname)) {
    const canonicalUrl = new URL(pathname + request.nextUrl.search, canonicalOrigin);
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const requestHeaders = new Headers(request.headers);
  // Overwrite client input so metadata always reflects the actual route.
  requestHeaders.set("x-connecta-pathname", pathname);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return next();
  }

  const token = request.cookies.get(authCookieName)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sessao invalida.",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
