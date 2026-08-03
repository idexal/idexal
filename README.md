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
core/   محرك الوكلاء — Rust، ثنائي مستقل، بروتوكول NDJSON عبر stdout
reference/  منطق مُثبَت من التطبيق السابق (Node)، يُستخدم كمرجع تصميم فقط
            أثناء بناء core/ — ليس جزءاً من التطبيق الفعّال
```

`app/` و`core/` مستقلان تماماً عن بعضهما البعض في وقت التشغيل: الغلاف يستدعي الثنائي
كعملية فرعية ويتحاور معه عبر أسطر JSON (NDJSON) على stdout — نفس النمط الذي أثبت نجاحه
في التصميم الأول، معاد استخدامه هنا عبر حدود عملية مختلفة (Rust بدل Node) بدل ربط
مباشر عبر FFI/native addon (لتفادي مشاكل توافق ABI التي واجهناها سابقاً).

## البدء السريع | Quick start

```bash
# 1) نواة Rust
cd core && cargo build

# 2) التطبيق
cd ../app
npm install
npm run build
npm start
```

## خارطة الطريق

راجع [ROADMAP.md](ROADMAP.md).

## الترخيص

MIT.
