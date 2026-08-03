# المخطط 005 — طرفية PTY حقيقية

> **المنفّذ**: Claude Code · **المخطط**: Idexal
> **المرجع التصميمي**: `docs/design/09-cli-terminal.md`

## الهدف

ترقية الطرفية المدمجة من "stdio مأنبوب" (بلا curses ولا تحكم مهام) إلى **PTY
حقيقية**: برامج تفاعلية (vim، htop، تقاويم، REPLs)، تحكم مهام، إشارات صحيحة،
وتغيير حجم صحيح. **تتطلب وحدة أصلية** — هذا مقصود وموثّق في التصميم.

## الوضع الحالي

- `app/src/main/terminal.ts` — `terminal:start/write/stop` عبر `spawn(cmd, args)`
  بسيط بلا PTY. الواجهة تعرض نصاً فقط (`#terminal-output` + سطر إدخال).
- الواجهة: `app/src/renderer/index.ts` — إدخال سطر واحد، بلا معالجة ANSI كاملة.

## قرار التصميم (اقرأه قبل التنفيذ)

نموذجان مقبولان في Electron:

1. **@lydell/node-pty** — الأكثر شيوعاً، يستخدمه VS Code (فورمته الداخلية).
2. **node-pty** الأصلي — قديم أحياناً ضد Electron الحديثة.

> **الاختيار الموصى به: `@lydell/node-pty`** (مُصان، متوافق مع Electron 33).
> يجب إعادة بناء الوحدة ضد رؤوس Electron (مشكلة ABI) — استخدم:
> ```bash
> cd app && npm install @lydell/node-pty
> npx electron-rebuild -f -w @lydell/node-pty   # أو @electron/rebuild
> ```
> **تحذير**: إذا فشل البناء ضد Electron على هذا الجهاز، سجّل المشكلة في
> CHANGELOG ولا تكسر التطبيق — احتفظ بالمسار القديم كخيار تراجع (`usePty: false`).

## الخطوات

### الخطوة 1 — ترقية main/terminal.ts

- أضف إعداداً `usePty` في الإعدادات (افتراضي true إن وُجدت الوحدة، وإلا false).
- في `terminal:start`:
  - عند `usePty`: أنشئ PTY بـ `pty.spawn(shell, args, { cwd, env, cols, rows })`.
  - اربط `onData` → نفس قناة `terminal:data:<id>` الموجودة (لا تغيير على الواجهة).
  - اربط `onExit` → `terminal:exit:<id>` (موجود).
- أضف `terminal:resize` (cols, rows) → `pty.resize()`.
- أبقِ المسار القديم (`spawn` عادي) سليماً كتراجع تلقائي عند غياب الوحدة.

### الخطوة 2 — عرض ANSI في الواجهة

- أضف تبعية صغيرة لتحليل ANSI في renderer: **xterm.js** (`@xterm/xterm` +
  `@xterm/addon-fit`) — هو المعيار، ويقدّم محاكي طرفية كامل:
  ```bash
  cd app && npm install @xterm/xterm @xterm/addon-fit
  ```
- استبدل `#terminal-output` (نص بسيط) بـ Terminal xterm.js:
  ```ts
  const term = new Terminal({ fontSize: 12, fontFamily: 'Cascadia Code, Consolas, monospace' });
  term.open($('terminal-output'));
  const fit = new FitAddon(); term.loadAddon(fit); fit.fit();
  term.onData((data) => void window.idexal.terminal.write('main', data));
  ```
- اربط `onData` القادم من main عبر `term.write(data)` — يتعامل تلقائياً مع
  ANSI/الحركات/الألوان.
- إعادة الحجم: عند تغيّر حجم dock → `fit.fit()` + `terminal:resize`.

### الخطوة 3 — ترقية esbuild (إن لزم)

- xterm.js يُحزَّم كـ ESM/CJS — تحقق أنه يعمل مع build الحالي (platform browser).
  إن ظهرت مشكلة، أضِفه كـ external وانسخ ملفاته للـ dist (نمط Monaco الحالي).

### الخطوة 4 — الأنواع والأنماط

- أضف `resize(cols, rows)` إلى preload و`declare global`.
- أنماط CSS لـ xterm (حاوية بلا هوامش داخل `#terminal-output` أو dock).

## التحقق

```bash
cd app && npm run typecheck && npm run bundle
npm start
# يدوياً: افتح الطرفية ← شغّل vim أو htop (يعمل تفاعلياً) ← غيّر حجم dock
# ← يعيد التكيف ← Ctrl+C يعمل ← شغّل git log مع ألوان ANSI
# تراجع: شغّل بـ usePty:false → يعمل كالقديم
```

## معيار القبول

- [ ] برامج تفاعلية (vim/htop) تعمل داخل الطرفية المدمجة.
- [ ] تغيير حجم dock يعيد تكييف الطرفية (resize يعمل).
- [ ] ألوان ANSI ومؤشرات الحركة صحيحة (عبر xterm.js).
- [ ] تراجع تلقائي إلى stdio عند غياب الوحدة الأصلية — التطبيق لا يُكسر.
- [ ] `typecheck` نظيف · `bundle` ناجح · سلوك Git وكل شيء آخر غير متأثر.
- [ ] `ROADMAP.md` محدَّث (طرفية PTY → منجز).
