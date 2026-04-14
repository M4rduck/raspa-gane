import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { assertMasterKey } from "@/lib/campaign-auth";
import { normalizePrizeImageUrl } from "@/lib/prize-assets";
import { isScratchSymbol } from "@/lib/scratch-game";

export async function POST(request: Request) {
  const master = request.headers.get("x-master-key");
  if (!assertMasterKey(master)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  type PrizeBody = {
    symbol?: string;
    label?: string;
    weight?: number;
    stockRemaining?: number | null;
    sortOrder?: number;
    /** Ruta (/prizes/x.png) o URL https; omitir = imagen por defecto del símbolo */
    imageUrl?: string | null;
  };

  let body: { name?: string; slug?: string; winEvery?: number; prizes?: PrizeBody[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase().replace(/\s+/g, "-") : "";
  const winEvery = typeof body.winEvery === "number" ? body.winEvery : NaN;

  if (!name || !slug) {
    return NextResponse.json({ error: "name y slug son obligatorios" }, { status: 400 });
  }
  if (!Number.isInteger(winEvery) || winEvery < 1) {
    return NextResponse.json({ error: "winEvery debe ser un entero >= 1" }, { status: 400 });
  }

  const prizesCreate: {
    symbol: string;
    label: string;
    weight: number;
    stockRemaining: number | null;
    sortOrder: number;
    imageUrl: string | null;
  }[] = [];

  if (body.prizes !== undefined) {
    if (!Array.isArray(body.prizes) || body.prizes.length === 0) {
      return NextResponse.json(
        { error: "prizes debe ser un array no vacío con symbol, label y weight" },
        { status: 400 },
      );
    }
    for (let i = 0; i < body.prizes.length; i += 1) {
      const p = body.prizes[i];
      const symbol = typeof p?.symbol === "string" ? p.symbol.trim().toUpperCase() : "";
      const label = typeof p?.label === "string" ? p.label.trim() : "";
      const weight = typeof p?.weight === "number" ? p.weight : NaN;
      const sortOrder = typeof p?.sortOrder === "number" && Number.isInteger(p.sortOrder) ? p.sortOrder : i;
      let stockRemaining: number | null = null;
      if (p?.stockRemaining !== undefined && p?.stockRemaining !== null) {
        if (typeof p.stockRemaining !== "number" || !Number.isInteger(p.stockRemaining) || p.stockRemaining < 0) {
          return NextResponse.json(
            { error: `prizes[${i}].stockRemaining debe ser entero >= 0 o null` },
            { status: 400 },
          );
        }
        stockRemaining = p.stockRemaining;
      }
      if (!symbol || !isScratchSymbol(symbol)) {
        return NextResponse.json(
          {
            error: `prizes[${i}].symbol inválido. Usa: PS5, CARRO, MOTO, TV, BONO`,
          },
          { status: 400 },
        );
      }
      if (!label) {
        return NextResponse.json({ error: `prizes[${i}].label es obligatorio` }, { status: 400 });
      }
      if (!Number.isInteger(weight) || weight < 1) {
        return NextResponse.json(
          { error: `prizes[${i}].weight debe ser un entero >= 1 (peso relativo, ej. 1, 10, 50)` },
          { status: 400 },
        );
      }
      let imageUrl: string | null = null;
      if (p?.imageUrl !== undefined && p?.imageUrl !== null) {
        if (typeof p.imageUrl !== "string") {
          return NextResponse.json({ error: `prizes[${i}].imageUrl debe ser string o null` }, { status: 400 });
        }
        imageUrl = normalizePrizeImageUrl(p.imageUrl);
        if (p.imageUrl.trim() !== "" && imageUrl === null) {
          return NextResponse.json(
            {
              error: `prizes[${i}].imageUrl inválido: usa ruta que empiece por / o http(s)://`,
            },
            { status: 400 },
          );
        }
      }
      prizesCreate.push({ symbol, label, weight, stockRemaining, sortOrder, imageUrl });
    }
  }

  const apiKey = `sg_${nanoid(40)}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 12);

  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        slug,
        winEvery,
        apiKeyHash,
        ...(prizesCreate.length > 0
          ? {
              prizes: {
                create: prizesCreate,
              },
            }
          : {}),
      },
      include: { prizes: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
    });
    return NextResponse.json(
      {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        winEvery: campaign.winEvery,
        apiKey,
        prizes: campaign.prizes.map((p) => ({
          id: p.id,
          symbol: p.symbol,
          label: p.label,
          weight: p.weight,
          stockRemaining: p.stockRemaining,
          imageUrl: p.imageUrl,
        })),
        message:
          prizesCreate.length > 0
            ? "Cada enlace ganador recibe un premio según pesos relativos y stock al emitir el enlace. Guarda apiKey de forma segura."
            : "Guarda apiKey de forma segura; no se volverá a mostrar. Cada winEvery enlaces, el siguiente es ganador (presorteo secuencial). Sin tabla Prize, el símbolo del premio se elige al raspar.",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Slug duplicado u otro error al crear" }, { status: 409 });
  }
}
