import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertMasterKey } from "@/lib/campaign-auth";
import { normalizePrizeImageUrl } from "@/lib/prize-assets";
import { isScratchSymbol } from "@/lib/scratch-game";
import {
  isValidCampaignSlug,
  LIMITS,
  readJsonBodyLimited,
  stripControlChars,
} from "@/lib/security-input";

type Params = { params: Promise<{ slug: string; symbol: string }> };

/**
 * Ajuste en caliente de un premio por símbolo (MOTO, BONO, …). Solo `X-Master-Key`.
 * `stockRemaining` es el valor ABSOLUTO de unidades restantes (no es un delta).
 */
export async function PATCH(request: Request, { params }: Params) {
  const master = request.headers.get("x-master-key");
  if (!assertMasterKey(master)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { slug, symbol: symbolParam } = await params;
  if (!isValidCampaignSlug(slug)) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }
  const symbol = decodeURIComponent(symbolParam).trim().toUpperCase();
  if (!isScratchSymbol(symbol)) {
    return NextResponse.json(
      { error: "symbol inválido. Usa: PS5, CARRO, MOTO, TV, BONO" },
      { status: 400 },
    );
  }

  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  const parsed = await readJsonBodyLimited<{
    weight?: number;
    stockRemaining?: number | null;
    label?: string;
    imageUrl?: string | null;
    sortOrder?: number;
  }>(request, LIMITS.jsonBodyAdminPatch);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
  const body = parsed.data;

  const data: {
    weight?: number;
    stockRemaining?: number | null;
    label?: string;
    imageUrl?: string | null;
    sortOrder?: number;
  } = {};

  if (body.weight !== undefined) {
    if (!Number.isInteger(body.weight) || body.weight < 1) {
      return NextResponse.json({ error: "weight debe ser entero >= 1" }, { status: 400 });
    }
    data.weight = body.weight;
  }
  if (body.stockRemaining !== undefined) {
    if (body.stockRemaining === null) {
      data.stockRemaining = null;
    } else if (
      typeof body.stockRemaining === "number" &&
      Number.isInteger(body.stockRemaining) &&
      body.stockRemaining >= 0
    ) {
      data.stockRemaining = body.stockRemaining;
    } else {
      return NextResponse.json(
        { error: "stockRemaining debe ser entero >= 0 o null (ilimitado)" },
        { status: 400 },
      );
    }
  }
  if (body.label !== undefined) {
    const label = stripControlChars(typeof body.label === "string" ? body.label : "").slice(
      0,
      LIMITS.prizeLabel,
    );
    if (!label) {
      return NextResponse.json({ error: "label no puede estar vacío" }, { status: 400 });
    }
    data.label = label;
  }
  if (body.imageUrl !== undefined) {
    if (body.imageUrl === null || body.imageUrl === "") {
      data.imageUrl = null;
    } else if (typeof body.imageUrl === "string") {
      const url = normalizePrizeImageUrl(body.imageUrl);
      if (body.imageUrl.trim() !== "" && url === null) {
        return NextResponse.json(
          { error: "imageUrl inválido: usa /ruta o http(s)://" },
          { status: 400 },
        );
      }
      data.imageUrl = url;
    } else {
      return NextResponse.json({ error: "imageUrl inválido" }, { status: 400 });
    }
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder)) {
      return NextResponse.json({ error: "sortOrder debe ser entero" }, { status: 400 });
    }
    data.sortOrder = body.sortOrder;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Envía al menos uno: weight, stockRemaining, label, imageUrl, sortOrder" },
      { status: 400 },
    );
  }

  const result = await prisma.prize.updateMany({
    where: { campaignId: campaign.id, symbol },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "No existe premio con ese symbol en la campaña" },
      { status: 404 },
    );
  }

  const prize = await prisma.prize.findFirst({
    where: { campaignId: campaign.id, symbol },
    select: {
      id: true,
      symbol: true,
      label: true,
      weight: true,
      stockRemaining: true,
      sortOrder: true,
      imageUrl: true,
    },
  });

  return NextResponse.json(prize);
}
