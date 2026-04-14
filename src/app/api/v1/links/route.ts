import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { bearerApiKey, findCampaignByApiKey } from "@/lib/campaign-auth";
import { assignPrizeForWinner } from "@/lib/prize-assignment";
import { scratchLink } from "@/lib/app-url";
import { withTransactionRetry } from "@/lib/transaction-retry";
import { LIMITS, readJsonBodyLimited, stripControlChars } from "@/lib/security-input";

export async function POST(request: Request) {
  try {
    const apiKey = bearerApiKey(request.headers.get("authorization"));
    const campaign = apiKey ? await findCampaignByApiKey(apiKey) : null;
    if (!campaign) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 });
    }

    const parsed = await readJsonBodyLimited<{ externalRef?: string }>(
      request,
      LIMITS.jsonBodyLinks,
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: parsed.status });
    }
    const body = parsed.data;
    const externalRef =
      typeof body.externalRef === "string" && body.externalRef.trim().length > 0
        ? stripControlChars(body.externalRef).slice(0, LIMITS.externalRef)
        : null;

    const publicToken = nanoid(18);

    const result = await withTransactionRetry(() =>
      prisma.$transaction(
        async (tx) => {
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
            const hasPrizeTable = await tx.prize.findFirst({
              where: { campaignId: campaign.id },
              select: { id: true },
            });
            if (hasPrizeTable) {
              const assigned = await assignPrizeForWinner(tx, campaign.id);
              if (!assigned) {
                isWinner = false;
                if (process.env.NODE_ENV === "production") {
                  console.warn(
                    JSON.stringify({
                      event: "prize_stock_exhausted_demoted_to_loser",
                      campaignId: campaign.id,
                      sequence,
                    }),
                  );
                }
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
        },
        { maxWait: 12_000, timeout: 25_000 },
      ),
    );

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
