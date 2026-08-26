import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'prisma/config'

// Prisma 7 config does not auto-load .env — load it explicitly.
function loadEnv() {
  const envPath = path.join(import.meta.dirname, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadEnv()

export default defineConfig({
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(import.meta.dirname, 'prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // SQLite for local dev; swap to postgresql:// URL in production .env
    url: process.env.DATABASE_URL!,
  },
})
