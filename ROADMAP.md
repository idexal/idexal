# Idexal — خارطة الطريق | Roadmap

> **Idexal** = **Ide** + **Xal** — بيئة تطوير متكاملة (IDE) وكيلية (Agentic) مبنية على
> كود VS Code (Code OSS) مفتوح المصدر من مايكروسوفت، ببنية متعددة الوكلاء
> بمستوى Claude Code و Codex.
>
> An agentic IDE built on Microsoft's open-source VS Code (Code OSS), with a
> multi-agent architecture at the level of Claude Code and Codex.

**الموقع | Website:** https://idexal.com

---

## ✅ ما أُنجز (تحديث)

| المكوّن | الحالة | التفاصيل |
|---|---|---|
| هوية Idexal | ✅ | product.json, package.json, CLI constants, سكربتات تشغيل |
| **Idexal AI Core** | ✅ | نواة ذكاء مستقلة `idexal/ai-core/` — مزودون متعددون + Fallback + وكلاء + ذاكرة |
| اختبارات AI Core | ✅ | 34 اختباراً تعمل بـ Node مباشرة (بدون مفاتيح API) — محدَّث بعد مراجعة 2026-08-03 |
| اختبارات Cloud Gateway | ✅ | 11 اختباراً تكامل (`idexal/cloud-provider/test`) — محدَّث بعد مراجعة 2026-08-03 |
| CLI النواة | ✅ | `idexal-ai run / agent / providers / memory / config` |
| مثال الإعدادات | ✅ | `idexal/ai-core/idexal.config.example.json` (7 مزودين + custom) |

### Idexal AI Core — المزايا المنفذة فعلياً

- **متعدد المزودين**: Anthropic, OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Together, Ollama, LM Studio + أي endpoint متوافق
- **Fallback تلقائي**: فشل → انتقال فوري للمزود التالي مع backoff + مراقبة صحة + cooldown
- **مزودون مخصصون**: `type: custom` مع baseUrl + headers + extraBody
- **وكلاء متعددون**: مخطط → منفذون → مراجع مع قائمة مهام وتفويض مهام (`use_subagent`).
  ⚠️ **دقة تقنية**: التنفيذ الحالي في `agents/orchestrator.ts` **تسلسلي** (خطوة بعد
  خطوة عبر `for await`)، وليس متوازياً — إعداد `maxParallelAgents` في `config.ts`
  موجود في الإعدادات لكنه **غير مُستخدم فعلياً** في محرك التنفيذ حالياً. التوازي
  الحقيقي بند مخطَّط في المرحلة 3 (أدناه)، وليس منجزاً بعد.
- **ذاكرة طويلة المدى**: SQLite محلي دائم (حقائق، قرارات، جلسات، تفضيلات) + حقن في سياق النظام
- **أدوات وكيل**: قراءة/كتابة ملفات، أوامر طرفية، بحث — مع حماية من هروب المسار
- **صفر تبعيات**: Node 24 المدمج (`node:sqlite`, `fetch`) — لا شيء للتثبيت

---

## الرؤية | Vision

بناء **Agentic IDE كامل ومتكامل** يدمج:
1. محرر VS Code كامل (تعديل، تصحيح، Git، طرفية، إضافات).
2. **وكلاء ذكاء اصطناعي متعددون** يتعاونون على المهام (تخطيط → تنفيذ → مراجعة → إصلاح).
3. **CLI خاصة بنا** (`idexal`) تعمل في الطرفية تماماً مثل `claude` و `codex`.
4. **طرفية مدمجة ذكية** تفهم أوامر الوكيل وتُظهر تقدمه لحظياً.

## الوضع الحالي | Current State

المشروع مأخوذ من VS Code **1.132.0** مع بنية جاهزة للاستغلال:

| المكوّن | الوضع |
|---|---|
| محرر VS Code كامل | ✅ موجود (src/) |
| امتداد Copilot Chat مع بنية أدوات كاملة (readFile, editFile, search, subagents, todo lists...) | ✅ موجود (extensions/copilot) |
| Agent Host (بروتوكول AHP عبر WebSocket + lockfile) | ✅ موجود (cli/src/commands/agent.rs + src/vs/platform/agentHost) |
| CLI بلغة Rust (`code agent host`, `code tunnel`, `code serve-web`...) | ✅ موجود (cli/) |
| SDKs جاهزة: `@anthropic-ai/claude-agent-sdk` و `@openai/codex` | ✅ في devDependencies |
| هوية Idexal (product.json, package.json, ثوابت CLI, سكربتات تشغيل) | ✅ **تمت الآن** |

---

## المراحل | Phases

### المرحلة 0 — التأسيس والهوية ✅ (تمت)
- [x] إعادة تسمية `product.json`: `Idexal`, `applicationName: idexal`,
  `urlProtocol: idexal`, مجلدات بيانات `.idexal*`, GUIDs وأيقونات جديدة.
- [x] تحديث `package.json` (الاسم `idexal` + مستودع idexal).
- [x] تحديث ثوابت CLI الافتراضية في `cli/src/constants.rs`.
- [x] سكربتات تشغيل `scripts/idexal.sh` و `scripts/idexal.bat`.
- [x] مستودع Git رسمي (`git init`) + `.gitignore` مخصص + `CHANGELOG.md` + `docs/adr/`
      (توثيق احترافي مستمر — راجع [ADR 0001](docs/adr/0001-ai-core-over-capi.md) و
      [ADR 0002](docs/adr/0002-panel-before-agenthost.md)).
- [x] نسخ الأيقونات الجديدة من `idexal BRAND logo+icon/` إلى
      `resources/win32/code.ico`, `resources/darwin/code.icns`, `resources/linux/code.png`.
- [x] `product.json`: `licenseUrl`/`serverLicenseUrl` → مستودع idexal بدل vscode.
      `package.json`: `author` → Idexal بدل Microsoft Corporation.
- [ ] **دَين تقني مؤجَّل (لا يمنع التشغيل المرئي):**
      `product.json`'s `webviewContentExternalBaseUrlTemplate` لا يزال يشير لـ
      `vscode-cdn.net` (يحتاج استضافة CDN خاصة بنا لاحقاً)، و`voiceWsUrl` لا يزال
      يشير لخادم صوت داخلي بمايكروسوفت (يحتاج تعطيل ميزة الصوت أو بديل)، و
      `resources/linux/rpm/code.xpm` (أيقونة حزمة RPM بصيغة XPM) لم يُستبدَل بعد
      (يحتاج تحويل صورة، غير حرج لتوزيع Windows/الأولي).
- [ ] تهيئة بيئة البناء: `npm install` ثم `npm run compile-client` و `compile-copilot`
      (`node_modules` الحالي غير مكتمل — تثبيت جزئي فقط).
- [x] إطلاق IDE لأول مرة (2026-08-03): `scripts\idexal.bat` — نافذة "Idexal Dev" كاملة
  تعمل بالهوية الجديدة (أيقونة، شعار، اسم). لوحظ تحذير "Extension host did not start in
  10 seconds" عند أول إطلاق — المحرر الأساسي يعمل بالكامل، لكن الإضافات (بما فيها
  Copilot) قد لا تُحمَّل. **بند متابعة**: تشخيص سبب تأخر extension host (رصد لأول مرة،
  لم يُحلّ بعد) قبل الاعتماد على أي إضافة في الاختبار البصري القادم.

### المرحلة 1 — CLI خاصة بنا | Own CLI
الهدف: أمر `idexal` يعمل من أي طرفية مثل `claude`/`codex`.

- [ ] بناء CLI باسم `idexal` من `cli/` (تعديل `gulpfile` و أسماء الباينري).
- [ ] أمر `idexal agent host` — تشغيل مضيف الوكيل محلياً.
- [ ] أمر `idexal run "<task>"` — وضع وكيل غير تفاعلي في الطرفية (مثل `codex exec`).
- [ ] أمر `idexal agent` — جلسة تفاعلية كاملة: قراءة ملفات، تعديل، تشغيل أوامر،
      باستخدام الأدوات الموجودة في `extensions/copilot/src/extension/tools`.
- [ ] `idexal tunnel` و `idexal serve-web` مع هوية Idexal.
- [ ] إعداد `idexal` في PATH (سكربت تثبيت للأوسمة الثلاثة).

### المرحلة 2 — الطرفية الذكية | Smart Terminal
الهدف: طرفية مدمجة "خاصة بنا" تعرف الوكلاء.

- [ ] تفعيل طرفية xterm.js المدمجة بهوية Idexal (سمات، ترويسة، عنوان).
- [ ] لوحة "Agent Terminal": طرفية يتحكم فيها الوكيل لتشغيل الأوامر وعرض النتائج
      مع تمييز لوني لأوامر الوكيل.
- [ ] تكامل مع `task` API: أوامر الوكيل تظهر في قائمة المهام.
- [ ] تدفق أوامر معتمد على المستخدم (نقرة موافقة قبل تنفيذ أوامر خطيرة).

### المرحلة 3 — تعدد الوكلاء | Multi-Agent Orchestration
الهدف: تنسيق عدة وكلاء متخصصين على مهمة واحدة (بمستوى Claude Code/Codex).

- [ ] **وكيل المخطط (Planner)**: يفكك المهمة إلى خطوات ويبني خطة.
- [ ] **وكلاء منفذون (Executors)**: أدوات تعديل الملفات موجودة بالفعل
      (`editFileTool`, `applyPatchTool`, `createFileTool`, `runNotebookCellTool`...).
- [ ] **وكيل مراجع (Reviewer)**: يفحص التغييرات ويقترح إصلاحات
      (البنية جاهزة في `extensions/copilot/src/extension/review`).
- [ ] **وكيل الباحث (Searcher/Subagent)**: بحث معمق في الكود
      (`searchSubagentToolCallingLoop.ts` موجود).
- [ ] مدير سياق مشترك (Workspace Recorder + Session Store) يحافظ على ذاكرة المهمة.
- [ ] قائمة مهام مرئية (Todo Lists) — البنية موجودة (`manageTodoListTool.ts`).

### المرحلة 4 — دمج الوكلاء في المحرر | In-Editor Agents
- [ ] شريط "Idexal Agent" في المحرر: إدخال مهمة → خطة → تنفيذ → Diff مرئي.
- [ ] تطبيقات التعديلات المتدفقة (Streaming Edits) في المحرر.
- [ ] أزرار تراجع/قبول لكل تعديل وكيل.
- [ ] عرض حالة الوكلاء (من يعمل، ماذا يفعل) بلوحة نشاط.

### المرحلة 5 — الحساب والمزود | Identity & Providers
- [ ] دعم مزودي LLM متعددين: GitHub Copilot، Anthropic، OpenAI، وأي مزود
      متوافق مع OpenAI API (عبر إعداد `idexal.provider.*`).
- [ ] تخزين مفاتيح API محلياً بأمان.
- [ ] (اختياري) مزود وكيل Idexal موحد باسم idexal.com.

### المرحلة 6 — التوزيع والنشر | Distribution
- [ ] بناء حزم: Windows (Inno Setup)، macOS (dmg)، Linux (deb/rpm/snap).
- [ ] ناشر إضافات خاص بـ Idexal أو سوق مدمج.
- [ ] موقع idexal.com: تحميل، توثيق، تسويق.
- [ ] تحديث تلقائي (update service موجود في cli/src/update_service.rs).

---

## بنية الوكلاء | Agent Architecture (بمستوى Claude Code / Codex)

```
┌─────────────────────────────────────────────┐
│                 المستخدم / الطرفية            │
└───────────────┬─────────────────────────────┘
                │  idexal CLI أو Chat UI
┌───────────────▼─────────────────────────────┐
│          Agent Host (AHP over WebSocket)     │
│   cli/src/commands/agent.rs                  │
└───────────────┬─────────────────────────────┘
┌───────────────▼─────────────────────────────┐
│         Orchestrator (وكيل المخطط)           │
│   chatParticipantRequestHandler.ts           │
└───┬──────────┬──────────┬──────────┬────────┘
    │          │          │          │
┌───▼───┐ ┌────▼────┐ ┌───▼────┐ ┌──▼───────┐
│Executor│ │Searcher │ │Reviewer│ │Terminal  │
│ editFile│ │findFiles │ │doReview│ │Tool     │
│ applyPatch│ │semantic │ │git diff│ │runCmd   │
│ createFile│ │codebase │ │        │ │(اختياري)│
└───┬───┘ └────┬────┘ └───┬────┘ └──────────┘
    └──────────┴──────────┴─────────┘
        ذاكرة مشتركة: TodoList + Session Store + Workspace Recorder
```

**المصادر الجاهزة في الكود:**
- حلقة الوكيل التنفيذي: `extensions/copilot/src/extension/prompt/node/executionSubagentToolCallingLoop.ts`
- حلقة البحث: `searchSubagentToolCallingLoop.ts`
- الأدوات: `extensions/copilot/src/extension/tools/node/*.tsx`
- المراجعة: `extensions/copilot/src/extension/review/node/doReview.ts`
- وكيل الطرفية: `extensions/copilot/src/extension/agents/vscode-node/askAgentProvider.ts`

---

## ملاحظات قانونية | Legal Notes

- المشروع مرخص بـ **MIT** (تبعاً لرخصة VS Code) — يجب إبقاء إشعارات الحقوق.
- الاسم التجاري `Idexal` و الدومين `idexal.com` ملك للمستخدم.
- المكوّنات غير المفتوحة (Copilot Chat SDK) تُبقي كما هي في `extensions/copilot`
  ويمكن استبدالها بمزود Idexal خاص في المرحلة 5.
