import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const campaigns = await prisma.campaign.count();
    return NextResponse.json({ ok: true, database: "connected", campaigns });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        detail: message,
        hint: "Crea .env desde .env.example y ejecuta: npx prisma db push && npm run db:seed",
      },
      { status: 503 },
    );
  }
}
