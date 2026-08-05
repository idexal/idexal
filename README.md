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

**فتح مشروع مباشرة:** `idexal <مجلد>` أو `IDEXAL_WORKSPACE=<مجلد>` يبدأ التطبيق
والمشروع مفتوح. الوكيل يرفض العمل بلا مساحة عمل — فهو يعدّل ملفات حقيقية، ولا
افتراض معقول لسؤال «أي كود أعدّل؟».

**الإعدادات:** انسخ `idexal.config.example.json` إلى `~/.idexal/config.json` وعرّف
مزوديك. بلا أي إعداد: يُستخدم `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` إن وُجدا، وإلا
Ollama محلي بلا مفتاح.

## حزمة قابلة للتثبيت | Packaging

```bash
cd core && cargo build --release   # المحرّك يُحزَم مع التطبيق، فلا بد من نسخة release
cd ../app && npm run package
```

المخرجات في `app/release/`: مثبِّت **NSIS**، و**نسخة محمولة** (ملف تنفيذي واحد بلا
تثبيت — أقرب لروح «حر وبلا عوائق» من مثبِّت). المحرّك (`idexal-core`) يُنسخ إلى
`resources/core/` بجانب التطبيق لا داخل الأرشيف: هو ثنائي مستقل يجب أن يبقى قابلاً
للتنفيذ والاستدعاء. `resolveCoreBinary()` يبحث هناك **أولاً**، فنسخة مثبَّتة لا
تلتقط أبداً شجرة بناء قديمة موجودة على الجهاز نفسه.

`npm run package:dir` يبني مجلداً غير مضغوط فقط — أسرع بكثير للتجربة.

## وثائق التصميم | Design Docs

المرجع التصميمي الكامل (الهيكل، الواجهة، الإعدادات، المزودون، الوكلاء، الصلاحيات،
الذاكرة، الطرفية) في [docs/design/](docs/design/README.md):

| الوثيقة | المحتوى |
|---|---|
| [01-architecture](docs/design/01-architecture.md) | البنية المعمارية وعقد NDJSON |
| [02-ui-layout](docs/design/02-ui-layout.md) | تصميم الواجهة والتوزيع على طراز ZCode |
| [03-settings](docs/design/03-settings.md) | صفحة الإعدادات الشاملة — كل شيء يُدار من البرنامج |
| [04-features](docs/design/04-features.md) | مصفوفة المميزات |
| [05-agents](docs/design/05-agents.md) | الوكلاء وأدوارهم |
| [06-providers](docs/design/06-providers.md) | المزودون والنماذج وFallback |
| [07-permissions](docs/design/07-permissions.md) | الصلاحيات والموافقات |
| [08-memory](docs/design/08-memory.md) | الذاكرة طويلة الأمد |
| [09-cli-terminal](docs/design/09-cli-terminal.md) | الطرفية وأمر idexal |

## مخططات التنفيذ لـ Claude Code | Execution Plans

مخططات تنفيذ جاهزة ليقرأها Claude Code وينفّذها حرفياً (أنت تخطط، هو ينفّذ) في
[docs/plans/](docs/plans/README.md):

| # | المخطط | الحالة |
|---|--------|--------|
| 001 | [صفحة الإعدادات الشاملة](docs/plans/001-settings-page.md) | ⬜ جاهز للتنفيذ |
| 002 | [Git تعديلي مع تأكيد](docs/plans/002-git-mutations.md) | ⬜ جاهز للتنفيذ |
| 003 | [تعدد مهام متزامنة](docs/plans/003-multi-task.md) | ⬜ جاهز للتنفيذ |
| 004 | [وكلاء فرعيون Subagents](docs/plans/004-subagents.md) | ⬜ جاهز للتنفيذ |
| 005 | [طرفية PTY حقيقية](docs/plans/005-pty-terminal.md) | ⬜ جاهز للتنفيذ |

## خارطة الطريق

راجع [ROADMAP.md](ROADMAP.md).

## الترخيص

MIT.
