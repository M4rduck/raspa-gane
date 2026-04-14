import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertMasterKey } from "@/lib/campaign-auth";
import { isValidCampaignSlug, LIMITS, readJsonBodyLimited } from "@/lib/security-input";

type Params = { params: Promise<{ slug: string }> };

/**
 * Estado actual de campaña y premios (sin secretos). Solo `X-Master-Key`.
 */
export async function GET(request: Request, { params }: Params) {
  const master = request.headers.get("x-master-key");
  if (!assertMasterKey(master)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { slug } = await params;
  if (!isValidCampaignSlug(slug)) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      winEvery: true,
      issuedCount: true,
      active: true,
      createdAt: true,
      prizes: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          symbol: true,
          label: true,
          weight: true,
          stockRemaining: true,
          sortOrder: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

/**
 * Ajuste en caliente: `winEvery`, `active`, `name`. Solo `X-Master-Key`.
 * El siguiente enlace usará ya el nuevo `winEvery` con el `issuedCount` actual (el patrón de ganadores cambia a partir de ahí).
 */
export async function PATCH(request: Request, { params }: Params) {
  const master = request.headers.get("x-master-key");
  if (!assertMasterKey(master)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { slug } = await params;
  if (!isValidCampaignSlug(slug)) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  const parsed = await readJsonBodyLimited<{
    winEvery?: number;
    active?: boolean;
    name?: string;
  }>(request, LIMITS.jsonBodyAdminPatch);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
  const body = parsed.data;

  const data: { winEvery?: number; active?: boolean; name?: string } = {};

  if (body.winEvery !== undefined) {
    if (!Number.isInteger(body.winEvery) || body.winEvery < 1) {
      return NextResponse.json({ error: "winEvery debe ser entero >= 1" }, { status: 400 });
    }
    data.winEvery = body.winEvery;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active debe ser boolean" }, { status: 400 });
    }
    data.active = body.active;
  }
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, LIMITS.campaignName) : "";
    if (!name) {
      return NextResponse.json({ error: "name no puede estar vacío" }, { status: 400 });
    }
    data.name = name;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Envía al menos uno: winEvery, active, name" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.campaign.update({
      where: { slug },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        winEvery: true,
        issuedCount: true,
        active: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Campaña no encontrada u otro error" }, { status: 404 });
  }
}
