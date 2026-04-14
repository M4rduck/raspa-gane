/** nanoid(18) y variantes: alfanumérico + _ - */
const PUBLIC_TOKEN_RE = /^[A-Za-z0-9_-]{12,32}$/;

export function isValidPublicToken(token: string): boolean {
  if (!token || token.length > 32) return false;
  return PUBLIC_TOKEN_RE.test(token);
}

/** Slug de campaña (solo minúsculas, números y guiones). */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCampaignSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 80 && SLUG_RE.test(slug);
}

/** Elimina saltos de línea / control que podrían usarse en cabeceras (SMTP, logs). */
export function stripControlChars(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isReasonableEmail(email: string): boolean {
  if (email.length > 254) return false;
  return EMAIL_RE.test(email);
}

export const LIMITS = {
  fullName: 120,
  phone: 40,
  email: 254,
  documentId: 64,
  externalRef: 200,
  masterKeyHeader: 256,
  bearerToken: 200,
  jsonBodyCampaigns: 48_000,
  jsonBodyRegister: 12_000,
  jsonBodyLinks: 8_000,
  jsonBodyAdminPatch: 16_000,
  campaignName: 120,
  prizeLabel: 200,
} as const;

/**
 * Lee el cuerpo con tope de bytes (mitiga JSON grandes / DoS).
 * Consume el body del Request; no llamar request.json() después.
 */
export async function readJsonBodyLimited<T>(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const cl = request.headers.get("content-length");
  if (cl) {
    const n = Number.parseInt(cl, 10);
    if (Number.isFinite(n) && n > maxBytes) {
      return { ok: false, status: 413, message: "Cuerpo demasiado grande" };
    }
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, message: "No se pudo leer el cuerpo" };
  }
  if (text.length > maxBytes) {
    return { ok: false, status: 413, message: "Cuerpo demasiado grande" };
  }
  if (!text.trim()) {
    return { ok: true, data: {} as T };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400, message: "JSON inválido" };
  }
}
