import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool };

// DATABASE_URL locally; Vercel's Supabase integration provides POSTGRES_* instead.
const rawUrl =
  process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
if (!rawUrl) {
  console.error("No database URL set (DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL)");
}
// Drop sslmode/pgbouncer/supa params: TLS is configured explicitly below.
function cleanUrl(url?: string) {
  if (!url) return url;
  try {
    const u = new URL(url);
    for (const k of ["sslmode", "pgbouncer", "supa"]) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url;
  }
}
const connectionString = cleanUrl(rawUrl);

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
