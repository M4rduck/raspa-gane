import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

// Asegura .env / .env.local cargados (evita DATABASE_URL ausente si el servidor arrancó sin leer .env)
loadEnvConfig(process.cwd());

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
