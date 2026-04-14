import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { applySecurityHeaders } from "@/lib/security-headers";

function apiRateLimitKey(request: NextRequest, suffix: string): string {
  const ip = clientIpFromRequest(request);
  return `${ip}:${suffix}`;
}

function limitsForPath(pathname: string): { limit: number; windowMs: number; suffix: string } {
  if (pathname.includes("/api/v1/links")) {
    return { limit: 120, windowMs: 60_000, suffix: "links" };
  }
  if (pathname.includes("/api/v1/reports/")) {
    return { limit: 30, windowMs: 60_000, suffix: "reports" };
  }
  if (pathname.includes("/api/v1/campaigns")) {
    return { limit: 60, windowMs: 60_000, suffix: "admin" };
  }
  if (pathname.includes("/register")) {
    return { limit: 25, windowMs: 60_000, suffix: "register" };
  }
  if (pathname.includes("/scratch")) {
    return { limit: 45, windowMs: 60_000, suffix: "scratch" };
  }
  if (pathname.startsWith("/api/tokens/")) {
    return { limit: 90, windowMs: 60_000, suffix: "tokens" };
  }
  if (pathname.startsWith("/api/")) {
    return { limit: 100, windowMs: 60_000, suffix: "api" };
  }
  return { limit: 300, windowMs: 60_000, suffix: "default" };
}

export function middleware(request: NextRequest) {
  const res = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const { limit, windowMs, suffix } = limitsForPath(request.nextUrl.pathname);
    const rl = checkRateLimit(apiRateLimitKey(request, suffix), limit, windowMs);
    if (!rl.ok) {
      const blocked = NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." },
        { status: 429 },
      );
      blocked.headers.set("Retry-After", String(rl.retryAfterSec));
      return applySecurityHeaders(blocked);
    }
  }

  return applySecurityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|ico|png|jpg|jpeg|gif|webp|woff2?)).*)",
  ],
};
