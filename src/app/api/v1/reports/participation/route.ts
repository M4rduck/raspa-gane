import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bearerApiKey, findCampaignByApiKey } from "@/lib/campaign-auth";

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Reporte de participación por campaña (misma API key que genera enlaces).
 * ?format=csv (default) descarga CSV; ?format=json devuelve JSON.
 */
export async function GET(request: Request) {
  const apiKey = bearerApiKey(request.headers.get("authorization"));
  const campaign = apiKey ? await findCampaignByApiKey(apiKey) : null;
  if (!campaign) {
    return NextResponse.json({ error: "API key inválida" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  const tokens = await prisma.scratchToken.findMany({
    where: { campaignId: campaign.id },
    include: { registration: true },
    orderBy: { sequence: "asc" },
  });

  const rows = tokens.map((t) => ({
    sequence: t.sequence,
    publicToken: t.publicToken,
    externalRef: t.externalRef,
    linkCreatedAt: t.createdAt.toISOString(),
    isWinner: t.isWinner,
    prizeLabel: t.prizeLabel,
    assignedSymbol: t.assignedSymbol,
    scratchedAt: t.scratchedAt?.toISOString() ?? "",
    registrantName: t.registration?.fullName ?? "",
    registrantEmail: t.registration?.email ?? "",
    registrantPhone: t.registration?.phone ?? "",
    registrantDocumentId: t.registration?.documentId ?? "",
    registrationAt: t.registration?.createdAt.toISOString() ?? "",
  }));

  if (format === "json") {
    return NextResponse.json({
      campaignSlug: campaign.slug,
      campaignName: campaign.name,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      rows,
    });
  }

  if (format !== "csv") {
    return NextResponse.json({ error: "format debe ser csv o json" }, { status: 400 });
  }

  const header = [
    "sequence",
    "publicToken",
    "externalRef",
    "linkCreatedAt",
    "isWinner",
    "prizeLabel",
    "assignedSymbol",
    "scratchedAt",
    "registrantName",
    "registrantEmail",
    "registrantPhone",
    "registrantDocumentId",
    "registrationAt",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        escapeCsvCell(r.sequence),
        escapeCsvCell(r.publicToken),
        escapeCsvCell(r.externalRef),
        escapeCsvCell(r.linkCreatedAt),
        escapeCsvCell(r.isWinner),
        escapeCsvCell(r.prizeLabel),
        escapeCsvCell(r.assignedSymbol),
        escapeCsvCell(r.scratchedAt),
        escapeCsvCell(r.registrantName),
        escapeCsvCell(r.registrantEmail),
        escapeCsvCell(r.registrantPhone),
        escapeCsvCell(r.registrantDocumentId),
        escapeCsvCell(r.registrationAt),
      ].join(","),
    ),
  ];

  const csv = `\uFEFF${lines.join("\r\n")}`;
  const filename = `raspa-${campaign.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
