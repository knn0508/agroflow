import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set — add it in Vercel → Settings → Environment Variables");
}

// Local Postgres usually has no TLS; hosted DBs (Supabase/Neon) need it.
const isLocal = !connectionString || /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // Serverless: one connection per lambda instance, let the pooler multiplex.
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
