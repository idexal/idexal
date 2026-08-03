# سجل التغييرات | Changelog

يوثّق هذا الملف التغييرات الجوهرية على مشروع Idexal، مرحلة بمرحلة، بالتوازي مع
[ROADMAP.md](ROADMAP.md). التنسيق مستوحى من [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### أُضيف | Added
- تهيئة مستودع Git رسمي للمشروع (`git init`) + `.gitignore` مخصص لـ Idexal
  (`.freebuff/`, ملفات قاعدة بيانات `cloud-provider`).
- `docs/adr/` لتوثيق القرارات المعمارية بدءاً من قرار استخدام `idexal/ai-core` كنواة
  بدل حلقات CAPI الخاصة بـ GitHub Copilot.
- `CHANGELOG.md` هذا الملف.

### أُصلح | Fixed
- `idexal/cloud-provider`: حد الـ burst rate limit لم يكن يُطبَّق بشكل صحيح حسب فئة
  العميل (`key` مقابل `anon`) — العملاء المسجَّلون كانوا يُقيَّدون بنفس حد المجهولين.

### تغيّر | Changed
- `ROADMAP.md`: تصحيح عدد الاختبارات الفعلي (33 في `ai-core`، 10 في `cloud-provider`
  بدل 6 و8 المذكورين سابقاً)، وتوضيح أن تنفيذ الوكلاء المتعددين حالياً تسلسلي
  (sequential) وليس متوازياً رغم وجود إعداد `maxParallelAgents`.
