# Idexal AI Core

> نواة الذكاء الاصطناعي لـ Idexal — **حرة، متعددة المزودين، متعددة الوكلاء، بذاكرة طويلة المدى**
> The AI engine of Idexal — **free, multi-provider, multi-agent, with long-term memory**.

## Why this is different | لماذا يختلف عن البقية

| الميزة | Idexal AI Core |
|---|---|
| المزودون | **متعددون** — Anthropic, OpenAI, OpenRouter, Groq, DeepSeek, Ollama, LM Studio + أي endpoint مخصص |
| Fallback | **تلقائي** — عند فشل مزود، ينتقل فوراً للمزود التالي مع backoff و health tracking |
| القيود | **صفر** — يعمل مع مزود محلي مجاني (Ollama) بدون أي مفتاح أو اشتراك |
| الوكلاء | **متعددون** — مخطط (Planner) → منفذون (Executors) → مراجع (Reviewer) |
| الذاكرة | **طويلة المدى** — SQLite محلي دائم (حقائق، قرارات، جلسات، تفضيلات) |
| التبعيات | **صفر** — يستخدم Node 24 المدمج (`node:sqlite`, `fetch`) |
| الحرية | المصدر مفتوح (MIT) — لا telemetry إلزامية، لا بوابات |

## Quick start | البدء السريع

```bash
# تشغيل الاختبارات (بدون أي مفتاح API)
cd idexal/ai-core
node src/test/core.test.ts

# عرض المزودين
node src/cli.ts providers

# تشغيل مهمة بالوكلاء المتعددين (يتطلب مفتاح أو Ollama محلي)
node src/cli.ts run "افحص هذا المشروع واكتب ملخصاً"
```

## Official CLI binding | الربط الرسمي مع أمر `idexal`

النواة مربوطة بأمر `idexal` الرسمي (CLI بـ Rust) — يعمل مباشرة كأوامر أصلية:

```bash
idexal run "افحص هذا المشروع واكتب ملخصاً"   # المخطط→المنفذون→المراجع
idexal agent                              # جلسة تفاعلية (بدون subcommand)
idexal ai providers                       # قائمة المزودين وحالتهم
idexal ai memory                          # إحصائيات الذاكرة
idexal ai config                          # الإعدادات الفعلية
idexal ai help                            # مساعدة AI Core
```

**خريطة الربط (Rust → Node):** `cli/src/commands/ai_core.rs` يحدد `node`
(عبر `$IDEXAL_NODE` ثم `$PATH`) و`cli.ts` (عبر `$IDEXAL_AI_CORE` ثم البحث
تصاعدياً من مجلد العمل/المشغّل)، ثم يشغّل `node <cli.ts> <args>` مع توريث
الطرفية. ملاحظة: `idexal agent host/ps/stop/kill/logs` تحتفظ بمعناها الأصلي
لإدارة Agent Host — فقط `idexal agent` المجردة تفتح جلسة AI Core التفاعلية.

## Idexal Cloud Provider | البوابة السحابية المجانية

النواة تتصل **افتراضياً بلا أي إعدادات** ببوابة `api.idexal.com` — شغّل
`idexal run "مهمة"` وسيعمل فوراً عبر الطبقة المجانية:

```bash
idexal ai cloud          # فحص حالة البوابة (نموذج، مفاتيح، قابلية الوصول)
idexal ai providers      # سترى idexal-cloud → ready بلا أي مفتاح
```

```jsonc
// ~/.idexal/config.json — اختياري تماماً
{
  "cloud": {
    "enabled": true,          // false = إزالة البوابة من القائمة
    "baseUrl": "https://api.idexal.com/v1",
    "apiKeyEnv": "IDEXAL_CLOUD_KEY",   // مفتاح مجاني اختياري يرفع الحصص
    "model": "idexal-1",
    "priority": 0
  }
}
```

- **صفر إعدادات**: البوابة مدمجة في `DEFAULT_PROVIDERS` — تعمل فور التثبيت.
- **حرية كاملة**: عطّلها (`enabled:false`) أو وجّهها لأي `baseUrl` (بوابة خاصة بك).
- **مفتاح اختياري**: `IDEXAL_CLOUD_KEY` يرفع الحصص — النواة لا تخزن المفتاح أبداً.
- **استمرارية**: فشل البوابة (429/503) → Fallback تلقائي لمزوداتك الأخرى.
- المواصفات الكاملة: [`idexal/cloud-provider/DESIGN.md`](../cloud-provider/DESIGN.md)

## Configuration | الإعدادات

انسخ `idexal.config.example.json` إلى `~/.idexal/config.json` أو `idexal.config.json`
في مجلد العمل، ثم عرّف مزوديك. كل مزود له `priority` — الأولوية الأقل تُجرب أولاً.

```json
{
  "providers": [
    { "id": "anthropic", "type": "anthropic", "model": "claude-sonnet-4-20250514", "apiKeyEnv": "ANTHROPIC_API_KEY", "priority": 1 },
    { "id": "ollama", "type": "openai-compatible", "baseUrl": "http://localhost:11434/v1", "model": "llama3.1", "priority": 2 }
  ]
}
```

**أنواع المزودين:**
- `anthropic` — واجهة Anthropic الرسمية
- `openai` / `openai-compatible` — أي مزود متوافق (OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Together, Ollama, LM Studio, vLLM…)
- `custom` — مزود مخصص كامل: `baseUrl` + `headers` + `extraBody` + تحويل الطلب

**Fallback التلقائي:** إذا فشل المزود الأساسي (خطأ، حد معدل 429، مهلة)، ينتقل المحرك
للمزود التالي تلقائياً مع تأخير تصاعدي ومراقبة صحة، ويتذكر أي مزود فشل لفترة cooldown.

## Architecture | البنية

```
src/
  providers/    طبقة المزودين (أنواع، HTTP، OpenAI-compatible، Anthropic، سجل، مصنع)
  memory/       الذاكرة طويلة المدى (SQLite + خدمة ذاكرة + recall دلالي)
  tools/        أدوات الوكيل (ملفات، أوامر طرفية، بحث) مع JSON Schema
  agents/       تنسيق الوكلاء المتعددين (خطط → تنفيذ → مراجعة)
  chat.ts       حلقة المحادثة مع استدعاء الأدوات
  cli.ts        واجهة الأوامر (run / agent / providers / memory / config)
  test/         اختبارات تعمل بـ Node مباشرة (بدون مفاتيح)
```

## Streaming | البث الكامل

كل المزودين يدعمون الآن **بثاً كاملاً (SSE)** مع أحداث تقدم حية:

```text
⇄ anthropic                ← بدء مزود (أو التبديل التلقائي عند الفشل)
Hello, wor…                ← نص يتدفق حرفاً بحرف
⚙ read_file({...})         ← استدعاء أداة أثناء تجميعه
· 120 in / 34 out          ← استهلاك التوكنز
```

- **OpenAI-compatible** (OpenAI, OpenRouter, Groq, DeepSeek, Ollama…): بث SSE مع
  تجميع `tool_calls` حسب المؤشر و`stream_options.include_usage` للاستهلاك.
- **Anthropic**: بث SSE الأصلي (`text_delta` + `input_json_delta` + `message_delta`).
- **Fallback أثناء البث**: إذا فشل مزود في منتصف البث (429/خطأ)، ينتقل المحرك
  تلقائياً للمزود التالي ويُصدر أحداث `provider` / `error` / `done` للمستخدم.
- استقبال الأحداث: `request.onStream` / خيار `onDelta` في `ChatLoop` و`Orchestrator`.

## Semantic memory | الاسترجاع الدلالي الحقيقي

الذاكرة طويلة المدى تستخدم الآن **Embeddings حقيقية** من أي مزود يدعمها
(أي OpenAI-compatible: OpenAI, OpenRouter, Groq, Ollama, LM Studio…):

- النصوص تُحوَّل لمتجهات (vectors) عبر `/embeddings` وتُخزَّن **مؤقتاً في SQLite**
  (`memory_embeddings`) — لا يُعاد تحويل النص نفسه إلا مرة واحدة.
- الاسترجاع: يُحوَّل الاستعلام مرة واحدة ثم تُرتَّب الذكريات بـ **cosine similarity**.
- **Fallback تلقائي**: إذا لم يوجد مزود Embeddings أو فشل الطلب، يعود المحرك
  للاسترجاع النصي (keyword) دون انقطاع.
- التكوين: `agent.semanticMemory` (افتراضياً `true`) و`agent.embeddingProvider`
  (تلقائياً: أول مزود يدعمها، ويُفضَّل `primaryProvider`).
- لكل مزود: `embeddingModel` لموديل مخصص (مثل `text-embedding-3-small` أو
  `nomic-embed-text` في Ollama).

## Roadmap داخل النواة | Core roadmap

- [x] بث (streaming) كامل لجميع المزودين مع أحداث تقدم
- [x] Embeddings لاسترجاع دلالي حقيقي من الذاكرة
- [ ] وكيل طرفية (Agent Terminal) يتحكم في أوامر حقيقية
- [ ] تكامل مع VS Code extension API (chat participant خاص بـ Idexal)
- [ ] حساب التكاليف لكل مزود + تقارير استخدام
