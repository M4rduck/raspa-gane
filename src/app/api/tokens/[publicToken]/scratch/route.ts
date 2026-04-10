import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildScratchBoard, parseStoredBoard } from "@/lib/scratch-game";

type Params = { params: Promise<{ publicToken: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { publicToken } = await params;
  const token = await prisma.scratchToken.findUnique({
    where: { publicToken },
    include: { campaign: true, registration: true },
  });

  if (!token || !token.campaign.active) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  if (!token.registration) {
    return NextResponse.json({ error: "Completa el registro antes de raspar" }, { status: 400 });
  }
  if (token.scratchedAt) {
    const board = parseStoredBoard(token.boardJson);
    return NextResponse.json({
      already: true,
      isWinner: token.isWinner,
      board,
      winningLine: token.winningLine,
      prizeLabel: token.prizeLabel,
    });
  }

  const outcome = buildScratchBoard(token.isWinner);
  const updated = await prisma.scratchToken.update({
    where: { id: token.id },
    data: {
      scratchedAt: new Date(),
      boardJson: JSON.stringify(outcome.board),
      winningLine: outcome.winningLine,
      prizeLabel: outcome.prizeLabel,
    },
    select: {
      isWinner: true,
      boardJson: true,
      winningLine: true,
      prizeLabel: true,
    },
  });

  return NextResponse.json({
    isWinner: updated.isWinner,
    board: parseStoredBoard(updated.boardJson),
    winningLine: updated.winningLine,
    prizeLabel: updated.prizeLabel,
  });
}
