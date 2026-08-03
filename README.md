# Idexal — Agentic IDE

بيئة تطوير وكيلية (Agentic IDE) حرة، بدون قيود، مبنية من الصفر — منافس لـ Claude Code
وCodex وAntigravity.

**التاريخ المعماري:** المشروع بدأ كفرع من VS Code (Code OSS)؛ في 2026-08-03 تم اتخاذ
قرار استراتيجي بالتخلي عن ذلك الأساس والبناء من الصفر بمكدس مستقل بالكامل، لتفادي وزن
وتعقيد قاعدة كود VS Code الضخمة والتحكم الكامل في كل طبقة من الهيكل. راجع
[docs/adr/0001-pivot-to-rust-electron.md](docs/adr/0001-pivot-to-rust-electron.md).

## البنية | Architecture

```
app/    غلاف سطح المكتب — Electron + TypeScript + محرر Monaco
cli/    أمر idexal للطرفية — غلاف Node بلا تبعيات حول النواة
core/   محرك الوكلاء — Rust، ثنائي مستقل، بروتوكول NDJSON عبر stdout
        ├─ config.rs    مزودون قابلون للتخصيص بالكامل + Fallback
        ├─ providers/   Anthropic + أي endpoint متوافق مع OpenAI
        ├─ agent.rs     حلقة استدعاء الأدوات
        ├─ tools.rs     أدوات الوكيل مع حماية المسار
        └─ memory.rs    ذاكرة طويلة الأمد (SQLite)
reference/  منطق مُثبَت من التطبيق السابق (Node)، مرجع تصميم فقط
```

## الميزات الحالية

- **متعدد المزودين بلا حدود** — أي endpoint متوافق مع OpenAI يُضاف من ملف إعدادات،
  بأولويته ونموذجه وترويساته الخاصة. بلا قائمة بيضاء، بلا إعادة تصريف.
- **Fallback تلقائي** — فشل مزود ← الانتقال للتالي، مع cooldown تصاعدي للمزود الفاشل.
- **يعمل بلا حساب** — Ollama محلي مُسجَّل دائماً كآخر خط، فالمنتج صالح بصفر مفاتيح.
- **أدوات حقيقية** — قراءة/كتابة ملفات، سرد مجلدات، تنفيذ أوامر، مع حماية تجاوز المسار.
- **ذاكرة طويلة الأمد** — SQLite دائم يعبر الجلسات، بدعم عربي كامل.
- **طرفية خاصة** — `idexal "<مهمة>"` من أي مكان.

`app/` و`core/` مستقلان تماماً عن بعضهما البعض في وقت التشغيل: الغلاف يستدعي الثنائي
كعملية فرعية ويتحاور معه عبر أسطر JSON (NDJSON) على stdout — نفس النمط الذي أثبت نجاحه
في التصميم الأول، معاد استخدامه هنا عبر حدود عملية مختلفة (Rust بدل Node) بدل ربط
مباشر عبر FFI/native addon (لتفادي مشاكل توافق ABI التي واجهناها سابقاً).

## البدء السريع | Quick start

```bash
# 1) نواة Rust
cd core && cargo build --release

# 2) التطبيق المكتبي
cd ../app
npm install
npm run build
npm start

# 3) الطرفية (من أي مكان)
node cli/bin/idexal.js "اشرح بنية هذا المشروع"
node cli/bin/idexal.js providers
```

**الإعدادات:** انسخ `idexal.config.example.json` إلى `~/.idexal/config.json` وعرّف
مزوديك. بلا أي إعداد: يُستخدم `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` إن وُجدا، وإلا
Ollama محلي بلا مفتاح.

## خارطة الطريق

راجع [ROADMAP.md](ROADMAP.md).

## الترخيص

MIT.
