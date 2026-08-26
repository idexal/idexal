# ربط idexal.com مع api.idexa.com عبر OmniRoute

## المعمارية العامة

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  idexal.com (لوحة الإدارة)    │         │  api.idexa.com (البوابة)     │
│                              │         │                              │
│  • حسابات المستخدمين          │  مزامنة  │  • OmniRoute Gateway          │
│  • الاشتراكات والفوترة        │◄───────►│  • 339+ مزود مرتبط            │
│  • مفاتيح API (إنشاء/إدارة)   │         │  • توجيه النماذج + Fallback   │
│  • توثيق المطورين             │         │  • ميزانيات وحدود الاستخدام    │
│  • Prisma + PostgreSQL        │         │  • SQLite مشفر AES-256        │
└──────────────────────────────┘         └──────────────────────────────┘
        control plane                              data plane
```

- **idexal.com** = مصدر الحقيقة للحسابات والاشتراكات والمفاتيح (لوحة الإدارة).
- **api.idexa.com** = بوابة OmniRoute التي تخدم الاستدلال فعلياً وتدير
  المزودين المرتبطين والنماذج الخاصة.

## تدفق إنشاء المفتاح (تلقائي وثنائي الاتجاه)

1. المطور ينشئ مفتاحاً من لوحته في **idexal.com**.
2. يُحفظ المفتاح محلياً في Prisma (`ApiKey`، الهاش فقط).
3. فوراً يستدعي الخادم `POST /api/keys` على **api.idexa.com**:
   ```http
   POST https://api.idexa.com/api/keys
   Authorization: Bearer oma_live_<admin-token>
   Content-Type: application/json

   { "label": "idexal.com:user@email:keyId" }
   ```
4. يُسجَّل `gatewayKeyId` في صف المفتاح المحلي ويصبح `synced = true`.
5. تُطبَّق ميزانية شهرية عبر `POST /api/usage/budget`.
6. المفتاح يبقى **مرتبطاً بالمستخدم** — الحذف/الإلغاء محلياً يستدعي
   `DELETE /api/keys/{gatewayKeyId}` فوراً.

> إذا كانت البوابة غير منشرة بعد، المفتاح المحلي يعمل وتبقى المزامنة
> معلقة (`synced = false`) حتى أول "مزامنة الآن" من لوحة الأدمن.

## المصادقة مع البوابة

| نوع | الشكل | الاستخدام |
|---|---|---|
| Access Token | `oma_live_…` | إدارة البرمجية (إنشاء/حذف مفاتيح، ميزانيات) — scope: `admin` |
| مفاتيح استدلال | `sk-…` | `/v1/*` فقط — لا تصلح للإدارة |

يُنشأ الـ Access Token مرة واحدة من: **OmniRoute Dashboard → Settings →
Access Tokens** (scope: `admin`) ويوضع في `.env` على الخادم فقط:

```env
OMNIROUTE_URL="https://api.idexa.com"
OMNIROUTE_ADMIN_TOKEN="oma_live_…"
```

## الواجهات المستخدمة (من OpenAPI الرسمي v3.8.50)

| العملية | Endpoint | ملاحظات |
|---|---|---|
| إنشاء مفتاح | `POST /api/keys` `{label}` | يعيد السر كاملاً **مرة واحدة** |
| قائمة المفاتيح | `GET /api/keys` | preview فقط |
| إلغاء مفتاح | `DELETE /api/keys/{id}` | عند حذف المفتاح محلياً |
| ميزانية الاستخدام | `POST /api/usage/budget` | حد USD شهري لكل مفتاح |
| سجل الاستخدام | `GET /api/usage/history` | يُعكس في UsageRecord (source=omniroute) |
| ربط مزود | `POST /api/providers` `{provider, apiKey}` | إدارة المزودين المرتبطين |
| فحص صحة | `GET /api/keys` (200 = حي) | widget الحالة في لوحة الأدمن |

الكود: `src/lib/omniroute.ts` — كل الاستدعاءات تمر عبر `omni()` الذي
يحقن التوكن ويوحد الأخطاء.

## النشر المستقبلي

1. انشر OmniRoute على السيرفر (Docker موصى به) واربطه بالنطاق `api.idexa.com`.
2. اضبط `INITIAL_PASSWORD` ثم أنشئ Access Token بنطاق `admin`.
3. ضع التوكن في `.env` على خادم idexal.com.
4. من لوحة الأدمن اضغط "مزامنة المفاتيح" لترحيل كل المفاتيح المعلقة.
