import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per process. Next.js hot-reloads modules in dev, which
 * would otherwise open a new pool on every save until Postgres refuses more
 * connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Serverless functions scale out, and each instance opens its own connection,
 * so a managed Postgres that offers a pooled endpoint wants to be reached
 * through it — otherwise a busy Friday night exhausts the connection limit
 * while most of those connections sit idle. Prisma Postgres publishes both
 * and Vercel's integration sets DATABASE_URL_POOLED alongside DATABASE_URL.
 *
 * Migrations are the exception and must not go through the pooler, but they
 * run from the CLI against DATABASE_URL, never through this client.
 */
const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionString,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
