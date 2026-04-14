import { createHash } from "node:crypto";

/** SHA-256 hex (64 chars) para índice único; no sustituye a bcrypt almacenado. */
export function hashApiKeyForLookup(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}
