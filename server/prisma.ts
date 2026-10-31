import { PrismaClient } from '@prisma/client';
import { env, isDatabaseConfigured } from './env.ts';

const globalForPrisma = globalThis as typeof globalThis & { __sanctumPrisma?: PrismaClient };

let prismaClient: PrismaClient | null = null;

function currentPrisma(): PrismaClient | null {
  if (env.nodeEnv === 'development' && globalForPrisma.__sanctumPrisma) {
    return globalForPrisma.__sanctumPrisma;
  }
  return prismaClient;
}

/**
 * Prisma App / 1-vCPU hosts default to connection_limit=3. Concurrent dashboard
 * requests then time out before delete/auth can run. Keep Accelerate URLs unchanged.
 */
export function withConnectionPoolParams(databaseUrl: string): string {
  if (databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://')) {
    return databaseUrl;
  }
  let next = databaseUrl;
  const append = (key: string, value: string) => {
    if (new RegExp(`[?&]${key}=`).test(next)) return;
    next += `${next.includes('?') ? '&' : '?'}${key}=${value}`;
  };
  append('connection_limit', '10');
  append('pool_timeout', '20');
  return next;
}

export function isPrismaPoolTimeout(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error && (error as { code: unknown }).code === 'P2024') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Timed out fetching a new connection from the connection pool');
}

export function getPrisma(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  const existing = currentPrisma();
  if (existing) return existing;
  const client = new PrismaClient({
    datasources: { db: { url: withConnectionPoolParams(env.databaseUrl!) } },
  });
  prismaClient = client;
  if (env.nodeEnv === 'development') {
    globalForPrisma.__sanctumPrisma = client;
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  const client = currentPrisma();
  prismaClient = null;
  globalForPrisma.__sanctumPrisma = undefined;
  if (client) await client.$disconnect();
}

export async function pingDatabase(): Promise<'configured' | 'unavailable'> {
  const client = getPrisma();
  if (!client) return 'unavailable';
  try {
    await client.$queryRaw`SELECT 1`;
    return 'configured';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('database ping failed:', message);
    return 'unavailable';
  }
}
