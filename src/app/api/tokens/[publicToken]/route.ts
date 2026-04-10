import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ publicToken: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { publicToken } = await params;
  const token = await prisma.scratchToken.findUnique({
    where: { publicToken },
    include: {
      campaign: { select: { name: true, slug: true, active: true } },
      registration: { select: { id: true } },
    },
  });

  if (!token || !token.campaign.active) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }

  return NextResponse.json({
    campaignName: token.campaign.name,
    campaignSlug: token.campaign.slug,
    registered: Boolean(token.registration),
    scratched: Boolean(token.scratchedAt),
  });
}
