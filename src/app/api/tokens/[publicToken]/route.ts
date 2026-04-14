import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPrizeAssetsRecord } from "@/lib/prize-assets";
import { isValidPublicToken } from "@/lib/security-input";

type Params = { params: Promise<{ publicToken: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { publicToken } = await params;
  if (!isValidPublicToken(publicToken)) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  const token = await prisma.scratchToken.findUnique({
    where: { publicToken },
    include: {
      campaign: {
        select: {
          name: true,
          slug: true,
          active: true,
          prizes: {
            select: { symbol: true, label: true, imageUrl: true },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
      },
      registration: { select: { id: true } },
    },
  });

  if (!token || !token.campaign.active) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }

  const prizeAssets = buildPrizeAssetsRecord(token.campaign.prizes);

  return NextResponse.json({
    campaignName: token.campaign.name,
    campaignSlug: token.campaign.slug,
    registered: Boolean(token.registration),
    scratched: Boolean(token.scratchedAt),
    prizeAssets,
  });
}
