import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isReasonableEmail,
  isValidPublicToken,
  LIMITS,
  readJsonBodyLimited,
  stripControlChars,
} from "@/lib/security-input";

type Params = { params: Promise<{ publicToken: string }> };

export async function POST(request: Request, { params }: Params) {
  const { publicToken } = await params;
  if (!isValidPublicToken(publicToken)) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
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

  const parsed = await readJsonBodyLimited<{
    fullName?: string;
    email?: string;
    phone?: string;
    documentId?: string;
  }>(request, LIMITS.jsonBodyRegister);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
  const body = parsed.data;

  const fullName = stripControlChars(
    typeof body.fullName === "string" ? body.fullName : "",
  ).slice(0, LIMITS.fullName);
  const email = stripControlChars(
    typeof body.email === "string" ? body.email : "",
  )
    .toLowerCase()
    .slice(0, LIMITS.email);
  const phone = stripControlChars(typeof body.phone === "string" ? body.phone : "").slice(
    0,
    LIMITS.phone,
  );
  const documentId =
    typeof body.documentId === "string" && body.documentId.trim()
      ? stripControlChars(body.documentId).slice(0, LIMITS.documentId)
      : null;

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "fullName, email y phone son obligatorios" },
      { status: 400 },
    );
  }
  if (!isReasonableEmail(email)) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }

  try {
    await prisma.preRegistration.create({
      data: {
        tokenId: token.id,
        fullName,
        email,
        phone,
        documentId,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    console.error("[POST register]", e);
    return NextResponse.json({ error: "No se pudo completar el registro" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
