import { Prisma } from "@prisma/client";

const RETRYABLE = new Set(["P2034", "P2028"]);

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE.has(error.code)
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Reintenta ante conflictos de serialización / deadlock en PostgreSQL bajo alta concurrencia.
 */
export async function withTransactionRetry<T>(
  run: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const base = options?.baseDelayMs ?? 15;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (e) {
      last = e;
      if (!isRetryableTransactionError(e) || attempt === maxAttempts - 1) {
        throw e;
      }
      const jitter = Math.floor(Math.random() * base);
      await delay(base * 2 ** attempt + jitter);
    }
  }
  throw last;
}
