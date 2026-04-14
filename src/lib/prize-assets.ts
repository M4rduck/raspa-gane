export type PrizeRowForAssets = {
  symbol: string;
  label: string;
  imageUrl: string | null;
};

/** Mapa símbolo → texto e imagen para el tablero (merge en cliente con fallbacks). */
export function buildPrizeAssetsRecord(
  prizes: PrizeRowForAssets[],
): Record<string, { label: string; imageUrl: string | null }> {
  const r: Record<string, { label: string; imageUrl: string | null }> = {};
  for (const p of prizes) {
    const url = p.imageUrl?.trim() || null;
    r[p.symbol] = { label: p.label, imageUrl: url };
  }
  return r;
}

export function normalizePrizeImageUrl(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.length > 500) return null;
  if (s.startsWith("/")) return s;
  if (s.startsWith("https://") || s.startsWith("http://")) return s;
  return null;
}
