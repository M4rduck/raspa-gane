import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

// Asegura .env / .env.local cargados (evita DATABASE_URL ausente si el servidor arrancó sin leer .env)
loadEnvConfig(process.cwd());

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Reutilizar instancia en Node (ECS/EC2) reduce conexiones. En Lambda, cada invocación puede crear cliente
 * nuevo: usar RDS Proxy / PgBouncer y `connection_limit` bajo en DATABASE_URL (ver docs/aws-despliegue.md).
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
