import type { Prisma, Prize } from "@prisma/client";

const MAX_REPICK = 32;

function pickIndexByWeight(prizes: Pick<Prize, "weight">[]): number {
  const total = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
  if (total <= 0) return -1;
  let r = Math.floor(Math.random() * total);
  for (let i = 0; i < prizes.length; i += 1) {
    const w = Math.max(0, prizes[i].weight);
    if (r < w) return i;
    r -= w;
  }
  return prizes.length - 1;
}

export type AssignedPrize = { prizeId: string; label: string; symbol: string };

/**
 * Elige un premio por pesos relativos (ej. 1, 10, 50 ≈ 1%, 10%, 50% si son los únicos pesos).
 * Stock finito: decremento atómico; si hubo carrera, reintenta con la lista actual.
 */
export async function assignPrizeForWinner(
  tx: Prisma.TransactionClient,
  campaignId: string,
  depth = 0,
): Promise<AssignedPrize | null> {
  if (depth > MAX_REPICK) return null;

  const prizes = await tx.prize.findMany({
    where: {
      campaignId,
      OR: [{ stockRemaining: null }, { stockRemaining: { gt: 0 } }],
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  if (prizes.length === 0) return null;

  const idx = pickIndexByWeight(prizes);
  if (idx < 0) return null;

  const chosen = prizes[idx];
  if (!chosen) return null;

  if (chosen.stockRemaining != null) {
    const updated = await tx.prize.updateMany({
      where: { id: chosen.id, stockRemaining: { gt: 0 } },
      data: { stockRemaining: { decrement: 1 } },
    });
    if (updated.count === 0) {
      return assignPrizeForWinner(tx, campaignId, depth + 1);
    }
  }

  return { prizeId: chosen.id, label: chosen.label, symbol: chosen.symbol };
}
