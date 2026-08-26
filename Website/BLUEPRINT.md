# 🌐 Idexal Website — خطة التطوير الشاملة

> مخطط تطوير موقع إلكتروني متعدد الصفحات واللغات بتصميم احترافي على مستوى Stripe
> وواجهة تسويقية بأسلوب Google / Cloud Code / ZCODE

**الإصدار:** 1.0.0
**التاريخ:** 2026-08-25
**الحالة:** جاهز للتنفيذ

---

## 📋 جدول المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [البنية التحتية](#2-البنية-التحتية)
3. [الموقع التسويقي (Frontend)](#3-الموقع-التسويقى-frontend)
4. [لوحة التحكم (Admin Dashboard)](#4-لوحة-التحكم-admin-dashboard)
5. [لوحة المدراء (Manager Dashboard)](#5-لوحة-المدراء-manager-dashboard)
6. [لوحة فريق العمل (Team Dashboard)](#6-لوحة-فريق-العمل-team-dashboard)
7. [لوحة المستخدمين (User Dashboard)](#7-لوحة-المستخدمين-user-dashboard)
8. [لوحة المطورين (Developer Dashboard)](#8-لوحة-المطورين-developer-dashboard)
9. [نظام الاشتراكات والفوترة](#9-نظام-الاشتراكات-والفوترة)
10. [نظام إدارة المزوديين](#10-نظام-إدارة-المزوديين)
11. [نظام اللغات والتعريب](#11-نظام-اللغات-والتعريب)
12. [نظام الأمان والصلاحيات](#12-نظام-الأمان-والصلاحيات)
13. [تصميم الواجهة (UI/UX)](#13-تصميم-الواجهة-uiux)
14. [خريطة الصفحات](#14-خريطة-الصفحات)
15. [خريطة الشاشات](#15-خريطة-الشاشات)
16. [نظام API](#16-نظام-api)
17. [خطة الإطلاق](#17-خطة-الإطلاق)

---

## 1. نظرة عامة

### الرؤية
موقع إلكتروني احترافي متعدد اللغات يعمل كمنصة تسويقية شاملة لبرنامج Idexal IDE مع لوحة تحكم متقدمة على مستوى Stripe لإدارة المستخدمين والاشتراكات والمزوديين.

### الأهداف
- **تسويق احترافي**: تصميم بأسلوب Google/Cloud Code نظيف وأنيق
- **متعدد اللغات**: عربي + إنجليزي + فرنسي + ألماني + ياباني + صيني
- **لوحة تحكم شاملة**: إدارية + مدراء + فريق عمل + مستخدمين + مطورين
- **إدارة اشتراكات**: خطط متعددة مع فوترة تلقائية
- **إدارة مزوديين**: كل مزودي الذكاء الاصطناعي في نقطة مخصصة
- **قابلية توسع**: بنية مودولارية قابلة للتوسيع

### الفئات المستهدفة
| الفئة | الاحتياج |
|---|---|
| **المطورون** | IDE مجاني + اشتراكات متقدمة |
| **الشركات** | حلول مؤسسية + فريق عمل |
| **الم教育ون** | دورات + مواد تعليمية |
| **المستخدمون** | مساعدة ذكية + أدوات إنتاجية |

---

## 2. البنية التحتية

### التقنيات المقترحة

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Marketing + Dashboards)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js 14+ (App Router)                         │  │
│  │  ├── React 18+                                    │  │
│  │  ├── TypeScript 5+                                │  │
│  │  ├── Tailwind CSS 3+                              │  │
│  │  ├── shadcn/ui (Component Library)                │  │
│  │  ├── Framer Motion (Animations)                   │  │
│  │  ├── next-intl (i18n)                             │  │
│  │  └── Zustand (State Management)                   │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Backend (API + Auth + Database)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js API Routes / tRPC                        │  │
│  │  ├── Prisma ORM                                   │  │
│  │  ├── PostgreSQL (Primary DB)                      │  │
│  │  ├── Redis (Cache + Sessions)                     │  │
│  │  ├── NextAuth.js (Authentication)                 │  │
│  │  ├── Stripe (Payments)                            │  │
│  │  └── Resend (Email)                               │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Infrastructure                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Vercel (Hosting)                                  │  │
│  │  ├── Edge Functions (CDN)                          │  │
│  │  ├── PostgreSQL (Neon/Supabase)                    │  │
│  │  ├── Redis (Upstash)                               │  │
│  │  └── Cloudflare (CDN + WAF)                        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### هيكل المشروع

```
idexal-website/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/              # صفحات التسويق
│   │   │   ├── page.tsx              # الصفحة الرئيسية
│   │   │   ├── features/
│   │   │   ├── pricing/
│   │   │   ├── about/
│   │   │   ├── blog/
│   │   │   ├── docs/
│   │   │   └── contact/
│   │   ├── (dashboard)/              # لوحة التحكم
│   │   │   ├── admin/                # لوحة الإدارة
│   │   │   ├── manager/              # لوحة المدراء
│   │   │   ├── team/                 # لوحة فريق العمل
│   │   │   ├── user/                 # لوحة المستخدمين
│   │   │   └── developer/            # لوحة المطورين
│   │   ├── (auth)/                   # المصادقة
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── verify-email/
│   │   ├── api/                      # API Routes
│   │   └── [...slug]/                # صفحات ديناميكية
│   ├── components/
│   │   ├── ui/                       # مكونات أساسية (shadcn)
│   │   ├── marketing/                # مكونات التسويق
│   │   ├── dashboard/                # مكونات لوحة التحكم
│   │   ├── admin/                    # مكونات الإدارة
│   │   └── shared/                   # مكونات مشتركة
│   ├── lib/
│   │   ├── db.ts                     # Prisma Client
│   │   ├── auth.ts                   # NextAuth Config
│   │   ├── stripe.ts                 # Stripe Config
│   │   └── i18n.ts                   # i18n Config
│   ├── hooks/                        # React Hooks
│   ├── stores/                       # Zustand Stores
│   ├── types/                        # TypeScript Types
│   ├── validations/                  # Zod Schemas
│   └── config/                       # Configuration
├── prisma/
│   └── schema.prisma                 # Database Schema
├── public/
│   └── locales/                      # Translation Files
│       ├── en/
│       ├── ar/
│       ├── fr/
│       ├── de/
│       ├── ja/
│       └── zh/
└── docs/
    └── BLUEPRINT.md                  # هذا الملف
```

---

## 3. الموقع التسويقي (Frontend)

### الصفحة الرئيسية
```
┌─────────────────────────────────────────────────────────┐
│  Header (Navbar)                                         │
│  ├── Logo (Idexal)                                       │
│  ├── Navigation (Home, Features, Pricing, Docs, Blog)   │
│  ├── Language Switcher (EN | AR | FR | DE | JA | ZH)    │
│  ├── Login Button                                        │
│  └── Get Started Button (CTA)                            │
├─────────────────────────────────────────────────────────┤
│  Hero Section                                            │
│  ├── Headline: "The Future of Code"                      │
│  ├── Subtitle: "AI-Powered IDE for Every Developer"      │
│  ├── CTA: "Start Free" + "Watch Demo"                   │
│  └── Hero Image/Animation (IDE Preview)                  │
├─────────────────────────────────────────────────────────┤
│  Features Grid                                           │
│  ├── AI Code Assistant                                   │
│  ├── Multi-Language Support (7+ Languages)               │
│  ├── Built-in Terminal                                   │
│  ├── Git Integration                                     │
│  ├── Plugin System                                       │
│  └── Cross-Platform (Win/Mac/Linux)                      │
├─────────────────────────────────────────────────────────┤
│  Social Proof                                            │
│  ├── Statistics (10K+ Downloads, 5K+ Users, 100+ Plugins)│
│  ├── Testimonials                                        │
│  └── Company Logos                                        │
├─────────────────────────────────────────────────────────┤
│  Pricing Preview                                         │
│  ├── Free Tier                                           │
│  ├── Pro Tier                                            │
│  └── Enterprise Tier                                     │
├─────────────────────────────────────────────────────────┤
│  Blog Preview (Latest 3 Posts)                           │
├─────────────────────────────────────────────────────────┤
│  Newsletter Signup                                       │
├─────────────────────────────────────────────────────────┤
│  Footer                                                  │
│  ├── Product Links                                       │
│  ├── Company Links                                       │
│  ├── Resources                                           │
│  ├── Legal                                               │
│  └── Social Media                                        │
└─────────────────────────────────────────────────────────┘
```

### صفحات التسويق

| الصفحة | URL | المحتوى |
|---|---|---|
| **الرئيسية** | `/` | Hero + Features + Pricing + Testimonials |
| **المميزات** | `/features` | مفصلة لكل ميزة مع معاينات حية |
| **الأسعار** | `/pricing` | جدول مقارنة + FAQ + م计算器 |
| **المدونة** | `/blog` | مقالات تقنية + أخبار + دروس |
| **التوثيق** | `/docs` | API Docs + User Guides + Tutorials |
| **حولنا** | `/about` | قصة المشروع + الفريق + الرؤية |
| **تواصل معنا** | `/contact` | نموذج تواصل + خريطة + معلومات |
| **الشراكات** | `/partners` | شركاء النجاح + التكاملات |
| **الوظائف** | `/careers` | وظائف شاغرة + ثقافة العمل |
| **الشروط** | `/terms` | شروط الاستخدام |
| **الخصوصية** | `/privacy` | سياسة الخصوصية |
| **ال磕的权利** | `/cookies` | سياسة ملفات تعريف الارتباط |

---

## 4. لوحة التحكم (Admin Dashboard)

### البنية
```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard                                         │
├─────────────┬───────────────────────────────────────────┤
│  Sidebar    │  Content Area                              │
│  ├── Overview│  ┌─────────────────────────────────────┐  │
│  ├── Users  │  │  Breadcrumb + Page Title              │  │
│  ├── Subs   │  ├─────────────────────────────────────┤  │
│  ├── Finance│  │                                      │  │
│  ├── Providers│ │  Main Content                        │  │
│  ├── Analytics│ │  (Charts, Tables, Forms)             │  │
│  ├── Content│  │                                      │  │
│  ├── Security│ │                                      │  │
│  ├── Settings│ │                                      │  │
│  └── System │  └─────────────────────────────────────┘  │
├─────────────┴───────────────────────────────────────────┤
│  Footer (Version, Status, Support)                       │
└─────────────────────────────────────────────────────────┘
```

### شاشات الإدارة

#### 4.1 Overview (نظرة عامة)
```
┌─────────────────────────────────────────────────────────┐
│  📊 Dashboard Overview                                   │
├─────────┬─────────┬─────────┬─────────┬─────────────────┤
│ Users   │ Revenue │ Subs    │ API Calls│ Uptime          │
│ 12,453  │ $45,230 │ 3,210   │ 1.2M    │ 99.97%          │
│ +12% ↑  │ +8% ↑   │ +15% ↑  │ +23% ↑  │ ─               │
├─────────┴─────────┴─────────┴─────────┴─────────────────┤
│  📈 Revenue Chart (30 days)    │  👥 User Growth         │
│  [Area Chart]                  │  [Line Chart]           │
├────────────────────────────────┼─────────────────────────┤
│  🏢 Top Plans                  │  🌍 Geographic          │
│  [Horizontal Bar]              │  [World Map Heat]       │
├────────────────────────────────┼─────────────────────────┤
│  📋 Recent Activity            │  ⚠️ Alerts              │
│  [Activity Feed]               │  [Alert List]           │
└────────────────────────────────┴─────────────────────────┘
```

#### 4.2 User Management (إدارة المستخدمين)
```
┌─────────────────────────────────────────────────────────┐
│  👥 User Management                                      │
├─────────────────────────────────────────────────────────┤
│  🔍 Search + Filters (Role, Status, Date, Plan)         │
├─────────────────────────────────────────────────────────┤
│  ┌─────┬────────┬──────────┬────────┬───────┬────────┐  │
│  │ ID  │ Name   │ Email    │ Plan   │ Status│ Actions│  │
│  ├─────┼────────┼──────────┼────────┼───────┼────────┤  │
│  │ 1   │ Ahmed  │ a@...    │ Pro    │ Active│ ⋯     │  │
│  │ 2   │ Sara   │ s@...    │ Free   │ Active│ ⋯     │  │
│  │ 3   │ Omar   │ o@...    │ Ent.   │ Banned│ ⋯     │  │
│  └─────┴────────┴──────────┴────────┴───────┴────────┘  │
├─────────────────────────────────────────────────────────┤
│  Pagination: ← 1 2 3 ... 45 →                           │
├─────────────────────────────────────────────────────────┤
│  Bulk Actions: [Ban] [Change Plan] [Export] [Delete]    │
└─────────────────────────────────────────────────────────┘
```

**تفاصيل المستخدم (User Detail)**
```
┌─────────────────────────────────────────────────────────┐
│  👤 User: Ahmed Hassan                                   │
├─────────┬───────────────────────────────────────────────┤
│ Profile │  ┌─────────────────────────────────────────┐  │
│ Billing │  │  Avatar  │  Ahmed Hassan                │  │
│ Usage   │  │          │  ahmed@example.com            │  │
│ Activity│  │          │  Pro Plan • Since Jan 2026    │  │
│ Sessions│  │          │  [Edit] [Ban] [Impersonate]  │  │
│ API Keys│  └─────────────────────────────────────────┘  │
│         │                                               │
│         │  📊 Usage This Month                          │
│         │  ├── API Calls: 15,230 / 50,000              │
│         │  ├── Storage: 2.3 GB / 10 GB                 │
│         │  └── Compute: 45h / 100h                     │
│         │                                               │
│         │  💳 Billing History                           │
│         │  ├── Jan 2026: $29.00 ✓                      │
│         │  ├── Feb 2026: $29.00 ✓                      │
│         │  └── Mar 2026: $29.00 ✓                      │
│         │                                               │
│         │  📋 Recent Activity                           │
│         │  ├── Login from 192.168.1.1 (2h ago)         │
│         │  ├── Updated profile (1d ago)                 │
│         │  └── Created API key (3d ago)                 │
│         └───────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

#### 4.3 Subscription Management (إدارة الاشتراكات)
```
┌─────────────────────────────────────────────────────────┐
│  💰 Subscription Management                              │
├─────────────────────────────────────────────────────────┤
│  📊 Revenue Metrics                                      │
│  ├── MRR: $45,230 (+8%)                                 │
│  ├── ARR: $542,760                                      │
│  ├── Churn Rate: 2.3%                                   │
│  ├── ARPU: $14.10                                       │
│  └── LTV: $338.40                                       │
├─────────────────────────────────────────────────────────┤
│  📈 Revenue Chart                                        │
│  [Interactive Line/Area Chart with date range picker]    │
├─────────────────────────────────────────────────────────┤
│  📋 Active Subscriptions                                 │
│  ├── Pro: 2,100 (65%)                                   │
│  ├── Enterprise: 450 (14%)                              │
│  └── Free: 660 (21%)                                    │
├─────────────────────────────────────────────────────────┤
│  📊 Plan Distribution                                    │
│  [Donut Chart]                                           │
├─────────────────────────────────────────────────────────┤
│  🔔 Failed Payments                                      │
│  [Table with retry/notify actions]                       │
└─────────────────────────────────────────────────────────┘
```

#### 4.4 Financial Overview (نظرة مالية)
```
┌─────────────────────────────────────────────────────────┐
│  💵 Financial Dashboard                                  │
├─────────────────────────────────────────────────────────┤
│  Period: [This Month] [Last 30 Days] [This Year]        │
├─────────────────────────────────────────────────────────┤
│  📊 Key Metrics                                          │
│  ├── Total Revenue: $45,230                             │
│  ├── Subscriptions: $38,100                             │
│  ├── One-time Purchases: $7,130                         │
│  ├── Refunds: $230                                     │
│  └── Net Revenue: $45,000                               │
├─────────────────────────────────────────────────────────┤
│  📈 Revenue Trend                                        │
│  [Area Chart with date range]                            │
├─────────────────────────────────────────────────────────┤
│  💳 Payment Methods Distribution                         │
│  ├── Credit Card: 65%                                   │
│  ├── PayPal: 25%                                        │
│  └── Crypto: 10%                                        │
├─────────────────────────────────────────────────────────┤
│  📋 Transactions                                         │
│  [Sortable Table with export to CSV/Excel]               │
└─────────────────────────────────────────────────────────┘
```

#### 4.5 Content Management (إدارة المحتوى)
```
┌─────────────────────────────────────────────────────────┐
│  📝 Content Management                                   │
├──────────┬──────────────────────────────────────────────┤
│ Tabs:    │                                               │
│ Blog     │  ┌─────────────────────────────────────────┐  │
│ Pages    │  │  + New Post                             │  │
│ Docs     │  ├─────────────────────────────────────────┤  │
│ FAQ      │  │  Title         │ Status │ Author │ Date │  │
│ Changelog│  │  "New Feature" │ Draft  │ Ahmed  │ Today│  │
│          │  │  "AI Update"   │Published│ Sara  │ Yest.│  │
│          │  └─────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

#### 4.6 Security (الأمان)
```
┌─────────────────────────────────────────────────────────┐
│  🔒 Security Dashboard                                   │
├─────────────────────────────────────────────────────────┤
│  🚨 Active Threats: 0                                   │
│  🔐 2FA Adoption: 45%                                   │
│  🛡️ Blocked IPs: 23                                     │
│  📋 Audit Log Entries: 12,453                           │
├─────────────────────────────────────────────────────────┤
│  📋 Recent Security Events                               │
│  [Table with severity icons]                             │
├─────────────────────────────────────────────────────────┤
│  🔑 API Key Management                                   │
│  [List of all API keys with revoke/regenerate]           │
├─────────────────────────────────────────────────────────┤
│  📊 Security Score: 92/100                               │
│  [Progress Bar with recommendations]                     │
└─────────────────────────────────────────────────────────┘
```

---

## 5. لوحة المدراء (Manager Dashboard)

### الصلاحيات
- إدارة الفريق المعين
- مراجعة المحتوى
- دعم المستخدمين
- تقارير الأداء

### الشاشات
```
┌─────────────────────────────────────────────────────────┐
│  Manager Dashboard                                       │
├─────────────────────────────────────────────────────────┤
│  📊 My Team Overview                                     │
│  ├── Team Members: 12                                    │
│  ├── Active Tickets: 45                                  │
│  ├── Resolved This Week: 120                             │
│  └── Satisfaction Score: 4.8/5                           │
├─────────────────────────────────────────────────────────┤
│  📋 Team Performance                                     │
│  ┌──────┬────────┬────────┬────────┬────────┐           │
│  │ Name │ Tickets│ Avg Time│ Rating │ Status │           │
│  ├──────┼────────┼────────┼────────┼────────┤           │
│  │ Ali  │ 23     │ 2.1h   │ 4.9    │ 🟢    │           │
│  │ Noor │ 19     │ 1.8h   │ 4.7    │ 🟢    │           │
│  │ Zaid │ 31     │ 3.2h   │ 4.5    │ 🟡    │           │
│  └──────┴────────┴────────┴────────┴────────┘           │
├─────────────────────────────────────────────────────────┤
│  📊 Ticket Distribution                                  │
│  [Stacked Bar Chart by Category]                         │
├─────────────────────────────────────────────────────────┤
│  📋 Pending Reviews                                      │
│  [List of content/support tickets needing approval]      │
└─────────────────────────────────────────────────────────┘
```

---

## 6. لوحة فريق العمل (Team Dashboard)

### الصلاحيات
- عرض المهام المخصصة
- تسجيل الدخول/الخروج
- التقارير اليومية
- التواصل مع الفريق

### الشاشات
```
┌─────────────────────────────────────────────────────────┐
│  Team Dashboard                                          │
├─────────────────────────────────────────────────────────┤
│  👤 Profile: Ahmed Hassan — Frontend Developer           │
│  Status: 🟢 Online | Hours Today: 6.5h                  │
├─────────────────────────────────────────────────────────┤
│  📋 My Tasks                                             │
│  ├── [ ] Build Pricing Page UI          │ High  │ Due: Tomorrow│
│  ├── [x] Fix Login Bug                  │ Med   │ Done         │
│  ├── [ ] Write API Documentation        │ Low   │ Due: Friday  │
│  └── [ ] Review PR #234                 │ High  │ Due: Today   │
├─────────────────────────────────────────────────────────┤
│  📊 This Week                                            │
│  ├── Tasks Completed: 8/12                               │
│  ├── Hours Logged: 32/40                                 │
│  └── Code Reviews: 5                                     │
├─────────────────────────────────────────────────────────┤
│  📅 Calendar                                             │
│  [Weekly Calendar with meetings]                         │
├─────────────────────────────────────────────────────────┤
│  💬 Team Chat                                            │
│  [Mini chat interface]                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 7. لوحة المستخدمين (User Dashboard)

### الشاشات
```
┌─────────────────────────────────────────────────────────┐
│  User Dashboard                                          │
├─────────────┬───────────────────────────────────────────┤
│  Sidebar    │  Welcome, Ahmed! 👋                       │
│  ├── Home   │                                           │
│  ├── Profile│  📊 Quick Stats                           │
│  ├── Sub    │  ├── Projects: 5                          │
│  ├── Usage  │  ├── API Calls: 1,230 / 5,000            │
│  ├── API Keys│ │  ├── Storage: 1.2 GB / 5 GB           │
│  ├── Downloads││  └── Active Sessions: 2                │
│  ├── Billing│                                           │
│  ├── Support│  📈 Usage Chart                           │
│  └── Settings│ [30-day line chart]                      │
├─────────────┴───────────────────────────────────────────┤
│  📋 Recent Activity                                      │
│  ├── Downloaded Idexal IDE v1.0.0 (2 days ago)         │
│  ├── Generated API Key (5 days ago)                     │
│  └── Upgraded to Pro (1 month ago)                      │
└─────────────────────────────────────────────────────────┘
```

#### 7.1 Profile (الملف الشخصي)
```
┌─────────────────────────────────────────────────────────┐
│  👤 Profile Settings                                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  Name: Ahmed Hassan                       │
│  │  Avatar  │  Email: ahmed@example.com                 │
│  │  [Upload]│  Bio: Full-stack developer...             │
│  └──────────┘  Website: https://ahmed.dev               │
│                                                   [Save]│
├─────────────────────────────────────────────────────────┤
│  🔐 Security                                             │
│  ├── Change Password                                     │
│  ├── Two-Factor Authentication: [Enable]                 │
│  ├── Active Sessions                                     │
│  └── Delete Account                                      │
└─────────────────────────────────────────────────────────┘
```

#### 7.2 Downloads (التنزيلات)
```
┌─────────────────────────────────────────────────────────┐
│  📥 Downloads                                            │
├─────────────────────────────────────────────────────────┤
│  Your Platform: Windows x64 (detected)                  │
├─────────────────────────────────────────────────────────┤
│  📦 Available Downloads                                  │
│  ├── Idexal IDE v1.0.0 — Windows (.exe)    [Download]   │
│  ├── Idexal IDE v1.0.0 — Windows Portable  [Download]   │
│  ├── Idexal IDE v1.0.0 — macOS Intel       [Download]   │
│  ├── Idexal IDE v1.0.0 — macOS Apple Silicon[Download]  │
│  ├── Idexal IDE v1.0.0 — Linux AppImage    [Download]   │
│  └── Idexal IDE v1.0.0 — Linux DEB         [Download]   │
├─────────────────────────────────────────────────────────┤
│  📋 Download History                                     │
│  [Table with dates, versions, platforms]                 │
└─────────────────────────────────────────────────────────┘
```

---

## 8. لوحة المطورين (Developer Dashboard)

### الشاشات
```
┌─────────────────────────────────────────────────────────┐
│  Developer Dashboard                                     │
├─────────────┬───────────────────────────────────────────┤
│  Sidebar    │  🛠️ Developer Hub                         │
│  ├── Overview│                                           │
│  ├── API    │  📊 API Usage (30 days)                   │
│  ├── Keys   │  [Area Chart]                             │
│  ├── Plugins│                                           │
│  ├── SDKs   │  📦 Quick Actions                         │
│  ├── Docs   │  ├── Generate New API Key                 │
│  └── Playground│├── Test API Endpoint                   │
│             │  ├── View Plugin Stats                    │
│             │  └── Read Documentation                    │
├─────────────┴───────────────────────────────────────────┤
│  🔑 API Keys                                             │
│  ┌──────────┬────────────┬────────┬─────────┬────────┐  │
│  │ Name     │ Key        │ Last   │ Requests│ Actions│  │
│  ├──────────┼────────────┼────────┼─────────┼────────┤  │
│  │ prod-key │ sk-...8f2d │ 2h ago │ 12,340  │ ⋯     │  │
│  │ dev-key  │ sk-...a1b2 │ 1d ago │ 1,230   │ ⋯     │  │
│  └──────────┴────────────┴────────┴─────────┴────────┘  │
│  [+ Generate New Key]                                    │
├─────────────────────────────────────────────────────────┤
│  🎮 API Playground                                       │
│  ┌─────────────────────┬─────────────────────────────┐  │
│  │ Request              │ Response                    │  │
│  │ POST /api/v1/chat   │ {                           │  │
│  │ {                    │   "id": "chat-abc123",      │  │
│  │   "model": "gpt-4", │   "content": "Hello!",      │  │
│  │   "message": "Hi"   │   "tokens": 15              │  │
│  │ }                    │ }                           │  │
│  │ [Send Request]       │ Time: 234ms                 │  │
│  └─────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Plugin Developer Portal
```
┌─────────────────────────────────────────────────────────┐
│  🧩 Plugin Developer Portal                              │
├─────────────────────────────────────────────────────────┤
│  📊 My Plugins                                           │
│  ┌─────────┬──────────┬─────────┬────────┬─────────┐    │
│  │ Plugin  │ Installs │ Rating  │ Revenue│ Status  │    │
│  ├─────────┼──────────┼─────────┼────────┼─────────┤    │
│  │ ThemeX  │ 1,230    │ 4.8 ⭐ │ $450   │ Live    │    │
│  │ GitPro  │ 890      │ 4.6 ⭐ │ $320   │ Review  │    │
│  └─────────┴──────────┴─────────┴────────┴─────────┘    │
├─────────────────────────────────────────────────────────┤
│  📦 Submit New Plugin                                    │
│  ├── Plugin Name: [________________]                     │
│  ├── Description: [________________]                     │
│  ├── Version: [1.0.0]                                   │
│  ├── Price: [Free] [Custom: $___]                       │
│  ├── Upload Package: [Choose File]                       │
│  └── [Submit for Review]                                │
├─────────────────────────────────────────────────────────┤
│  💰 Earnings                                             │
│  ├── Total: $2,450                                      │
│  ├── This Month: $320                                    │
│  └── Pending Payout: $180                                │
└─────────────────────────────────────────────────────────┘
```

---

## 9. نظام الاشتراكات والفوكرة

### الخطط
```
┌─────────────────────────────────────────────────────────┐
│                    Pricing Plans                          │
├──────────────┬──────────────┬──────────────┬────────────┤
│   Free       │   Pro        │   Team       │ Enterprise │
│   $0/mo      │   $29/mo     │   $99/mo     │ Custom     │
├──────────────┼──────────────┼──────────────┼────────────┤
│ ✓ Basic IDE  │ ✓ Everything │ ✓ Everything │ ✓ Custom   │
│ ✓ 3 Projects │ ✓ Unlimited  │ ✓ 10 Users   │ ✓ Unlimited│
│ ✓ 1K API     │ ✓ 50K API    │ ✓ 200K API   │ ✓ Custom   │
│ ✓ Community  │ ✓ Priority   │ ✓ Admin      │ ✓ SLA      │
│              │ ✓ Plugins    │ ✓ Analytics  │ ✓ On-prem  │
│              │ ✓ AI Chat    │ ✓ SSO        │ ✓ Training │
│              │              │ ✓ Team Mgmt  │ ✓ Dedicated│
├──────────────┼──────────────┼──────────────┼────────────┤
│ [Get Started]│ [Start Trial]│ [Contact Us] │ [Contact]  │
└──────────────┴──────────────┴──────────────┴────────────┘
```

### مخطط الفوترة
```
┌─────────────────────────────────────────────────────────┐
│  💳 Billing System                                       │
├─────────────────────────────────────────────────────────┤
│  Integration: Stripe                                    │
├─────────────────────────────────────────────────────────┤
│  📋 Features                                            │
│  ├── Subscription management (create, update, cancel)   │
│  ├── Usage-based billing (metering)                     │
│  ├── Invoice generation (auto + manual)                 │
│  ├── Payment method management                          │
│  ├── Failed payment handling (retry + notifications)    │
│  ├── Proration (mid-cycle plan changes)                 │
│  ├── Tax calculation (Stripe Tax)                       │
│  ├── Coupon/discount codes                              │
│  └── Revenue recognition                                │
├─────────────────────────────────────────────────────────┤
│  🔄 Webhook Events                                       │
│  ├── invoice.paid                                       │
│  ├── invoice.payment_failed                             │
│  ├── customer.subscription.created                      │
│  ├── customer.subscription.updated                      │
│  ├── customer.subscription.deleted                      │
│  ├── payment_method.attached                            │
│  └── charge.refunded                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 10. نظام إدارة المزوديين

### النقطة المخصصة لكل مزود
```
┌─────────────────────────────────────────────────────────┐
│  🔌 Provider Management Hub                              │
├─────────────────────────────────────────────────────────┤
│  Each provider gets a dedicated management page:         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Provider: OpenAI                               │    │
│  │  ├── Status: 🟢 Active                          │    │
│  │  ├── API Key: sk-...****8f2d                    │    │
│  │  ├── Models:                                    │    │
│  │  │   ├── gpt-4o       [Active] [Configure]     │    │
│  │  │   ├── gpt-4        [Active] [Configure]     │    │
│  │  │   ├── gpt-3.5-turbo[Active] [Configure]     │    │
│  │  │   └── + Add Custom Model                     │    │
│  │  ├── Usage (30 days): 45,230 tokens             │    │
│  │  ├── Cost: $12.50                              │    │
│  │  ├── Fallback: Anthropic → Google               │    │
│  │  └── [Test Connection] [View Logs] [Settings]   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### قائمة المزوديين المدعومين
```
┌─────────────────────────────────────────────────────────┐
│  🌐 Supported Providers                                 │
├─────────────────────────────────────────────────────────┤
│  AI Providers:                                           │
│  ├── OpenAI (GPT-4o, GPT-4, GPT-3.5)                   │
│  ├── Anthropic (Claude 3.5, Claude 3)                   │
│  ├── Google (Gemini Pro, Gemini Flash)                  │
│  ├── Mistral (Mistral Large, Medium)                    │
│  ├── Cohere (Command R+, Command R)                     │
│  ├── DeepSeek (DeepSeek V3)                             │
│  ├── Groq (Llama 3.1, Mixtral)                          │
│  ├── Hugging Face (Open Models)                         │
│  ├── Ollama (Local Models)                              │
│  └── Custom (Any OpenAI-compatible API)                 │
├─────────────────────────────────────────────────────────┤
│  Embedding Providers:                                    │
│  ├── OpenAI (text-embedding-3)                          │
│  ├── Cohere (embed-english-v3)                          │
│  ├── Hugging Face (sentence-transformers)               │
│  └── Local (via Ollama)                                 │
├─────────────────────────────────────────────────────────┤
│  Search Providers:                                       │
│  ├── Serper (Google Search)                             │
│  ├── SerpAPI                                            │
│  ├── Bing Search                                        │
│  └── Tavily (AI Search)                                 │
├─────────────────────────────────────────────────────────┤
│  Embedding & Rerank:                                     │
│  ├── Cohere Rerank                                     │
│  ├── Jina Rerank                                       │
│  └── Cross-Encoder (Local)                              │
└─────────────────────────────────────────────────────────┘
```

### شاشة إعداد مزود مخصص
```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Configure Provider: Custom API                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Provider Name: [My Custom API          ]                │
│  Base URL:      [https://api.idexal.com/v1]             │
│  API Key:       [••••••••••••••••        ] [Show]       │
│                                                          │
│  Authentication:                                         │
│  (●) Bearer Token                                       │
│  ( ) API Key Header                                     │
│  ( ) Custom Header: [__________]                         │
│                                                          │
│  Models (auto-discovered):                               │
│  ├── idexal-pro     │ Chat ✓ │ Embedding ✓ │ $0.001/1K  │
│  ├── idexal-lite    │ Chat ✓ │ Embedding ✗ │ $0.0005/1K │
│  └── + Add Model Manually                               │
│                                                          │
│  Rate Limits:                                            │
│  ├── Requests/minute: [1000]                             │
│  ├── Tokens/minute:   [100000]                           │
│  └── Concurrent:      [50]                               │
│                                                          │
│  Fallback Chain:                                         │
│  1. This Provider (Custom)                               │
│  2. [OpenAI          ▼]                                  │
│  3. [Anthropic       ▼]                                  │
│                                                          │
│  [Test Connection]  [Save]  [Cancel]                     │
└─────────────────────────────────────────────────────────┘
```

---

## 11. نظام اللغات والتعريب

### اللغات المدعومة
| اللغة | الكود | الحالة |
|---|---|---|
| English | `en` | ✅ أساسي |
| العربية | `ar` | ✅ أساسي |
| Français | `fr` | 🔄 قيد التطوير |
| Deutsch | `de` | 🔄 قيد التطوير |
| 日本語 | `ja` | 📋 مخطط |
| 中文 | `zh` | 📋 مخطط |

### هيكل الترجمة
```json
{
  "nav": {
    "home": "Home",
    "features": "Features",
    "pricing": "Pricing",
    "docs": "Documentation",
    "blog": "Blog",
    "login": "Login",
    "getStarted": "Get Started"
  },
  "hero": {
    "title": "The Future of Code",
    "subtitle": "AI-Powered IDE for Every Developer",
    "cta": "Start Free",
    "demo": "Watch Demo"
  },
  "pricing": {
    "title": "Simple, Transparent Pricing",
    "free": "Free",
    "pro": "Pro",
    "team": "Team",
    "enterprise": "Enterprise"
  }
}
```

### RTL Support
```css
/* Automatic RTL support for Arabic */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] .sidebar {
  border-right: none;
  border-left: 1px solid var(--border);
}
```

---

## 12. نظام الأمان والصلاحيات

### أدوار المستخدمين
```
┌─────────────────────────────────────────────────────────┐
│  Role Hierarchy                                          │
│                                                          │
│  Super Admin ──► Admin ──► Manager ──► Team Member       │
│                   │                                        │
│                   └──► Developer ──► User                │
│                                                          │
│  Permissions Matrix:                                      │
│  ┌──────────────┬─────┬──────┬──────┬──────┬──────┐     │
│  │ Permission   │Super│Admin │Mgr   │Dev   │User  │     │
│  ├──────────────┼─────┼──────┼──────┼──────┼──────┤     │
│  │ Manage Users │ ✅  │ ✅   │ ❌   │ ❌   │ ❌   │     │
│  │ Manage Subs  │ ✅  │ ✅   │ ❌   │ ❌   │ ❌   │     │
│  │ View Revenue │ ✅  │ ✅   │ 📊  │ ❌   │ ❌   │     │
│  │ Manage Team  │ ✅  │ ✅   │ ✅   │ ❌   │ ❌   │     │
│  │ Manage Content│✅  │ ✅   │ ✅   │ ❌   │ ❌   │     │
│  │ Use API      │ ✅  │ ✅   │ ✅   │ ✅   │ ✅   │     │
│  │ Manage Keys  │ ✅  │ ✅   │ ✅   │ ✅   │ 🔑  │     │
│  │ View Profile │ ✅  │ ✅   │ ✅   │ ✅   │ ✅   │     │
│  └──────────────┴─────┴──────┴──────┴──────┴──────┘     │
└─────────────────────────────────────────────────────────┘
```

### ميزات الأمان
- **Authentication**: NextAuth.js (Email, Google, GitHub, Discord)
- **Authorization**: Role-Based Access Control (RBAC)
- **2FA**: TOTP (Google Authenticator, Authy)
- **Rate Limiting**: Per-user and per-API-key limits
- **CSRF Protection**: Built-in with Next.js
- **XSS Protection**: Content Security Policy (CSP)
- **SQL Injection**: Prisma parameterized queries
- **Encryption**: AES-256 for sensitive data at rest
- **Audit Logging**: All admin actions logged

---

## 13. تصميم الواجهة (UI/UX)

### الهوية البصرية
```
┌─────────────────────────────────────────────────────────┐
│  Brand Identity                                          │
├─────────────────────────────────────────────────────────┤
│  Colors:                                                 │
│  ├── Primary:    #0EA5E9 (Sky Blue)                     │
│  ├── Secondary:  #6366F1 (Indigo)                       │
│  ├── Accent:     #10B981 (Emerald)                      │
│  ├── Background: #0F172A (Dark) / #FFFFFF (Light)       │
│  ├── Surface:    #1E293B (Dark) / #F8FAFC (Light)       │
│  ├── Text:       #F8FAFC (Dark) / #0F172A (Light)       │
│  └── Muted:      #94A3B8                                │
├─────────────────────────────────────────────────────────┤
│  Typography:                                              │
│  ├── Headings: Inter / Cairo (Arabic)                    │
│  ├── Body:     Inter / Cairo (Arabic)                    │
│  └── Code:     JetBrains Mono                           │
├─────────────────────────────────────────────────────────┤
│  Design Principles:                                       │
│  ├── Clean & Minimal (like Stripe)                       │
│  ├── Dark Mode First                                     │
│  ├── Consistent Spacing (4px grid)                       │
│  ├── Subtle Animations (Framer Motion)                   │
│  ├── Accessible (WCAG 2.1 AA)                           │
│  └── Responsive (Mobile-First)                           │
└─────────────────────────────────────────────────────────┘
```

### مكونات UI الأساسية (shadcn/ui)
```
├── Button         (primary, secondary, ghost, destructive)
├── Input          (text, email, password, search)
├── Select         (single, multi, async)
├── Dialog         (modal, drawer, alert)
├── Dropdown Menu  (actions, navigation)
├── Table          (sortable, filterable, paginated)
├── Card           (stats, content, interactive)
├── Tabs           (horizontal, vertical)
├── Toast          (success, error, warning, info)
├── Tooltip        (hover, click)
├── Avatar         (image, initials, status)
├── Badge          (status, count, category)
├── Skeleton       (loading states)
├── Separator      (horizontal, vertical)
├── Scroll Area    (custom scrollbar)
├── Switch         (toggle)
├── Checkbox       (single, group)
├── Radio Group    (single, group)
├── Slider         (range, single)
├── Progress       (linear, circular)
├── Calendar       (date picker)
├── Popover        (content, form)
├── Command        (command palette)
├── Navigation Menu│
├── Accordion      │
├── Alert          │
├── Breadcrumb     │
├── Chart          │
├── Collapsible    │
├── Context Menu   │
├── Hover Card     │
├── Label          │
├── Menubar        │
├── Pagination     │
├── Resizable      │
├── Sheet          │
├── Sidebar        │
├── Table          │
└── Form           │
```

---

## 14. خريطة الصفحات

### كامل خريطة الموقع
```
/                                   # الصفحة الرئيسية
├── /features                       # المميزات
│   ├── /features/ai-assistant      # مساعد الذكاء الاصطناعي
│   ├── /features/multi-language    # دعم اللغات المتعددة
│   ├── /features/terminal          # التيرمينال المدمج
│   ├── /features/git               # تكامل Git
│   ├── /features/plugins           # نظام الإضافات
│   └── /features/cross-platform    # متعدد المنصات
├── /pricing                        # الأسعار
├── /blog                           # المدونة
│   ├── /blog/[slug]                # مقال محدد
│   └── /blog/category/[category]   # تصنيف محدد
├── /docs                           # التوثيق
│   ├── /docs/getting-started       # البدء السريع
│   ├── /docs/api                   # توثيق API
│   ├── /docs/plugins               # تطوير الإضافات
│   └── /docs/faq                   # الأسئلة الشائعة
├── /about                          # حولنا
├── /contact                        # تواصل معنا
├── /partners                       # الشركاء
├── /careers                        # الوظائف
├── /terms                          # الشروط
├── /privacy                        # الخصوصية
├── /cookies                        # ملفات تعريف الارتباط
├── /changelog                      # سجل التغييرات
├── /status                         # حالة النظام
│
├── /auth/                          # المصادقة
│   ├── /auth/login                 # تسجيل الدخول
│   ├── /auth/register              # إنشاء حساب
│   ├── /auth/forgot-password       # نسيت كلمة المرور
│   └── /auth/verify-email          # تأكيد البريد
│
├── /dashboard/                     # لوحة التحكم
│   ├── /dashboard                  # الرئيسية
│   ├── /dashboard/profile          # الملف الشخصي
│   ├── /dashboard/subscription     # الاشتراك
│   ├── /dashboard/billing          # الفوترة
│   ├── /dashboard/usage            # الاستخدام
│   ├── /dashboard/api-keys         # مفاتيح API
│   ├── /dashboard/downloads        # التنزيلات
│   ├── /dashboard/projects         # المشاريع
│   └── /dashboard/support          # الدعم
│
├── /admin/                         # لوحة الإدارة
│   ├── /admin                      # الرئيسية
│   ├── /admin/users                # المستخدمون
│   ├── /admin/users/[id]           # تفاصيل مستخدم
│   ├── /admin/subscriptions        # الاشتراكات
│   ├── /admin/finance              # المالية
│   ├── /admin/providers            # المزوديون
│   ├── /admin/providers/[id]       # تفاصيل مزود
│   ├── /admin/content              # المحتوى
│   ├── /admin/content/blog         # المدونة
│   ├── /admin/content/pages        # الصفحات
│   ├── /admin/analytics            # التحليلات
│   ├── /admin/security             # الأمان
│   ├── /admin/settings             # الإعدادات
│   └── /admin/system               # النظام
│
├── /manager/                       # لوحة المدراء
│   ├── /manager                    # الرئيسية
│   ├── /manager/team               # الفريق
│   ├── /manager/tickets            # التذاكر
│   ├── /manager/reviews            # المراجعات
│   └── /manager/reports            # التقارير
│
├── /developer/                     # لوحة المطورين
│   ├── /developer                  # الرئيسية
│   ├── /developer/api              # API
│   ├── /developer/api-keys         # مفاتيح API
│   ├── /developer/plugins          # الإضافات
│   ├── /developer/plugins/[id]     # تفاصيل إضافة
│   ├── /developer/plugins/submit   # تقديم إضافة
│   ├── /developer/sdk              # SDKs
│   ├── /developer/playground       # ملعب API
│   ├── /developer/docs             # التوثيق
│   └── /developer/earnings         # الأرباح
│
└── /api/                           # API Routes
    ├── /api/auth/[...nextauth]     # المصادقة
    ├── /api/users                   # المستخدمون
    ├── /api/subscriptions           # الاشتراكات
    ├── /api/providers               # المزوديون
    ├── /api/billing                 # الفوترة
    ├── /api/plugins                 # الإضافات
    ├── /api/analytics               # التحليلات
    └── /api/webhooks/stripe         # Stripe Webhooks
```

---

## 15. خريطة الشاشات

### ملخص الشاشات حسب القسم

| القسم | عدد الشاشات | الأولوية |
|---|---|---|
| **التسويق (Frontend)** | 12 | 🔴 عالية |
| **المصادقة** | 5 | 🔴 عالية |
| **لوحة المستخدم** | 9 | 🔴 عالية |
| **لوحة الإدارة** | 10 | 🔴 عالية |
| **لوحة المطورين** | 8 | 🟡 متوسطة |
| **لوحة المدراء** | 5 | 🟡 متوسطة |
| **لوحة فريق العمل** | 5 | 🟢 عادية |
| **API** | 10+ | 🔴 عالية |
| **المجموع** | **64+ شاشة** | |

---

## 16. نظام API

### هيكل API
```
Base URL: https://api.idexal.com/v1

Authentication:
  Authorization: Bearer <api_key>

Rate Limits:
  Free:      100 requests/minute
  Pro:       1,000 requests/minute
  Team:      5,000 requests/minute
  Enterprise: Custom
```

### endpoints الرئيسية
```
# Users
GET    /api/v1/users/me              # Current user profile
PUT    /api/v1/users/me              # Update profile
DELETE /api/v1/users/me              # Delete account

# Subscriptions
GET    /api/v1/subscriptions          # List plans
POST   /api/v1/subscriptions          # Create subscription
PUT    /api/v1/subscriptions/:id      # Update subscription
DELETE /api/v1/subscriptions/:id      # Cancel subscription

# Billing
GET    /api/v1/billing/invoices       # List invoices
GET    /api/v1/billing/invoices/:id   # Get invoice
POST   /api/v1/billing/payment-method # Add payment method

# API Keys
GET    /api/v1/api-keys               # List keys
POST   /api/v1/api-keys               # Create key
DELETE /api/v1/api-keys/:id           # Revoke key

# Providers
GET    /api/v1/providers              # List providers
POST   /api/v1/providers              # Add provider
PUT    /api/v1/providers/:id          # Update provider
DELETE /api/v1/providers/:id          # Remove provider
GET    /api/v1/providers/:id/models   # List models

# Plugins
GET    /api/v1/plugins                # List plugins
POST   /api/v1/plugins                # Submit plugin
GET    /api/v1/plugins/:id            # Get plugin
PUT    /api/v1/plugins/:id            # Update plugin

# Analytics
GET    /api/v1/analytics/usage        # Usage stats
GET    /api/v1/analytics/revenue      # Revenue stats
GET    /api/v1/analytics/users        # User stats

# Admin
GET    /api/v1/admin/users            # List all users
PUT    /api/v1/admin/users/:id        # Update user
PUT    /api/v1/admin/users/:id/role   # Change role
GET    /api/v1/admin/subscriptions    # All subscriptions
GET    /api/v1/admin/finance          # Financial data
```

---

## 17. خطة الإطلاق

### المراحل

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Foundation (الأسبوع 1-2)                       │
│  ├── Project setup (Next.js + Prisma + Tailwind)        │
│  ├── Database schema design                              │
│  ├── Authentication (NextAuth.js)                        │
│  ├── Design system (shadcn/ui components)                │
│  └── i18n setup (next-intl)                              │
├─────────────────────────────────────────────────────────┤
│  Phase 2: Marketing Site (الأسبوع 3-4)                   │
│  ├── Homepage (Hero + Features + Pricing)                │
│  ├── Features pages                                      │
│  ├── Pricing page with calculator                        │
│  ├── Blog with MDX                                       │
│  ├── Documentation                                       │
│  ├── About + Contact pages                               │
│  └── SEO optimization                                    │
├─────────────────────────────────────────────────────────┤
│  Phase 3: User Dashboard (الأسبوع 5-6)                   │
│  ├── Auth pages (Login, Register, etc.)                  │
│  ├── User profile                                        │
│  ├── Downloads page                                      │
│  ├── Subscription management                             │
│  ├── Billing & invoices                                  │
│  └── API key management                                  │
├─────────────────────────────────────────────────────────┤
│  Phase 4: Admin Dashboard (الأسبوع 7-8)                  │
│  ├── Admin overview with charts                          │
│  ├── User management (CRUD + roles)                      │
│  ├── Subscription management                             │
│  ├── Financial dashboard                                 │
│  ├── Content management                                  │
│  ├── Provider management                                 │
│  └── Security dashboard                                  │
├─────────────────────────────────────────────────────────┤
│  Phase 5: Developer Portal (الأسبوع 9-10)                │
│  ├── Developer dashboard                                 │
│  ├── API playground                                      │
│  ├── Plugin developer portal                             │
│  ├── SDK documentation                                   │
│  └── Earnings dashboard                                  │
├─────────────────────────────────────────────────────────┤
│  Phase 6: Advanced Features (الأسبوع 11-12)              │
│  ├── Analytics dashboard                                 │
│  ├── Manager dashboard                                   │
│  ├── Team dashboard                                      │
│  ├── Advanced reporting                                  │
│  ├── Export functionality (CSV/PDF)                      │
│  └── Real-time notifications                             │
├─────────────────────────────────────────────────────────┤
│  Phase 7: Polish & Launch (الأسبوع 13-14)                │
│  ├── Performance optimization                            │
│  ├── Security audit                                      │
│  ├── Accessibility audit (WCAG 2.1 AA)                  │
│  ├── Load testing                                        │
│  ├── Documentation finalization                          │
│  └── Deployment to production                            │
└─────────────────────────────────────────────────────────┘
```

### التقدير الزمني
| المرحلة | المدة | المخرجات |
|---|---|---|
| Phase 1 | أسبوعان | أساسيات المشروع |
| Phase 2 | أسبوعان | موقع تسويقي كامل |
| Phase 3 | أسبوعان | لوحة مستخدمين |
| Phase 4 | أسبوعان | لوحة إدارة |
| Phase 5 | أسبوعان | بوابة مطورين |
| Phase 6 | أسبوعان | ميزات متقدمة |
| Phase 7 | أسبوعان | تلميع وإطلاق |
| **المجموع** | **14 أسبوع** | **منتج كامل** |

---

## 📌 ملاحظات مهمة

1. **التكلفة التقريبية**: $5,000 - $15,000 (حسب حجم الفريق)
2. **الاستضافة**: Vercel (Frontend) + Neon/Supabase (DB)
3. **المدفوعات**: Stripe ($0.30 + 2.9% لكل معاملة)
4. **البريد**: Resend (100 يومي مجاني)
5. **التحليلات**: Plausible (محلل خصوصي) أو Vercel Analytics
6. **البحث**: Algolia (مجاني حتى 10K طلب شهرياً)
7. **الترجمة**: Crowdin أو POEditor للتعاون على الترجمة

---

**الموقع将会成为 Idexal IDE 的完整营销和管理平台，具有世界级的设计和功能。**

**The website will be a complete marketing and management platform for Idexal IDE with world-class design and functionality.**

---

> **آخر تحديث:** 2026-08-25
> **الإصدار:** 1.0.0
> **الحالة:** ✅ جاهز للتنفيذ
