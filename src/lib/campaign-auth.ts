import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { hashApiKeyForLookup } from "./api-key-lookup";
import { LIMITS } from "./security-input";
import { prisma } from "./prisma";

export function bearerApiKey(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw || raw.length > LIMITS.bearerToken) return null;
  return raw;
}

const campaignSelect = {
  id: true,
  apiKeyHash: true,
  name: true,
  slug: true,
  winEvery: true,
  active: true,
} as const;

/** Campañas sin apiKeyLookup (creadas antes del índice): escaneo + bcrypt. */
async function findCampaignByApiKeyLegacy(apiKey: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { active: true, apiKeyLookup: null },
    select: { ...campaignSelect },
  });
  for (const c of campaigns) {
    const ok = await bcrypt.compare(apiKey, c.apiKeyHash);
    if (ok) return c;
  }
  return null;
}

export async function findCampaignByApiKey(apiKey: string) {
  if (!apiKey || apiKey.length > LIMITS.bearerToken) return null;
  const lookup = hashApiKeyForLookup(apiKey);
  const hit = await prisma.campaign.findUnique({
    where: { apiKeyLookup: lookup },
    select: { ...campaignSelect },
  });
  if (hit?.active) {
    const ok = await bcrypt.compare(apiKey, hit.apiKeyHash);
    if (ok) {
      const { active: _a, ...rest } = hit;
      return rest;
    }
    return null;
  }
  return findCampaignByApiKeyLegacy(apiKey);
}

/**
 * Comparación resistente a timing attacks (hash SHA-256 + timingSafeEqual).
 * Limita longitud del header para mitigar DoS por cuerpos enormes.
 */
export function assertMasterKey(headerKey: string | null): boolean {
  const expected = process.env.MASTER_ADMIN_KEY;
  if (!expected || headerKey === null || headerKey === undefined) return false;
  if (headerKey.length > LIMITS.masterKeyHeader) return false;
  try {
    const a = createHash("sha256").update(headerKey, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
