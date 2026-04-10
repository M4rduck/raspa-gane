import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export async function findCampaignByApiKey(apiKey: string) {
  if (!apiKey) return null;
  const campaigns = await prisma.campaign.findMany({
    where: { active: true },
    select: { id: true, apiKeyHash: true, name: true, slug: true, winEvery: true },
  });
  for (const c of campaigns) {
    const ok = await bcrypt.compare(apiKey, c.apiKeyHash);
    if (ok) return c;
  }
  return null;
}

export function assertMasterKey(headerKey: string | null): boolean {
  const expected = process.env.MASTER_ADMIN_KEY;
  if (!expected || !headerKey) return false;
  return headerKey === expected;
}
