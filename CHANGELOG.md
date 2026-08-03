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
- `package.json`: تعطيل سكربت postinstall الخاص بـ `foundry-local-sdk` عبر `allowScripts`
  (نفس نمط الحزم الأخرى المعطَّلة مسبقاً في نفس القائمة) — سكربته يحاول تنزيل ثنائيات
  عبر NuGet/Azure DevOps، وهما نطاقان غير قابلين للوصول من بيئة التطوير الحالية. الحزمة
  نفسها لديها بالفعل تراجعاً تلقائياً سليماً (patch عند التثبيت: "on-demand native
  runtime override") فلا يوجد أثر وظيفي لتعطيل السكربت.
- علامة تجارية: `licenseUrl`/`serverLicenseUrl` في `product.json` و`author` في
  `package.json` (موثَّق سابقاً في هذا الملف — أُضيف هنا للتسلسل الزمني).

### ملاحظات بيئة التطوير | Dev environment notes
- Node المثبَّت محلياً `v24.13.0` أقل من المطلوب في `.nvmrc` (`24.18.0`) — تم تجاوز
  فحص `preinstall.ts` عبر `VSCODE_SKIP_NODE_VERSION_CHECK=1` (آلية تجاوز رسمية مدمجة في
  السكربت نفسه، وليست تعديلاً في الكود). يُنصح بترقية Node لاحقاً لمطابقة `.nvmrc` تماماً.
- محلل DNS المحلي لبيئة التطوير غير مستقر لنطاقات جديدة غير مخزَّنة مسبقاً (فشل عشوائي
  للمحاولة الأولى)، ما تسبب بفشل متقطع لخطوة تنزيل رؤوس Electron الأصلية
  (`artifacts.electronjs.org`) عبر `node-gyp`. تم حله بإعادة محاولة `npm install` مع
  تسخين DNS مسبق — نجح بعد محاولتين. لا حاجة لأي تغيير دائم في إعدادات الشبكة.
- `npm audit` يُبلغ عن 23 ثغرة (14 متوسطة، 9 عالية) في شجرة الاعتماديات — لم تُراجَع
  بعد بعمق، بند مستقبلي قبل أي نشر عام (راجع التقرير الشامل في `docs/reports/`).
