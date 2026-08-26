/**
 * Seed: demo users, subscriptions, invoices, API keys, usage, plugins, blog.
 * Run: npx prisma db seed   (via tsx)
 */
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient, PlanTier, Role, UserStatus } from '@prisma/client'

const adapter = new PrismaBetterSqlite3({ url: 'prisma/dev.db' })
const prisma = new PrismaClient({ adapter })

// Deterministic hash placeholder — replace with bcrypt/argon2 in production auth.
const fakeHash = (pw: string) => `sha256$${Buffer.from(pw).toString('base64')}`

async function main() {
  console.log('Seeding Idexal database…')

  const users = [
    { email: 'ahmed@example.com', name: 'Ahmed Hassan', role: Role.USER, status: UserStatus.ACTIVE, plan: PlanTier.PRO, country: 'EG' },
    { email: 'sara@example.com', name: 'Sara Johnson', role: Role.USER, status: UserStatus.ACTIVE, plan: PlanTier.FREE, country: 'US' },
    { email: 'omar@example.com', name: 'Omar Khaled', role: Role.USER, status: UserStatus.BANNED, plan: PlanTier.ENTERPRISE, country: 'AE' },
    { email: 'kenji@example.com', name: 'Kenji Tanaka', role: Role.DEVELOPER, status: UserStatus.ACTIVE, plan: PlanTier.TEAM, country: 'JP' },
    { email: 'marie@example.com', name: 'Marie Dubois', role: Role.MANAGER, status: UserStatus.ACTIVE, plan: PlanTier.PRO, country: 'FR' },
    { email: 'admin@idexal.com', name: 'Idexal Admin', role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, plan: PlanTier.ENTERPRISE, country: 'EG' },
  ] as const

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: fakeHash('password123'),
        role: u.role,
        status: u.status,
        country: u.country,
        emailVerified: true,
        subscriptions: {
          create: {
            tier: u.plan,
            status: 'ACTIVE',
            currentPeriodEnd: new Date('2026-09-25'),
          },
        },
      },
    })

    // API key per user
    await prisma.apiKey.upsert({
      where: { keyHash: fakeHash(`sk-${u.email}`) },
      update: {},
      create: {
        userId: user.id,
        name: 'default',
        keyHash: fakeHash(`sk-${u.email}`),
        keyPreview: `sk-…${u.email.slice(0, 4)}`,
      },
    })

    // 30 days of usage on idexal models
    const models = ['idexal-pro', 'idexal-lite', 'idexal-code'] as const
    const costs: Record<string, [number, number]> = {
      'idexal-pro': [3, 15],
      'idexal-lite': [0.15, 0.6],
      'idexal-code': [1.5, 6],
    }
    const records = []
    for (let d = 0; d < 30; d++) {
      const model = models[d % models.length]
      const [inPrice, outPrice] = costs[model]
      const promptTokens = 800 + ((d * 137) % 1200)
      const completionTokens = 200 + ((d * 89) % 500)
      records.push({
        userId: user.id,
        model,
        promptTokens,
        completionTokens,
        costUsd: (promptTokens / 1e6) * inPrice + (completionTokens / 1e6) * outPrice,
        createdAt: new Date(Date.now() - d * 86400_000),
      })
    }
    await prisma.usageRecord.createMany({ data: records })
  }

  // Invoices for the Pro user
  const ahmed = await prisma.user.findUnique({ where: { email: 'ahmed@example.com' } })
  if (ahmed) {
    for (let i = 0; i < 3; i++) {
      const date = new Date(2026, 7 - i, 1)
      await prisma.invoice.upsert({
        where: { number: `INV-10${42 - i}` },
        update: {},
        create: {
          userId: ahmed.id,
          number: `INV-10${42 - i}`,
          amountUsd: 29,
          status: 'PAID',
          method: 'visa_4242',
          createdAt: date,
        },
      })
    }
  }

  // Plugins
  const kenji = await prisma.user.findUnique({ where: { email: 'kenji@example.com' } })
  if (kenji) {
    await prisma.plugin.upsert({
      where: { slug: 'themex' },
      update: {},
      create: { authorId: kenji.id, name: 'ThemeX', slug: 'themex', description: 'Beautiful theme pack for Idexal.', installs: 1230, rating: 4.8, revenueUsd: 450, status: 'LIVE' },
    })
    await prisma.plugin.upsert({
      where: { slug: 'gitpro-tools' },
      update: {},
      create: { authorId: kenji.id, name: 'GitPro Tools', slug: 'gitpro-tools', description: 'Advanced Git workflow tools.', installs: 890, rating: 4.6, revenueUsd: 320, status: 'REVIEW' },
    })
  }

  console.log('Seed complete ✓')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
