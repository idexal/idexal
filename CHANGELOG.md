# سجل التغييرات | Changelog

## [Unreleased] — 2026-08-03: إعادة بناء من الصفر

### تغيير جذري | Breaking
- التخلي عن فرع VS Code (Code OSS) والبناء من الصفر بـ Electron + Rust. راجع
  [ADR 0001](docs/adr/0001-pivot-to-rust-electron.md) للسياق الكامل والمبررات.

### أُضيف | Added
- `core/` — نواة الوكلاء بلغة Rust (`idexal-core`)، ثنائي مستقل يبث أحداث NDJSON عبر
  stdout (`start`/`delta`/`done`/`error`) — نفس بروتوكول التصميم السابق. حالياً: بث
  تجريبي؛ تكامل المزودين الحقيقي لم يُبنَ بعد.
- `app/` — غلاف Electron + TypeScript + محرر Monaco مستقل، مع لوحة وكيل جانبية تستدعي
  `core/` عبر IPC وتعرض البث الحي.
- `reference/` — منطق `ai-core` و`cloud-provider` الأصلي (Node)، مُستخرَج من تاريخ Git
  كمرجع تصميم فقط، لإعادة بناء نفس المنطق (مزودون، Fallback، ذاكرة، أدوات) بلغة Rust.
- تشغيل مرئي أول ناجح: نافذة Electron باسم "Idexal" تعمل، تحمّل Monaco، ولوحة الوكيل
  تستدعي `idexal-core.exe` فعلياً وتعرض البث.

### بيئة التطوير | Dev environment
- تثبيت Rust toolchain (`rustup`, stable-x86_64-pc-windows-msvc) على هذا الجهاز —
  كان غائباً تماماً سابقاً.
