# Idexal — خارطة الطريق (إعادة البناء بـ Rust + Electron)

> بدأ هذا المسار في 2026-08-03 بعد التخلي عن فرع VS Code. راجع
> [ADR 0001](docs/adr/0001-pivot-to-rust-electron.md) للسياق.

## ✅ ما اكتمل

| المكوّن | الحالة |
|---|---|
| هيكل المشروع (`app/`, `core/`, `reference/`) | ✅ |
| `core/idexal-core` — ثنائي Rust يبث NDJSON (تجريبي) | ✅ |
| `app/` — Electron + Monaco + لوحة وكيل متصلة بـ `core/` عبر IPC | ✅ |
| أول تشغيل مرئي ناجح للنافذة | ✅ |
| تثبيت Rust toolchain على بيئة التطوير | ✅ |

## المراحل التالية

### المرحلة 1 — محرك وكلاء Rust حقيقي
- [ ] طبقة مزودين حقيقية (HTTP + SSE): Anthropic، أي مزود متوافق مع OpenAI، محلي
      (Ollama/LM Studio) — باستخدام `reqwest` + parsing SSE، مستلهَمة من التصميم في
      `reference/ai-core-node-reference/src/providers/`.
- [ ] محرك Fallback بين المزودين (أولوية، cooldown، تراجع أسّي) — نفس منطق
      `reference/ai-core-node-reference/src/providers/registry.ts` بلغة Rust.
- [ ] ذاكرة طويلة المدى (SQLite عبر `rusqlite`) — نفس المخطط في
      `reference/ai-core-node-reference/src/memory/sqliteStore.ts`.
- [ ] أدوات الوكيل (قراءة/كتابة ملفات، أوامر طرفية، بحث) مع حماية تجاوز المسار — منطق
      `resolveInsideRoot` في `reference/ai-core-node-reference/src/tools/tools.ts` قابل
      للنقل شبه الحرفي.
- [ ] تنسيق وكلاء متعددين حقيقي (مخطط ← منفذون ← مراجع)، مع تنفيذ متوازٍ فعلي هذه
      المرة (كان ميزة غير مُفعّلة في النسخة السابقة).

### المرحلة 2 — المحرر
- [ ] تكامل Monaco كامل: عامل لغة (workers) للتمييز اللغوي والإكمال التلقائي.
- [ ] فتح/حفظ ملفات حقيقي (نظام ملفات عبر IPC، ليس مجرد نص ثابت).
- [ ] تبويبات متعددة، شجرة ملفات جانبية حقيقية.
- [ ] تكامل Git أساسي.

### المرحلة 3 — تجربة الوكيل
- [ ] Diff مرئي متدفق لتعديلات الوكيل مع قبول/تراجع.
- [ ] قائمة مهام حية (مثل ما كان موجوداً في `idexal-agent`/VS Code، بلا حاجة لـ VS Code
      نفسه الآن).
- [ ] طرفية مدمجة حقيقية.

### المرحلة 4 — التوزيع
- [ ] حزم Windows/macOS/Linux عبر Electron Builder.
- [ ] تحديث تلقائي.
- [ ] موقع idexal.com.

## بند توثيق دائم

كل قرار معماري جديد يُسجَّل كـ ADR في `docs/adr/`، وكل تغيير جوهري في `CHANGELOG.md` —
هذا الالتزام قائم بغض النظر عن أي تغيير في المكدس التقني.
