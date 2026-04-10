import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { findCampaignByApiKey } from "@/lib/campaign-auth";
import { scratchLink } from "@/lib/app-url";

function bearerApiKey(auth: string | null): string | null {
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

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
      const isWinner = sequence % updated.winEvery === 0;
      const token = await tx.scratchToken.create({
        data: {
          publicToken,
          campaignId: campaign.id,
          isWinner,
          sequence,
          externalRef,
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
            ? "¿Existe .env con DATABASE_URL? Ejecuta: npx prisma db push && npm run db:seed"
            : undefined,
      },
      { status: 500 },
    );
  }
}
