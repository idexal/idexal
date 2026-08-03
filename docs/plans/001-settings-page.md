# المخطط 001 — صفحة الإعدادات الشاملة

> **المنفّذ**: Claude Code · **المخطط**: Idexal
> **المرجع التصميمي**: `docs/design/03-settings.md` + `docs/design/06-providers.md`

## الهدف

صفحة إعدادات كاملة داخل التطبيق (زر ⚙ في شريط العنوان): إدارة المزودين (إضافة/تحرير/
حذف/إعادة ترتيب بالأولوية/اختبار اتصال)، ضبط سلوك الوكيل، وإدارة الصلاحيات —
كل شيء يُحفظ إلى `~/.idexal/config.json` عبر عقد IPC، ويُتحقق منه فوراً.

## الوضع الحالي (ما هو موجود — لا تعده)

| المكوّن | الحالة |
|---------|--------|
| `idexal-core config` (عرض الإعداد الفعلي JSON بلا مفاتيح) | ✅ موجود في `core/src/main.rs` |
| `idexal-core test <id>` (اختبار اتصال حي) | ✅ موجود في `core/src/main.rs` |
| عقد IPC للإعدادات في main | ⬜ يُبنى |
| واجهة صفحة الإعدادات في renderer | ⬜ يُبنى |
| زر ⚙ في شريط العنوان | ⬜ يُضاف |

## الخطوات

### الخطوة 1 — وحدة `settings` في main process

أنشئ `app/src/main/settings.ts`:

```ts
// Idexal — settings IPC: load/save/test against the core.
import { ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

function resolveCoreBinary(): string {
	const exeName = process.platform === 'win32' ? 'idexal-core.exe' : 'idexal-core';
	const candidates = [
		path.join(__dirname, '..', '..', '..', 'core', 'target', 'release', exeName),
		path.join(__dirname, '..', '..', '..', 'core', 'target', 'debug', exeName),
	];
	for (const c of candidates) if (fs.existsSync(c)) return c;
	throw new Error('idexal-core binary not found — build it first: cd core && cargo build');
}
```

- **ملاحظة**: `resolveCoreBinary` موجودة مكررة في `app/src/main/index.ts` —
  إن أردت، استخرجها إلى `app/src/main/core.ts` واستوردها في الملفين (لا تنسَ
  تحديث index.ts)، أو انسخها محلياً — الخياران مقبولان، لكن الأفضل عدم التكرار.

أضف المعالجات:

```ts
export function registerSettingsHandlers(): void {
	ipcMain.handle('settings:load', async () => runCoreJson(['config']));
	ipcMain.handle('settings:save', async (_e, payload: unknown) => {
		// payload = { providers: [...], agent: {...} } (camelCase — طابق config.rs)
		const file = path.join(os.homedir(), '.idexal', 'config.json');
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
		// تحقق فوري: هل ما زالت النواة تقرأ الملف؟
		return runCoreJson(['config']);
	});
	ipcMain.handle('settings:test-provider', async (_e, id: string) => runCoreJson(['test', id]));
}
```

`runCoreJson` — تشغيل النواة بمعاملات وإرجاع أول JSON على stdout:
```ts
function runCoreJson(args: string[]): Promise<{ ok: boolean; data?: unknown; error?: string }> {
	return new Promise((resolve) => {
		let core: string;
		try { core = resolveCoreBinary(); } catch (err) {
			resolve({ ok: false, error: (err as Error).message }); return;
		}
		const child = spawn(core, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let out = ''; let err = '';
		child.stdout.on('data', (c: Buffer) => (out += c.toString()));
		child.stderr.on('data', (c: Buffer) => (err += c.toString()));
		child.on('close', (code) => {
			if (code !== 0) return resolve({ ok: false, error: err.trim() || `exit ${code}` });
			try { resolve({ ok: true, data: JSON.parse(out.trim()) }); }
			catch { resolve({ ok: false, error: 'core returned non-JSON' }); }
		});
	});
}
```

**ملاحظة صلاحيات**: لا تُرسل المفاتيح للواجهة أبداً — `settings:load` يعيد `hasKey`
فقط (النواة تضمن ذلك). عند الحفظ، `apiKey` القادم من الواجهة قد يكون فارغاً —
احذف الحقول الفارغة من الـ payload قبل الكتابة (لا تكتب `"apiKey": ""`).

**سجّل المعالجات** في `app/src/main/index.ts` (بعد `registerTerminalHandlers()`):
```ts
registerSettingsHandlers();
```
استورد الدالة في أعلى الملف.

### الخطوة 2 — جسر preload

أضف إلى `app/src/preload/index.ts` داخل `exposeInMainWorld('idexal', {...})`:

```ts
settings: {
	load: () => ipcRenderer.invoke('settings:load'),
	save: (cfg: unknown) => ipcRenderer.invoke('settings:save', cfg),
	testProvider: (id: string) => ipcRenderer.invoke('settings:test-provider', id),
},
```

### الخطوة 3 — واجهة صفحة الإعدادات

**3أ. زر ⚙ في شريط العنوان** — في `app/src/renderer/index.html` داخل `#titlebar`،
بعد زر `فتح مجلد…`:
```html
<button id="settings-open" class="tb-btn" title="الإعدادات">⚙ الإعدادات</button>
```

**3ب. بنية الصفحة** — أنشئ `app/src/renderer/settings.ts` (وحدة مستقلة تُبنى
كـ entry منفصلة، انظر الخطوة 5). ابدأ بقراءة `app/src/renderer/index.ts` لفهم
نمط الكود (RTL، الـ `$` helper، الألوان). التصميم المرجعي: `docs/design/03-settings.md`.

المكونات المطلوبة في `settings.ts`:
1. `openSettings()` — تظهر صفحة إعدادات (يمكن أن تكون لوحة جانبية جديدة
   `data-panel="settings"` كالملفات/Git/الوكلاء، أو صفحة مركزية — اختر الأنظف
   وأضف الزر المناسب في Rail أيضاً إن اخترت لوحة جانبية).
2. `load()` — تستدعي `window.idexal.settings.load()` وترسم بطاقات المزودين:
   لكل مزود: `id · type · baseUrl · model · priority · enabled · apiKeyEnv ·
   hasKey (شارة، لا المفتاح) · local`.
3. **بطاقة مزود قابلة للتحرير** — حقول إدخال لكل قيمة + أزرار:
   - `اختبار` → `settings.testProvider(id)` → عرض `✓ Nms` أو `✗ error`.
   - `▲/▼` لإعادة ترتيب الأولوية (تحديث الأرقام فوراً).
   - `حذف` (مع تأكيد) · `إضافة مزود` (قوالب: anthropic / openai-compatible فارغ).
4. **قسم الوكيل** — `maxToolRounds` (رقم) · `useReviewer` (مفتاح) ·
   `maxParallelAgents` (رقم).
5. `save()` — تجمع الحالة → `settings.save(payload)` → على النجاح تُحدّث من
   الرد المدمج (يعيد النواة الحالة الفعلية). أزل الحقول الفارغة قبل الإرسال.

**3ت. الأنماط** — أضف أنماط الصفحة إلى `app/src/renderer/style.css` بنفس
التوكينات (--bg, --line, --accent...). التزم بنمط الصفحات الجانبية الموجودة.

### الخطوة 4 — أنواع الواجهة

أضف إلى `app/src/renderer/index.ts` (بلوك `declare global` في `Window.idexal`):
```ts
settings: {
	load: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
	save: (cfg: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
	testProvider: (id: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
};
```

### الخطوة 5 — بناء entry جديد في esbuild

في `app/esbuild.mjs` أضف build رابعاً:
```js
esbuild.context({
	...common,
	entryPoints: ['src/renderer/settings.ts'],
	outfile: 'dist/renderer/settings.js',
	platform: 'browser',
	format: 'iife',
}),
```
وأضف `<script src="settings.js"></script>` بعد `index.js` في `index.html`.

## التحقق

```bash
cd core && cargo test                      # 33 خضراء (لا مساس بالنواة)
cd app && npm run typecheck                # نظيف
cd app && npm run bundle                   # يبني 4 entries
# يدوياً: npm start ← افتح مجلداً ← ⚙ ← أضف مزوداً ← احفظ ← أعد الفتح: يُحفظ
```

تحقق يدوي إضافي: بعد الحفظ، شغّل `node cli/bin/idexal.js config` — يجب أن يظهر
المزود الجديد في السلسلة (بلا مفتاح مكشوف).

## معيار القبول

- [ ] زر ⚙ يفتح صفحة إعدادات تعرض المزودين الحاليين (من config الفعلي المدمج).
- [ ] إضافة/تحرير/حذف/إعادة ترتيب مزود + حفظ يكتب `~/.idexal/config.json` صحيحاً.
- [ ] زر "اختبار" يعرض نتيجة حية (نجاح بزمن/فشل بخطأ) لكل مزود.
- [ ] قسم الوكيل (maxToolRounds/useReviewer/maxParallelAgents) يُحفظ ويُسترجَع.
- [ ] لا يظهر أي مفتاح API في الواجهة — فقط `hasKey`.
- [ ] `cargo test` أخضر · `typecheck` نظيف · `bundle` يبني 4 entries.
- [ ] `ROADMAP.md` و`CHANGELOG.md` محدَّثان.
