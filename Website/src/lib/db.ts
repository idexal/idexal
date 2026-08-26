import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Singleton across dev hot-reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  if (url.startsWith('postgres')) {
    // Production: swap to @prisma/adapter-pg (see docs/DEPLOY.md)
    throw new Error('Install @prisma/adapter-pg and construct PrismaPg here for production.')
  }
  const adapter = new PrismaBetterSqlite3({ url: url.replace('file:', '') })
  return new PrismaClient({ adapter, log: ['error'] })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
