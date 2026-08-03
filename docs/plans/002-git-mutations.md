# المخطط 002 — Git تعديلي مع تأكيد صريح

> **المنفّذ**: Claude Code · **المخطط**: Idexal
> **المرجع التصميمي**: `docs/design/04-features.md` + `docs/design/07-permissions.md`

## الهدف

ترقية Git من "قراءة فقط" (status + diff) إلى عمليات تعديلية: **إضافة ملفات،
إيداع برسالة، وتحديد الحالة** — مع **تأكيد صريح من المستخدم قبل أي تغيير** على
المستودع. لا إعادة كتابة صامتة لأي مستودع.

## الوضع الحالي

- `app/src/main/terminal.ts` يحوي `git:status` و`git:diff` (قراءة فقط، عمداً).
- الواجهة: `app/src/renderer/index.ts` تعرض حالة Git + فروق ملوّنة في dock.
- وثيقة الصلاحيات (07) تنص: لا Git تعديلي حتى يوجد UI تأكيد.

## الخطوات

### الخطوة 1 — عمليات Git الآمنة في main

أضف إلى `app/src/main/terminal.ts` (بعد `git:diff`):

```ts
ipcMain.handle('git:stage', async (_e, file: string) => {
	// file = المسار الكامل من `git status --porcelain` (مثل "src/foo.ts" أو "??")
	const cwd = getWorkspaceRoot();
	if (!cwd) return { ok: false, error: 'no workspace open' };
	const clean = file.replace(/^"|"$/g, '');        // المسارات المقتبسة
	const args = clean.startsWith('?') ? ['add', clean.slice(3)] : ['add', clean.slice(2)];
	try { await execFileAsync('git', args, { cwd }); return { ok: true }; }
	catch (err) { return { ok: false, error: (err as Error).message }; }
});

ipcMain.handle('git:unstage', async (_e, file: string) => {
	const cwd = getWorkspaceRoot();
	if (!cwd) return { ok: false, error: 'no workspace open' };
	try { await execFileAsync('git', ['restore', '--staged', file.replace(/^"?\w\w /, '').replace(/^"|"$/g, '')], { cwd }); return { ok: true }; }
	catch (err) { return { ok: false, error: (err as Error).message }; }
});

ipcMain.handle('git:commit', async (_e, message: string) => {
	const cwd = getWorkspaceRoot();
	if (!cwd) return { ok: false, error: 'no workspace open' };
	if (!message.trim()) return { ok: false, error: 'commit message is empty' };
	try { await execFileAsync('git', ['commit', '-m', message.trim()], { cwd }); return { ok: true }; }
	catch (err) { return { ok: false, error: (err as Error).message }; }
});
```

> **قاعدة أمان**: `git:commit` لا يقبل سوى رسالة نصية من حقل واجهة — لا وسائط
> إضافية قابلة للحقن. لا `git push` ولا `git checkout`/`reset` في هذا المخطط
> (تأكيدها أخطر — مخطط لاحق أو قرار صريح).

### الخطوة 2 — جسر preload

في `app/src/preload/index.ts` ضمن `git: { ... }` أضف:
```ts
stage: (file: string) => ipcRenderer.invoke('git:stage', file),
unstage: (file: string) => ipcRenderer.invoke('git:unstage', file),
commit: (message: string) => ipcRenderer.invoke('git:commit', message),
```

### الخطوة 3 — واجهة Git

في `app/src/renderer/index.ts`:
- **تمييز الحالة**: أعد قراءة `git status --porcelain` — الـ state يحوي حرفين:
  `M ` (معدَّل غير مُضاف) مقابل `M ` بعد الإضافة يصبح `M ` في العمود الأول. أبسط
  نهج: استدعِ `git:status` الحالي وأضف `staged` علم لكل ملف (اقرأ الحرف الأول
  من الـ state — `A`/`M`/`D` في العمود الأول = مُضاف).
- **صف Git**: أضف زر صغير لكل ملف: `＋` إضافة / `－` إلغاء إضافة (حسب الحالة).
- **شريط إيداع** أعلى لوحة Git: حقل رسالة + زر `إيداع (Commit)` — قبل التنفيذ
  اعرض تأكيداً: `سيتم الإيداع بكل الملفات المُضافة. متابعة؟` بزري تأكيد/إلغاء.
- بعد كل عملية: `refreshGit()` فوراً (الواجهة حيّة، لا تحديث يدوي).

### الخطوة 4 — الأنواع

في `app/src/renderer/index.ts` (بلوك `declare global`):
```ts
git: {
	status: ... /* الموجود */;
	diff: ...;
	stage: (file: string) => Promise<{ ok: boolean; error?: string }>;
	unstage: (file: string) => Promise<{ ok: boolean; error?: string }>;
	commit: (message: string) => Promise<{ ok: boolean; error?: string }>;
};
```

## التحقق

```bash
cd app && npm run typecheck
cd app && npm run bundle
# يدوياً في مجلد Git حقيقي: عدّل ملفاً ← ＋ ← اكتب رسالة ← إيداع ← تحقق git log
# عكسياً: － ثم تأكيد الرفض لا يغيّر شيئاً
```

## معيار القبول

- [ ] إضافة ملف (＋) وإلغاء إضافة (－) يعملان ويُحدِّثان الواجهة فوراً.
- [ ] الإيداع يطلب تأكيداً صريحاً قبل التنفيذ، ولا يقبل رسالة فارغة.
- [ ] لا توجد أوامر push/checkout/reset — لا حتى مخفية.
- [ ] `typecheck` نظيف · `bundle` ناجح · كل سلوك git الحالي باقٍ.
- [ ] `ROADMAP.md` محدَّث (نقل Git من "قراءة فقط" إلى "تعديل مع تأكيد").
