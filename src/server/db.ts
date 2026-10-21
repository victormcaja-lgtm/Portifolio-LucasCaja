import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "./env";

// Em dev, o hot reload reavalia módulos; guardar o cliente em globalThis evita abrir
// um pool de conexões novo a cada recarga.
const globalForDb = globalThis as typeof globalThis & { __portfolioDb?: PrismaClient };

/** Cliente Prisma singleton (adapter `pg`). Valida `DATABASE_URL` só quando chamado. */
export function getDb(): PrismaClient {
  if (!globalForDb.__portfolioDb) {
    const { DATABASE_URL } = getServerEnv();
    globalForDb.__portfolioDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    });
  }
  return globalForDb.__portfolioDb;
}
