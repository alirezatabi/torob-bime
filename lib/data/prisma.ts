import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { torobPrisma?: PrismaClient };

/** Server/CLI only. The browser never receives the connection string. */
export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!globalForPrisma.torobPrisma) {
    globalForPrisma.torobPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: 3_000,
        query_timeout: 5_000,
      }),
    });
  }
  return globalForPrisma.torobPrisma;
}
