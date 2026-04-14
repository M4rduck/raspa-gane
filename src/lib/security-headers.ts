import type { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/**
 * Cabeceras de seguridad recomendadas. CSP equilibrada para Next.js (App Router + estilos inline de React).
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (isProd) {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");
    response.headers.set("Content-Security-Policy", csp);
  }

  if (isProd && process.env.ENABLE_HSTS === "true") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}
