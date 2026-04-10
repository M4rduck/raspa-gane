import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ publicToken: string }> };

export async function POST(request: Request, { params }: Params) {
  const { publicToken } = await params;
  const token = await prisma.scratchToken.findUnique({
    where: { publicToken },
    include: { campaign: true, registration: true },
  });

  if (!token || !token.campaign.active) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  if (token.registration) {
    return NextResponse.json({ ok: true, already: true });
  }

  let body: { fullName?: string; email?: string; phone?: string; documentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const documentId =
    typeof body.documentId === "string" && body.documentId.trim()
      ? body.documentId.trim().slice(0, 64)
      : null;

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "fullName, email y phone son obligatorios" },
      { status: 400 },
    );
  }

  await prisma.preRegistration.create({
    data: {
      tokenId: token.id,
      fullName,
      email,
      phone,
      documentId,
    },
  });

  return NextResponse.json({ ok: true });
}
