import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { bearerApiKey, findCampaignByApiKey } from "@/lib/campaign-auth";
import { assignPrizeForWinner } from "@/lib/prize-assignment";
import { scratchLink } from "@/lib/app-url";

export async function POST(request: Request) {
  try {
    const apiKey = bearerApiKey(request.headers.get("authorization"));
    const campaign = apiKey ? await findCampaignByApiKey(apiKey) : null;
    if (!campaign) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 });
    }

    let body: { externalRef?: string };
    try {
      body = await request.json().catch(() => ({}));
    } catch {
      body = {};
    }
    const externalRef =
      typeof body.externalRef === "string" && body.externalRef.trim().length > 0
        ? body.externalRef.trim().slice(0, 200)
        : null;

    const publicToken = nanoid(18);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.campaign.update({
        where: { id: campaign.id },
        data: { issuedCount: { increment: 1 } },
        select: { issuedCount: true, winEvery: true },
      });
      const sequence = updated.issuedCount;
      let isWinner = sequence % updated.winEvery === 0;

      let prizeId: string | null = null;
      let prizeLabel: string | null = null;
      let assignedSymbol: string | null = null;

      if (isWinner) {
        const configuredPrizes = await tx.prize.count({ where: { campaignId: campaign.id } });
        if (configuredPrizes > 0) {
          const assigned = await assignPrizeForWinner(tx, campaign.id);
          if (!assigned) {
            isWinner = false;
          } else {
            prizeId = assigned.prizeId;
            prizeLabel = assigned.label;
            assignedSymbol = assigned.symbol;
          }
        }
      }

      const token = await tx.scratchToken.create({
        data: {
          publicToken,
          campaignId: campaign.id,
          isWinner,
          sequence,
          externalRef,
          prizeId,
          prizeLabel,
          assignedSymbol,
        },
      });
      return { token, sequence };
    });

    const url = scratchLink(result.token.publicToken);

    return NextResponse.json(
      {
        url,
        publicToken: result.token.publicToken,
        sequence: result.sequence,
        campaignSlug: campaign.slug,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/v1/links]", e);
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json(
      {
        error: "Error del servidor",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
        hint:
          process.env.NODE_ENV === "development"
            ? "¿Existe .env con DATABASE_URL (PostgreSQL)? Ejecuta: npm run db:push && npm run db:seed"
            : undefined,
      },
      { status: 500 },
    );
  }
}
