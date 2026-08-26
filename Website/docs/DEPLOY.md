# نشر الموقع على الإنتاج — دليل قاعدة البيانات

## الوضع الحالي (تطوير محلي)
- **Prisma 7** + **SQLite** (`prisma/dev.db`)
- Driver adapter: `@prisma/adapter-better-sqlite3`
- الترحيلات مطبقة في `prisma/migrations/`
- بيانات تجريبية عبر `npx prisma db seed`

## أوامر قاعدة البيانات

```bash
npm run db:migrate     # إنشاء/تطبيق ترحيل جديد أثناء التطوير
npm run db:deploy      # تطبيق الترحيلات فقط (للإنتاج)
npm run db:seed        # تعبئة بيانات تجريبية
npm run db:studio      # فتح Prisma Studio لاستعراض البيانات
```

## الترحيل إلى PostgreSQL عند النشر

1. أنشئ قاعدة PostgreSQL (Neon / Supabase / سيرفر خاص) واحصل على رابط الاتصال.

2. عدّل `.env`:
```env
DATABASE_URL="postgresql://user:pass@host:5432/idexal?schema=public"
```

3. بدّل الـ provider في `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
}
```

4. ثبّت محول PostgreSQL:
```bash
npm install @prisma/adapter-pg
```

5. عدّل `src/lib/db.ts` — استبدل فرع SQLite بـ:
```ts
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
return new PrismaClient({ adapter })
```
   وحدّث `prisma/seed.ts` بنفس المحول عند الحاجة لإعادة التعبئة.

6. طبّق الترحيلات على الإنتاج:
```bash
npm run db:deploy
```

> ملاحظة: الترحيلات المولدة على SQLite تعمل على PostgreSQL لأن المخطط
> يستخدم أنواعاً متوافقة (String/Int/Float/Boolean/DateTime). إن واجهت
> اختلافاً، احذف مجلد migrations وأنشئ ترحيلاً جديداً بـ `db:migrate`
> بعد تبديل الـ provider.

## متغيرات البيئة للإنتاج
```env
DATABASE_URL=      # رابط PostgreSQL
NODE_ENV=production
```
