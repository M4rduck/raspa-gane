import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { assertMasterKey } from "@/lib/campaign-auth";

export async function POST(request: Request) {
  const master = request.headers.get("x-master-key");
  if (!assertMasterKey(master)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { name?: string; slug?: string; winEvery?: number };
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

  const apiKey = `sg_${nanoid(40)}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 12);

  try {
    const campaign = await prisma.campaign.create({
      data: { name, slug, winEvery, apiKeyHash },
    });
    return NextResponse.json(
      {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        winEvery: campaign.winEvery,
        apiKey,
        message:
          "Guarda apiKey de forma segura; no se volverá a mostrar. Cada winEvery enlaces, el siguiente es ganador (presorteo secuencial).",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Slug duplicado u otro error al crear" }, { status: 409 });
  }
}
