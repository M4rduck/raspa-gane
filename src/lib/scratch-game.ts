export const SCRATCH_SYMBOLS = ["PS5", "CARRO", "MOTO", "TV", "BONO"] as const;

const PRIZE_BY_SYMBOL: Record<(typeof SCRATCH_SYMBOLS)[number], string> = {
  PS5: "Consola PS5",
  CARRO: "Carro 0 KM",
  MOTO: "Moto deportiva",
  TV: "Smart TV 65\"",
  BONO: "Bono Supergiros",
};

type SymbolValue = (typeof SCRATCH_SYMBOLS)[number];

export function isScratchSymbol(value: string): value is SymbolValue {
  return (SCRATCH_SYMBOLS as readonly string[]).includes(value);
}

export type ScratchBoard = {
  board: SymbolValue[][];
  winningLine: number | null;
  prizeLabel: string | null;
};

function randomSymbol(except?: SymbolValue): SymbolValue {
  const pool = except ? SCRATCH_SYMBOLS.filter((s) => s !== except) : [...SCRATCH_SYMBOLS];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * @param assignedSymbol — Si el enlace ya fijó premio al generarse, debe usarse ese símbolo en la línea ganadora.
 */
export function buildScratchBoard(isWinner: boolean, assignedSymbol: string | null = null): ScratchBoard {
  const board: SymbolValue[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => randomSymbol()),
  );

  if (isWinner) {
    const winningLine = Math.floor(Math.random() * 3);
    const symbol: SymbolValue =
      assignedSymbol && isScratchSymbol(assignedSymbol) ? assignedSymbol : randomSymbol();
    board[winningLine] = [symbol, symbol, symbol];
    return {
      board,
      winningLine,
      prizeLabel: PRIZE_BY_SYMBOL[symbol],
    };
  }

  // Evita líneas completas iguales en perdedores
  for (let row = 0; row < 3; row += 1) {
    if (board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
      board[row][2] = randomSymbol(board[row][0]);
    }
  }

  return {
    board,
    winningLine: null,
    prizeLabel: null,
  };
}

export function parseStoredBoard(boardJson: string | null): SymbolValue[][] | null {
  if (!boardJson) return null;
  try {
    const parsed = JSON.parse(boardJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 3) return null;
    for (const row of parsed) {
      if (!Array.isArray(row) || row.length !== 3) return null;
      for (const item of row) {
        if (!SCRATCH_SYMBOLS.includes(item as SymbolValue)) return null;
      }
    }
    return parsed as SymbolValue[][];
  } catch {
    return null;
  }
}
