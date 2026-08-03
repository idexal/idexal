# Idexal Cloud Provider — التصميم والمواصفات

> بوابة مزود ذكاء اصطناعي **مجانية (freemium)** على `idexal.com` تتصل بها نواة Idexal
> افتراضياً **بلا أي إعدادات** — تُشغَّل النواة فوراً وتبدأ العمل، مع ترقية اختيارية
> بمفتاح مجاني للحصص الأعلى.
>
> A free (freemium) AI provider gateway at `idexal.com` that the Idexal core
> connects to by default with **zero configuration** — install, run, done.
> An optional free key unlocks higher quotas and better models.

---

## 1. الهدف | Mission

النواة الحالية تعمل بلا إعدادات **لكنها تحتاج مزوداً** (مفتاح أو Ollama محلي).
الهدف: مزود **سحابي افتراضي مدمج** يجعل التجربة «شغّلها وفقط»:

```text
قبل  ──  idexal run "مهمة"  →  "No providers configured / no key"
بعد  ──  idexal run "مهمة"  →  ✓ يعمل فوراً عبر api.idexal.com (بلا إعدادات)
```

| المبدأ | القيمة |
|---|---|
| صفر إعدادات | البوابة مسجَّلة افتراضياً في `config.ts` — لا شيء يلزم المستخدم |
| صفر بطاقة | طبقة مجانية بلا اشتراك؛ المفتاح اختياري ويرفع الحصص فقط |
| حرية | متوافقة مع OpenAI API — أي أداة (Ollama/LM Studio/curl) تستخدمها |
| خصوصية | لا تخزين للمفتاح في النواة؛ المفتاح في متغير بيئة فقط |
| استمرارية | البوابة تتراجع عن نفسها: فشل → Fallback تلقائي للمزودين الآخرين |

---

## 2. البنية | Architecture

```text
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│         Idexal Core         │        │         api.idexal.com           │
│  idexal/ai-core/src/config  │        │         (Cloud Gateway)          │
│                             │        │                                  │
│  registryFromConfig(cfg)    │  HTTP  │  /v1/models                     │
│      │                      │ ─────▶ │  /v1/chat/completions   (بث + عادي)│
│      ▼                      │        │  /v1/embeddings                 │
│  OpenAiCompatibleProvider   │ ◀───── │                                  │
│  (id: "idexal-cloud")       │        │  Router ──▶ مزودات المنبع        │
│  baseUrl: api.idexal.com/v1 │        │   ├── open-source hosted (Llama…)│
│                             │        │   ├── رصيد مجاني مُجمَّع         │
│                             │        │   └── (اختياري) BYOK: مفتاحك → مزودك│
└─────────────────────────────┘        └──────────────────────────────────┘
```

### 2.1 لماذا OpenAI-compatible؟ | Why OpenAI-compatible

النواة تدعم فعلاً `OpenAiCompatibleProvider` (بث + أدوات + Embeddings). بوابة
متوافقة مع هذا البروتوكول تعني:

- **صفر كود جسر** — المزود `idexal-cloud` يُنشأ عبر `createProvider` الموجود.
- **استفادة كاملة** من الميزات المنفَّذة سابقاً: البث (SSE)، استدعاء الأدوات،
  الـ usage، والاسترجاع الدلالي عبر `/v1/embeddings`.
- **مجانية الترخيص**: يعمل أي عميل OpenAI-compatible (كود بسيط، curl، تطبيقات).

### 2.2 مكوّنات البوابة (Server) | Gateway components

```text
api.idexal.com
├── edge (Cloudflare/CDN)        — TLS, rate-limit مبكر، جدار حماية
├── gateway (Node 24 / Hono)     — توجيه، مصادقة، حصص، تحويل البروتوكول
│   ├── POST /v1/chat/completions
│   ├── POST /v1/embeddings
│   ├── GET  /v1/models
│   └── GET  /healthz
├── router                       — اختيار المنبع حسب النموذج والحصة والطلب
├── quota store (SQLite/Redis)   — عدادات يومية لكل هوية مجهولة/مفتاح
└── upstream adapters            — OpenAI / Anthropic / local vLLM / aggregators
```

---

## 3. نموذج العمل المجاني | Freemium model

| | الطبقة المجانية (افتراضي) | الطبقة المسجَّلة (مفتاح مجاني) |
|---|---|---|
| التسجيل | لا شيء — هوية مجهولة | `idexal.com/cloud` → مفتاح `IDEXAL_CLOUD_KEY` |
| الحصص اليومية | ~200 طلب / 50k توكن خرج | ~2,000 طلب / 500k توكن |
| النماذج | نماذج مفتوحة متوسطة (Llama/Qwen) | النماذج نفسها + أولوية صف |
| البث | متاح | متاح (أولوية أعلى) |
| Embeddings | متاح (حصة أصغر) | متاح |
| التسعير | **مجاني للأبد** | مجاني — يرتفع بالسعة فقط |

> **الضمانات:** لا نبيع بيانات المستخدمين؛ نكشف في شروط الاستخدام أن الطلبات
> المجهولة تُعالج على بنية تحتية مشتركة. **لا نشترط بطاقة ائتمان** أبداً للطبقة المجانية.

### 3.1 اقتصاديات التكلفة | Cost economics

لتستمر «مجانياً للأبد»:

1. **نماذج مفتوحة مكيفة (quantized)** مستضافة على بنية مشتركة (vLLM/llama.cpp
   مع `batched inference`).
2. **تجميع حصص مجانية من المنبع** (free tiers الخاصة بمزودات الاستضافة) كطبقة
   ثانية بتكلفة صفر.
3. **تقنين الـ batch**: نموذج واحد يخدم مئات الطلبات — تكلفة هامشية ~صفر.
4. **BYOK (Bring Your Own Key)**: المستخدمون ذوو الحصص العالية يمررون مفتاحهم
   عبر بوابة تحويل — تكلفة على المستخدم، بلا انقطاع تجربة.

---

## 4. عقد API | API contract

كل النقاط متوافقة مع OpenAI. الأساس `https://api.idexal.com/v1`.

### 4.1 المصادقة | Auth

```text
رؤوس اختيارية:
  Authorization: Bearer <IDEXAL_CLOUD_KEY>   ← مفتاح مسجَّل (يرفع الحصص)
  X-Idexal-Device: <معرّف مجهول مستمر>       ← هوية مجهولة (تُولَّد وتُخزَّن محلياً)

بدون أي من الاثنين: تعمل البوابة بهوية مجهولة مؤقتة (حصص أقل).
```

### 4.2 نقاط النهاية | Endpoints

| Method | Path | الوصف |
|---|---|---|
| `GET` | `/v1/models` | قائمة النماذج المتاحة (لـ `idexal ai cloud status`) |
| `POST` | `/v1/chat/completions` | محادثة — يدعم `stream: true` و `tools` و `tool_choice` |
| `POST` | `/v1/embeddings` | متجهات دلالية (للاسترجاع الدلالي للذاكرة) |
| `GET` | `/healthz` | حالة البوابة (للاستكشاف) |

### 4.3 الردود والترميزات | Responses & codes

```text
200  نجاح (JSON أو SSE عند stream)
429  تجاوز الحصة/rate limit  → النواة تفعّل Fallback تلقائياً
401  مفتاح خاطئ
503  المنبع مشغول          → النواة تعيد المحاولة/تنتقل لمزود آخر
```

> **مهم للاستمرارية:** 429/503 تُعامل كمصنّفة `isRetryableError` في النواة،
> فينتقل المحرك لمزود المستخدم التالي بسلاسة دون أخطاء ظاهرة.

### 4.4 النماذج الافتراضية | Default models

```text
idexal-1            → توجيه ذكي للنموذج المفتوح المتاح (Llama-3.3-70B-class)
idexal-1-fast       → نموذج صغير سريع (للـ planner/reviewer)
idexal-embed-1      → موديل embeddings (نموذج افتراضي في الطبقة المجانية)
```

---

## 5. الأمان والخصوصية | Security & privacy

| التهديد | الحماية |
|---|---|
| إساءة استخدام مجانية (spam) | rate limit لكل هوية + CAPTCHA عند التسجيل (**مخطَّط، غير مُنفَّذ بعد** — انظر تحذير أدناه) + حصص يومية |
| سرقة المفتاح | لا نخزنه في النواة أبداً (متغير بيئة)، TLS إلزامي، لا نطبعه في السجلات |
| تتبع الهوية المجهولة | `X-Idexal-Device` = دالة تجزئة (SHA-256) لمعرّف محلي — غير قابل للعكس |
| حقن عبر الطلبات | تعقيم الحمولات، لا `eval`، كل الإدخال JSON مشدود النوع |
| انقطاع البوابة | النواة تعتمد Fallback التلقائي → تجربة المستخدم لا تنكسر |
| تجاوز الحصة عمداً | عدادات يومية على مستوى الهوية + IP + بصلية |

> ⚠️ **فجوة معروفة (قبل النشر العام):** التجزئة نفسها (SHA-256) غير قابلة للعكس، لكن
> **مُدخلها** غير مُحقَّق حالياً — أي عميل يستطيع إرسال قيمة عشوائية جديدة في ترويسة
> `X-Idexal-Device` مع كل طلب فيحصل على حصة يومية جديدة في كل مرة، وبالمثل يُشتق
> fallback الهوية المجهولة من `X-Forwarded-For` (`src/auth.ts:clientIp`) دون التحقق من
> أن الطلب قادم فعلاً من وكيل موثوق يُنقّي هذه الترويسة، فهي قابلة للتزييف من أي عميل
> مباشر. **الأثر عملياً معدوم حالياً** لأن `api.idexal.com` غير منشورة بعد (M3 أدناه لم
> يبدأ)، لكن **يجب** إغلاق هذه الفجوة (CAPTCHA/proof-of-work حقيقي عند أول طلب، أو
> رفض `X-Forwarded-For` ما لم يكن الطلب من عنوان proxy معروف) قبل أي نشر علني للبوابة —
> هذا بند مانع (blocker) في خارطة الطريق (M3 أدناه)، وليس مجرد تحسين مستقبلي.

---

## 6. خطة تكامل البوابة في config.ts | Integration plan

### 6.1 الشكل النهائي للمستخدم

```jsonc
// ~/.idexal/config.json  (اختياري — لا شيء مطلوب للعمل!)
{
  "cloud": {
    "enabled": true,          // false = إزالة البوابة نهائياً من القائمة
    "baseUrl": "https://api.idexal.com/v1",
    "apiKeyEnv": "IDEXAL_CLOUD_KEY",
    "model": "idexal-1",
    "priority": 0             // 0 = تُجرَّب أولاً (الافتراضي بلا إعدادات)
  },
  "providers": [ /* مزودات المستخدم تبقى وتُفضَّل حسب priority */ ]
}
```

### 6.2 سلوك التكوين | Config behavior

1. **بلا أي ملف إعدادات:** البوابة مُدرجة افتراضياً في `DEFAULT_PROVIDERS`
   (id: `idexal-cloud`) — النواة تبدأ وتتصل بـ `api.idexal.com` فوراً.
2. **تخصيص:** قسم `cloud` يدمج فوق الافتراضي (baseUrl/model/priority/apiKeyEnv).
3. **تعطيل:** `cloud.enabled: false` يزيل `idexal-cloud` من القائمة النهائية —
   دون أن يمس مزودات المستخدم.
4. **أولوية المستخدم:** مزودات المستخدم بقيم `priority` أصغر تُجرَّب أولاً؛
   البوابة تبقى شبكة أمان افتراضية بترتيب `priority: 0` إن لم تُضبط.
5. **توسيع البيئة:** `baseUrl` و `apiKeyEnv` يدعمان `${VAR}` عبر `expandEnv`
   الموجود — البوابة تلتقط متغيرات `IDEXAL_CLOUD_*` تلقائياً.

### 6.3 أين يُنفَّذ (نقاط التغيير المقترحة)

| الملف | التغيير |
|---|---|
| `idexal/ai-core/src/config.ts` | `CloudConfig` + `DEFAULT_CLOUD` + تطبيق `cloud` بعد الدمج وقبل `expandEnv` |
| `idexal/ai-core/src/providers/factory.ts` | تمرير `timeoutMs` (بوابة قد تستغرق أكثر تحت الضغط) |
| `idexal/ai-core/src/providers/openaiCompat.ts` | احترام `timeoutMs` في `chat`/`stream`/`embed` |
| `idexal/ai-core/src/cli.ts` | أمر `cloud status` (GET /v1/models + /healthz) وعرض الحالة في `providers` |
| `idexal/ai-core/idexal.config.example.json` | توثيق قسم `cloud` |
| `idexal/ai-core/src/test/core.test.ts` | اختبارات: تكوين السحابة + عميل بوابة عبر خادم محلي |

### 6.4 أولويات الاستحقاق | Ship order

1. **M0 — تسجيل افتراضي:** البوابة في `DEFAULT_PROVIDERS` تعمل بلا إعدادات.
2. **M1 — تخصيص/تعطيل:** قسم `cloud` كامل (تم/تعطيل/توجيه/مفتاح).
3. **M2 — الحالة:** `idexal ai cloud status` يعرض النماذج والحصة والأمان.
4. **M3 — قياس:** حصص يومية، تقارير استخدام، لوحة `idexal.com/cloud/dashboard`.
5. **M4 — BYOK:** تحويل مفتاح المستخدم عبر البوابة (اختياري).

---

## 7. خارطة الطريق | Roadmap

- [x] M0: تسجيل `idexal-cloud` افتراضياً بلا إعدادات (config.ts)
- [x] M1: قسم `cloud` (تمكين/تعطيل/تخصيص) + `timeoutMs`
- [x] M2: `idexal ai cloud status` + عرض حالة البوابة في `idexal ai providers`
- [x] **خادم البوابة الفعلي** (`idexal/cloud-provider`): Node 24 native (بلا اعتماديات) + SQLite
- [x] إصلاح حد الـ burst rate limit ليُطبَّق فعلياً حسب فئة الهوية (كان ثابتاً على حد
      المجهولين لكل العملاء بسبب متغير محسوب وغير مُستخدم في `enforceBurst`)
- [ ] **(مانع نشر)** إغلاق فجوة تزييف الهوية المجانية (`X-Idexal-Device` / `X-Forwarded-For`
      غير موثَّقين) — راجع تحذير الأمان أعلاه
- [ ] نشر البوابة على `api.idexal.com` (استضافة + TLS + CDN)
- [ ] لوحة تسجيل `idexal.com/cloud` (مفتاح مجاني + حصص)
- [ ] تجميع حصص المنبع المجانية + BYOK
- [ ] تقارير استخدام وتنبيهات حصص في النواة

### 7.1 ما نُفِّذ في خادم البوابة | What shipped

- **نقاط كاملة**: `/healthz`، `/v1/models`، `/v1/chat/completions` (JSON + SSE بث)،
  `/v1/embeddings` — كلها بصيغة OpenAI المتوافقة مع عميل النواة الحالي.
- **طبقة freemium مجهولة**: هوية `SHA-256` للجهاز/IP بلا عكس، حصص يومية عبر
  SQLite (طلبات/توكنات/تضمينات) + محدِّد انفجار (burst) لكل دقيقة، و`429`
  برموز قابلة لإعادة المحاولة (تلتقطها النواة كـ `isRetryableError`).
- **مفاتيح مسجَّلة**: `Authorization: Bearer` يرفع الطبقة (حصص أعلى)؛ مفتاح
  غير معروف → `401`.
- **توجيه مع fallback**: `UPSTREAM_PRIORITY` (افتراضياً ollama → openai →
  anthropic)، فشل منبع → تجربة التالي، كلها فشلت → `503` قابل لإعادة المحاولة.
- **محوّلات المنبع**: OpenAI-compatible (تمرير بث شفاف)، وAnthropic بترجمة
  بروتوكول كاملة (الطلبات ← Messages API، أحداث SSE الخاصة بها ← قطع OpenAI)،
  وOllama بلا مفتاح (محادثة + تضمينات).
- **التحقق**: 11 اختباراً تكاملياً (health/models، محادثة JSON + SSE، ترجمة
  Anthropic، تضمينات، 401، 429، حد burst لكل فئة، تسوية الحصة، fallback، بث
  استدعاء أدوات Anthropic) + E2E حي: النواة → البوابة المحلية →
  منبع stub، بمهمة كاملة متعددة الوكلاء مع بث وتتبع استخدام. تشغيل:
  `cd idexal/cloud-provider && npm start` (أو `node --experimental-strip-types src/server.ts`).

---

## 8. ملاحظات الترخيص | Licensing notes

- نواة Idexal: MIT (مفتوحة).
- خادم البوابة: ملكية Idexal (الخدمة نفسها) — لكن مواصفات البروتوكول مفتوحة
  ومتوافقة مع OpenAI API، فأي شخص يستطيع تشغيل «بوابة Idexal» خاصة به عبر
  `baseUrl` مخصص في الإعدادات (حرية كاملة بلا قيود).
