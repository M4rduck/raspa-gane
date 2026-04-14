import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPrizeAssetsRecord } from "@/lib/prize-assets";
import { buildScratchBoard, parseStoredBoard } from "@/lib/scratch-game";

type Params = { params: Promise<{ publicToken: string }> };

function winnerSymbolFromBoard(
  board: string[][] | null,
  winningLine: number | null,
  assignedSymbol: string | null,
): string | null {
  if (assignedSymbol) return assignedSymbol;
  if (winningLine === null || !board || !board[winningLine]?.[0]) return null;
  return board[winningLine][0];
}

export async function POST(_request: Request, { params }: Params) {
  const { publicToken } = await params;
  const token = await prisma.scratchToken.findUnique({
    where: { publicToken },
    include: {
      campaign: {
        include: {
          prizes: {
            select: { symbol: true, label: true, imageUrl: true },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
      },
      registration: true,
    },
  });

  if (!token || !token.campaign.active) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  if (!token.registration) {
    return NextResponse.json({ error: "Completa el registro antes de raspar" }, { status: 400 });
  }

  const prizeAssets = buildPrizeAssetsRecord(token.campaign.prizes);

  if (token.scratchedAt) {
    const board = parseStoredBoard(token.boardJson);
    const sym = winnerSymbolFromBoard(board, token.winningLine, token.assignedSymbol);
    const winnerImageUrl =
      token.isWinner && sym ? prizeAssets[sym]?.imageUrl ?? null : null;
    return NextResponse.json({
      already: true,
      isWinner: token.isWinner,
      board,
      winningLine: token.winningLine,
      prizeLabel: token.prizeLabel,
      prizeAssets,
      winnerImageUrl,
    });
  }

  const outcome = buildScratchBoard(token.isWinner, token.assignedSymbol);
  const prizeLabel = token.prizeLabel ?? outcome.prizeLabel;
  const updated = await prisma.scratchToken.update({
    where: { id: token.id },
    data: {
      scratchedAt: new Date(),
      boardJson: JSON.stringify(outcome.board),
      winningLine: outcome.winningLine,
      prizeLabel,
    },
    select: {
      isWinner: true,
      boardJson: true,
      winningLine: true,
      prizeLabel: true,
      assignedSymbol: true,
    },
  });

  const board = parseStoredBoard(updated.boardJson);
  const sym = winnerSymbolFromBoard(board, updated.winningLine, updated.assignedSymbol);
  const winnerImageUrl =
    updated.isWinner && sym ? prizeAssets[sym]?.imageUrl ?? null : null;

  return NextResponse.json({
    isWinner: updated.isWinner,
    board,
    winningLine: updated.winningLine,
    prizeLabel: updated.prizeLabel,
    prizeAssets,
    winnerImageUrl,
  });
}
