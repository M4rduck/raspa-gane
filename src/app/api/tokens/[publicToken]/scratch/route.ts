import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPrizeAssetsRecord } from "@/lib/prize-assets";
import { buildScratchBoard, parseStoredBoard } from "@/lib/scratch-game";
import { isValidPublicToken } from "@/lib/security-input";

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
  if (!isValidPublicToken(publicToken)) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
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

  const applied = await prisma.scratchToken.updateMany({
    where: { id: token.id, scratchedAt: null },
    data: {
      scratchedAt: new Date(),
      boardJson: JSON.stringify(outcome.board),
      winningLine: outcome.winningLine,
      prizeLabel,
    },
  });

  if (applied.count === 0) {
    const again = await prisma.scratchToken.findUnique({
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
      },
    });
    if (!again?.campaign) {
      return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    }
    const pa = buildPrizeAssetsRecord(again.campaign.prizes);
    const board = parseStoredBoard(again.boardJson);
    const sym = winnerSymbolFromBoard(board, again.winningLine, again.assignedSymbol);
    const winnerImageUrl =
      again.isWinner && sym ? pa[sym]?.imageUrl ?? null : null;
    return NextResponse.json({
      already: true,
      isWinner: again.isWinner,
      board,
      winningLine: again.winningLine,
      prizeLabel: again.prizeLabel,
      prizeAssets: pa,
      winnerImageUrl,
    });
  }

  const board = outcome.board;
  const sym = winnerSymbolFromBoard(board, outcome.winningLine, token.assignedSymbol);
  const winnerImageUrl =
    token.isWinner && sym ? prizeAssets[sym]?.imageUrl ?? null : null;

  return NextResponse.json({
    isWinner: token.isWinner,
    board,
    winningLine: outcome.winningLine,
    prizeLabel,
    prizeAssets,
    winnerImageUrl,
  });
}
