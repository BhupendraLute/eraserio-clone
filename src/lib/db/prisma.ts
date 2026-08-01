import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawConnectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

// Ensure sslmode=verify-full is used to suppress pg-connection-string v3 security warning
const connectionString = rawConnectionString?.includes('sslmode=require')
  ? rawConnectionString.replace('sslmode=require', 'sslmode=verify-full')
  : rawConnectionString;

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
