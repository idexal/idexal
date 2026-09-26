# Changelog

## 3.16.7 (2026-09-26)

### Changes

- **feat(i18n):** 语言表一致性检查落地为仓库门禁，挂进 `pnpm verify:pre-push`
  - 新增 `scripts/check-i18n.mjs`（`coverage` 子命令单看覆盖率），`verify:pre-push` 变为
    `lint && architecture:check --changed && node scripts/check-i18n.mjs`。
    拦六项：**重复键**、**孤儿键**（译文里出现 `en-US` 没有的键）、**译文空值**、
    **`{placeholder}` 与英文不一致**、**`ar`/`fr` 覆盖键集不对称**、**阿语行混入 CJK**。
    占位符那条做成拦截而非提示：漏一个 `{time}` 会把字面量渲染给用户，而类型检查看不见它。
  - **为什么不再用正则数键**：语言表里存在含连字符与非 ASCII 的键
    （`sidebar.settings.locale.en-US`、`ssh.assetInstallMode.local-download-upload`、
    `feedback.severity.P1-高.label`），字符集 `[A-Za-z0-9_.]` 会静默跳过它们——
    本次前三版发布的覆盖率（5859 / 208 / 317 / 371）正是这么算错的，真实是 **5872 / 386**。
    新脚本在 `vm` 沙箱里把语言表当模块求值再读真实键集，并**自检解析器有没有吃到那些别扭的键**：
    一个都没吃到就判定失败，因为那时"通过"和"根本没看"长得一样。
  - **门禁本身被验证有判别力**，不是恒绿：逐项注入真实缺陷后全部 exit 1 ——
    删掉一个 ar 键 → 报 `fr 独有键`；删掉 `{used}/{total}` → 报占位符不匹配；
    往阿语句子里塞 `言語` → 报混入 CJK；造一个 `totally.made.up.key` → 报孤儿键；
    逐项还原后恢复 exit 0，`ar.ts` 与 HEAD 逐字节相同（sha256 一致）。
  - 有意**不**做硬门禁的一项：值里残留未译英文词的启发式扫描。
    法语合法同源词（`session`、`Menu`、`Total`、`Quota`、`Mention`）在约 380 键里产生 38 条误报，
    做成必过检查只会让人把它关掉。它留在写作流程里当辅助扫描。
    分界是：机器能判对错的进 CI，需要人判断的不进。
  - `docs/i18n-rtl.md` 与提案 §1.3 同步为"已完成"，并写清命令名、六项内容与两条实现约束。
  - 顺带修好被这次整理打断的写作工具：`apply-translations.mjs` 原先引用已删除的
    `locale-loader.mjs`，改为内置同一套 `vm` 求值；实测它现在能把
    `sidebar.settings.locale.en-US` 认成"已存在"而跳过——旧的跳过连字符键的逻辑会把
    这个键**再插一遍**造成重复。
  - 记录一条待确认事实（本次不改动）：`en-US` 有 4 个空值，其中
    `automations.form.schedule.minuteSuffix` 与 `…fromPriceSuffix` 像是刻意留空的后缀，
    而 `chat.empty.description.afterWorkspace` 与 `feedback.submit.bug.supplementalDescription`
    需要产品确认是否本该有文案。
  - 门禁：`node scripts/check-i18n.mjs` 通过；`pnpm typecheck` exit 0；
    `pnpm lint` 70 warnings / 0 errors；`pnpm fmt:check` 通过；
    `architecture:check --changed` violations 0 / new 0；`licenses check` 通过。

## 3.16.6 (2026-09-26)

### Changes

- **fix(desktop):** 桌面主进程的界面文案改为按语言穷尽查表，并修掉退出对话框残留的旧品牌名
  - 收敛 3.16.5 提案 §1.6 列出的 **7 处**"应用自己的文字只认 `zh-CN`/`en-US`"，形态统一为
    `Record<Locale, Copy>` + `?? [FALLBACK_LOCALE]`，与 `desktopMenu.ts:61` 既有房内模式一致：
    联合类型再加语言时，缺条目会变成编译错误而不是静默英文。
    涉及：强制更新对话框（`forceUpdateGuard.ts:197`）、强制更新进度窗全部 22 条文案
    （`forceUpdatePrompt.ts:41`）、架构不匹配提示（`desktopArchitectureGuard.ts:69`）、
    退出确认（`index.ts:1310`）、内嵌浏览器 `alert`/`confirm` 按钮与其来源标签
    （`embeddedBrowserJavaScriptDialog.ts:64`）、打开外部文件夹确认框
    （`desktopOAuthDeepLink.ts:139`，顺带完成该处早已写下的 `TODO(i18n)`）、
    无可安装更新提示（`autoUpdater.ts:348`）。
  - **修掉一处品牌残留**：退出确认的消息原本是 `"Quit Z Code?"` / `"确认退出 Z Code?"`
    —— 全站 ZCode→Idexal 改名把它漏在了生产环境才会弹出的对话框里（只有带运行中会话退出时触发）。
    全仓复查 `Z[ -]?Code` 现在只剩 3 处，且都是**发给模型网关的 `X-Title` 请求头**
    （`packages/shared/src/idexal-source-headers.ts:6,50`、
    `apps/idexal-cli/packages/bootstrap/src/model-config.ts:59`）：同一份 header 里
    `User-Agent` 与 `HTTP-Referer` 已经是 Idexal，只有 `X-Title` 还是旧名。
    **这条没有动**——机器可读标识可能是上游限额/统计的键，属于对外契约，
    换它是产品决策而不是清理，需要与网关确认后一起做。
  - **按钮顺序是机器契约，不是文案习惯**，已在代码注释里逐处钉住：
    退出框 `defaultId/cancelId = 1` 且 `result === 0` 才退出 ⇒ 必须 `[退出, 取消]`；
    内嵌浏览器 confirm 是 `[取消, 确定]` 且 `defaultId: 1, cancelId: 0` ⇒ 回车触发的是"确定"，
    与前者顺序**相反**；打开外部文件夹框 `defaultId/cancelId = 1` ⇒ 索引 0 才是"打开"。
    按本地习惯调换顺序会让确认框的默认动作变成"打开一个陌生文件夹"。
  - 强制更新进度窗的 HTML 原本写 `lang` 却不写 `dir`，阿语内容会按 LTR 基线排版；
    补 `dir="${resolveTextDirection(locale)}"`（返回值是 `"rtl" | "ltr"` 闭集，无需转义）。
  - **过程中自己制造并抓到一处同类缺陷**：`forceUpdateGuard.ts` 的阿语初稿写成了
    `"لا يمكن继续使用 الإصدار الحالي"`——阿语句子里夹了中文。正是 3.16.2 那条教训的现场复现，
    所以这次给新写的 7 个文件补了一条机器扫描：任何一行同时含阿拉伯文与 CJK 即报错，
    修复后结果为 7 个文件全 0。
  - **验证方式（因为 `packages/desktop/src/main` 不在 `pnpm typecheck` 的 11 个项目里，
    且 `tsconfig.main.json` 有既有错误基线，不能当门禁）**：改用
    `npx tsc -p packages/desktop/tsconfig.main.json --noEmit` 对 **HEAD 基线做逐条身份比对**，
    本次改动后仍为 **87 条、新增 0、消失 0**。并且**反向证明过这条比对有判别力**：
    故意把 `fr` 改成 `fr1`，计数立刻升到 88 并报
    `TS2353: 'fr1' does not exist in type 'Record<Locale, ForceUpdatePromptMessages>'`，随后还原。
    缺 import（`FALLBACK_LOCALE` / `resolveTextDirection`）也会被同一比对抓到——本次确实抓到一次。
  - **一处刻意没做**：`windowsCuaOperationIndicatorContent.ts:15` 的提示条文案与
    **手填像素宽度绑在同一分支**（中文 234 / 英文 308），卡片是 `white-space: nowrap` 且
    `html, body { overflow: hidden }`，窗口宽度必须 ≥ 文本渲染宽度，否则居中裁切。
    阿语需要字体整形才能算准，裸 Node 没有度量手段，凭感觉填数字就是把"漏译"换成"截断"。
    因此这次不动它：阿/法用户在该提示条上看到英文，是**已记录的已知缺口**；
    结束它需要的动作是关掉开发实例、实测两种语言下卡片的实际文本宽度。
  - 剩余 `=== "zh-CN"` 仅 4 处：3 处是官网 `/cn` 与 `/cn/changelog` 前缀分流
    （`desktopArchitectureGuard.ts:58`、`desktopCommandHandlers.ts:455`、
    `forceUpdateGuard.ts:192`），属于分享站/官网只有 `/cn` 与裸路径两种形状的外部契约，
    按 `docs/i18n-rtl.md` 保持窄类型；第 4 处即上面那条 CUA 提示条。
  - 门禁：`pnpm typecheck` exit 0；`pnpm lint` 70 warnings / 0 errors；`pnpm fmt:check` 通过；
    `architecture:check --changed` violations 0 / new 0；`licenses check` 通过。
    语言相关既有校验（键集对称、占位符一致）本次不涉及，未重复跑。
    **仍未实跑渲染**：用户 `:9229` 实例在跑，起第二实例的 `pre-dev` 会 `rmSync` 同一份 `out/`。

## 3.16.5 (2026-09-26)

### Changes

- **docs:** 交付逐条带代码出处的改进提案，并顺带查出桌面主进程还有一批语言硬编码未修
  - `docs/improvement-proposals.md`：每条都标 **[已存在] / [确证缺失] / [已发现的缺陷]** 并给
    `文件:行号`，目的是让提案能被直接执行而不是又一份愿望清单。
    刻意写明"不要重建"的部分：可观测性其实已经完整（ARMS RUM `appARMSBootstrap.ts`、
    上报前脱敏 `armsEventRedaction.ts:98-114`、`crashReporter` `desktopCrashCapture.ts:373`、
    ANR 5s / 冻结 30s `desktopStabilityTelemetry.ts:19,21`、React 错误桥
    `renderer/src/main.tsx:323-329`、"报告问题"附日志 zip `feedbackService.ts:232-243`）；
    技能开关、插件个人来源（git/URL/本地目录）、hooks/subagents/automations/bots/memory 服务层
    也都已存在。**这次调研的直接作用就是不提出重复建设**。
  - **核心确证（关于 fallback）**：模型侧只有**同模型内**重试
    （`apps/idexal-cli/packages/adapters/src/model/retry-policy.ts:13` 默认 `maxAttempts = 11`、
    `empty-completion-retry.ts:8` 空响应另有 1 次），
    分类器已经把 429 / 529 / 401·403 / 400·422 / 5xx / 超时 / 流空闲 / 上下文超长 / TLS / 取消
    分开并给出 `retryable` 与 `retryAfterMs`（`failure-classifier.ts:81-310`），
    但**没有任何代码路径会因为模型 A 失败而改调模型 B**：
    `nextModelId` 的全部命中都是配置里的模型改名（`packages/provider/src/config/model-config.ts:471`、
    `config-service.ts:376,457`、`facades.ts:78-408`），`switchModelConfig` 是用户主动命令
    （`idexalTaskServiceAdapter.ts:1169,2741`）。
    因此提案给的是"在现有分类结论上加一维 fallbackEligible + 候选链由 provider 层按现有
    `executable/selectable` 判定解析"，并明确不新建第二套分类器（避免两条真相链），
    以及最难的一条硬边界：**已有工具执行后不得换模型重放**，否则副作用二次执行。
  - **提案过程中又查出同形状缺陷**：写"崩溃屏已修"之后，用
    `grep -rnE '=== *"zh-CN"|=== *"en-US"'` 扫了一遍，发现桌面主进程里还有 **6+ 处应用自己的文字**
    只认 zh/en——强制更新对话框（`forceUpdatePrompt.ts:41-52`，含"请勿关闭应用"这种
    不可中断操作的指令）、退出确认（`index.ts:1317-1322`）、内嵌浏览器原生 `alert/confirm`
    按钮（`embeddedBrowserJavaScriptDialog.ts:67-69`，不点掉页面就卡住）、
    **"Idexal is controlling your computer" 安全提示条**
    （`windowsCuaOperationIndicatorContent.ts:14-17`，且文案与手填像素宽度绑在同一分支：
    中文 234 / 英文 308，加语言必须实测宽度而不是猜）、
    外部工作区打开确认框（`desktopOAuthDeepLink.ts:140-150`，
    源码里已有 `TODO(i18n)` 精确预言了这件事）。
    这不在 `docs/i18n-rtl.md` 那五个刻意保持窄类型的外部契约之内，所以是真缺陷。
    而 `packages/desktop/src/main/**` **不在 `pnpm typecheck` 覆盖范围内**
    （`tsconfig.main.json` 约 90 个既有错误、不作门禁），所以没有任何门禁会提醒。
    已记为 §1.6 / §1.7 并列为实施阶段 1。
  - 同时修订了自己之前的两处表述：§1.2 标为已修复；RTL 物理工具类从"≥400 处/197 文件"
    改为逐类实测的 **743 处 / 250 文件**，并确认逻辑属性用量为 0
    （`start-N/end-N` 的 30 处命中逐条核对后全是 `col-start-*` / `row-start-*` 栅格线名，
    `text-start` 的 1 处在代码注释里——直接引用就会把"零迁移"错报成"已开始迁移"）。
  - 一次误判的纠正：裸 `node` 加载 `packages/shared/dist` 时报
    `Cannot find module '.../model-option-map/src/compiler.js'`，我一度以为仓库缺文件。
    实测 `compiler.ts` 存在、包入口是 `"./src/index.ts"`，`.js` 说明符是 TS ESM 约定、
    由打包器解析——**探针本身无效，结论作废**，没有写进提案。
  - 本次为纯文档变更，未改任何生产代码；门禁复跑：`typecheck` exit 0、
    `lint` 70 warnings / 0 errors、`fmt:check` 通过、`architecture:check --changed` violations 0、
    `licenses check` 通过。

## 3.16.4 (2026-09-26)

### Changes

- **fix(ui):** 崩溃屏跟随应用语言（含阿语 RTL），并纠正前三次发布报错的覆盖率数字
  - **这是我改语言集时漏掉的一处缺陷**：`ErrorBoundary.tsx` 的 `resolveBoundaryLocale()`
    把可接受的语言写死成 `storedPreference === "zh-CN" || "en-US"`，并在 `zhCN` / `enUS`
    两张全量语言表之间二选一。`Locale` 扩到 ar/fr 之后，**选了阿拉伯语或法语的用户崩溃时
    看到的是英文**（系统语言为中文时是中文）。崩溃屏恰恰是最需要看懂的时刻——上面是
    "重试 / 重载应用 / 查看诊断"，看不懂可能导致用户误操作。
    现在改走 shared 的 `isSupportedLocale` / `localeFromLanguageTag`，消息表按 `Locale` 索引，
    并复刻 `createIntl` 的回退链（目标语言 → en-US → key）。
    同时给应用级 fallback 卡片加了 `dir`：崩溃可能发生在 `IntlProvider` 之前，
    那时 `documentElement.dir` 还没被写上，阿语崩溃屏会按 LTR 排版。
    范围性卡片（`ScopedErrorBoundary`）不加 `dir`——它渲染在 provider 之后，方向已生效，
    再加就是第二处状态来源。
  - `appError.*` 共 11 个键在 ar/fr 里原本是 **0 个**（它不在我逐面补齐时扫到的任何组件里）。
    已补齐，两份语言对称，`ar`/`fr` 各增至 **386 键**。
  - **纠正已发布的错误数字**：3.16.1–3.16.3 三份 changelog 写的 `5859 / 208 / 317 / 371`
    全部偏低。原因是我自己的校验脚本用正则数键名，字符集写成 `[A-Za-z0-9_.]`，
    **静默跳过**了含连字符与非 ASCII 的键（`sidebar.settings.locale.en-US`、
    `ssh.assetInstallMode.local-download-upload`、`feedback.severity.P1-高.label`），
    en-US 漏 13 个、ar/fr 各漏 4 个。真实值是 **en-US 5872、zh-CN 5871、ar/fr 386**。
    旧条目按历史保留不改，此处记录更正。
    校验脚本改为**真正加载语言表模块**再 `Object.keys`（`locale-loader.mjs`），
    写入器 `apply-translations.mjs` 的"是否已翻译"判断也换到同一来源，避免重复插入。
    教训：门禁看不到它解析不到的东西时照样报绿灯。
  - RTL 物理工具类的计数也从"≥400 处 / 197 文件"改为**逐类实测**：
    合计 **743 处、250 个文件**（`pl/pr` 269、`text-left/right` 187、`left/right` 159、
    `ml/mr` 76、`translate-x` 30、`rounded-l/r` 13、`border-l/r` 8、`space-x` 2）。
    逻辑属性用量为 **0**：`ms-/me-/ps-/pe-`、`rounded-s/e-`、`border-s/e-`、`inset-inline` 全为 0；
    `start-N/end-N` 的 30 处命中逐条核对后**全是 `col-start-*` / `row-start-*` 栅格线名**，
    `text-start` 的 1 处在代码注释里——若直接引用这两个数就会把"零迁移"错报成"已开始迁移"。
  - 新增 `docs/improvement-proposals.md`：基于当前检出代码（每条带 `文件:行号`，并区分
    [已存在] / [确证缺失] / [已发现的缺陷]）整理的改进提案，覆盖测试与 CI 缺口、
    凭据真加密、**模型/供应商 fallback**（确证：现在只有同模型内重试，
    `retry-policy.ts:13` 上限 10 次，**没有任何代码路径会因模型 A 失败而换模型 B**）、
    供应商与自定义模型的可控范围、ICU 复数、离线缓冲、三平台安装包与签名等。
  - 验证：`pnpm typecheck` exit 0（`packages/ui`、`packages/shared` 都在门禁列表内，
    这次是真的类型门禁覆盖到的代码改动）；`pnpm lint` 70 warnings / 0 errors；
    `pnpm fmt:check` 通过；`architecture:check --changed` violations 0；
    语言表校验 386/386、孤儿键 0、双向差集 0、占位符 0 处不匹配。
    另单独确认 `isSupportedLocale` / `localeFromLanguageTag` / `resolveTextDirection`
    在 `packages/shared/src/index.ts:30-36` 是**值再导出**而非 `export type`——
    因为上次"静态全绿、运行时 `ReferenceError`"正是崩在这一类问题上，而崩溃屏自己若再崩就是白屏。
    **仍未实跑渲染**：用户开发实例还在 `:9229`，起第二个 dev 实例会 `rmSync` 它正在监听的 `out/`。
    崩溃屏的实际渲染是本次唯一没被任何自动化覆盖到的环节。

## 3.16.3 (2026-09-26)

### Changes

- **feat(i18n):** 翻译输入框与 @ 引用面板，覆盖率增至 371 / 5859 键
  - `ar` / `fr` 各从 317 键增至 **371 键**（净增 54），覆盖会话主视图的常驻与高频界面：
    输入框提示与拖拽提示、`@` 引用面板的全部 6 个分类（文件 / 附加组件 / 技能 / 会话 /
    白板 / 加载中）及其空态与搜索提示、错误横幅（复制、展开、重试、上报、无可用模型）、
    上下文用量弹层、推理级别选择、配额重置提醒、连接态文案。
  - 沿用 3.16.2 的取键方式并把它做成通用脚本：扫组件里真实的 `id / titleId / descriptionId /
labelId / messageId` 字面量，**只挑 `en-US` 里有而 `ar.ts` 还没有的**，因此不会重复劳动、
    也不会译已经不渲染的键。
  - 把上一版学到的"键补齐 ≠ 值正确"变成固定动作：新批次写完后立刻跑值级扫描。
    本次 9 条命中全部是法语同源词或刻意保留的技术名（`Sessions`、`Mention`、`Sources`、
    `cache`、`conversations`、`Coding`），无漏译；上一版那三条真缺陷正是这套扫描抓出来的。
  - 校验结果：`ar`/`fr` 键集双向差集 0、孤儿键 0、重复键 0；每条值的 `{placeholder}` 集合与
    英文逐字一致（0 处不匹配），且该校验的反向探针仍然可判别。
  - **仍未实跑渲染**：与 3.16.2 同一原因——再起一个 dev 实例会触发 `@idexal/desktop` 的
    `pre-dev`，`rmSync` 掉用户实例正在被 `tsup --watch` 写入的 `packages/desktop/out`。
    用户 `:9229` 实例本次全程未被触碰（收尾复查仍为 200）。
  - 门禁：`pnpm typecheck` exit 0；`pnpm lint` 70 warnings / 0 errors；`pnpm fmt:check` 通过；
    `architecture:check --changed` violations 0；`licenses.mjs check` 通过。

## 3.16.2 (2026-09-26)

### Changes

- **feat(i18n):** 翻译设置页（导航 + 通用 + 外观），并修掉三处已确认的译文缺陷
  - `ar` / `fr` 各从 208 键增至 **317 键**（净增 109），覆盖设置页左侧导航的 3 个分组标题与
    16 个分区标题、General 分区的 66 个标签与说明、Appearance 分区的 22 个。
    取键方式沿用上一次的纠正：不是按前缀猜，而是从 `settingsPageConfig.ts` 的
    `titleId / contentTitleId / descriptionId` 与 `GeneralSectionContent`、
    `AppearanceSectionContent` 两个组件里**实际出现的 `id:` 字面量**抽取，
    因此译的都是真会渲染的键。
  - 顺带发现并修掉三处真实缺陷（不是格式化差异，是错的译文）：
    - `fr chat.placeholder.newTask` 原文是 `Demandez anything à Idexal…`——句子里留着英文
      `anything`，且丢了"ou les capacités"半句。已改为完整法语。
    - `ar sidebar.usage.plan.expires` 是 `تُعاد التعيين`，语法不通（字面像"被再任命"）。
      对齐英文 `Resets` 改为 `تُعاد التهيئة`。
    - `ar sidebar.usage.plan.resetAt` 是 `تُعاد {time}`，缺宾语、读不通，改为 `تُعاد التهيئة {time}`。
      这三条都是我此前那批外壳译文里的，说明"键补齐"不等于"值正确"，需要单独扫一遍。
  - 新增两份静态校验，且都做了反向证明（在构造的坏数据上确实会失败，不是恒绿）：
    - `verify-locales.mjs`：重复键、孤儿键（不在 `en-US` 中）、`ar`/`fr` 键集对称性、
      以及"键写了但值因换行没解析上"。结果 317/317、orphans 0、双向差集 0。
    - `verify-placeholders.mjs`：每条值的 `{placeholder}` 集合必须与英文逐字一致
      （漏掉 `{time}` 这类会让 ICU 渲染出字面量或直接失败）。结果 0 处不匹配；
      并显式断言该比较能识别"少一个占位符"，否则报告无意义。
  - **本次未做实跑渲染验证，原因记清楚**：`SettingsPage` 只在桌面渲染进程挂载（`packages/web`
    不引它），而再起一个隔离 dev 实例需要先跑 `@idexal/desktop` 的 `pre-dev`，它会
    `rmSync('./out', {recursive:true})`——用户当前的开发实例正有 `tsup --watch` 在写同一份
    `out/`，两个 watcher 抢同一目录会打乱其会话。因此这一版只有静态门禁与字符串级校验，
    阿语设置页的**排版几何**（导航栏 + 表单 + 开关这个新面在 RTL 下的表现）仍是未测面。
  - 覆盖率：`en-US` 5859 键，ar/fr 各 **317 / 5859 ≈ 5.4%**。
  - 门禁：`pnpm typecheck` exit 0；`pnpm lint` 70 warnings / 0 errors（基线未变）；
    `pnpm fmt:check` 通过。

## 3.16.1 (2026-09-26)

### Changes

- **feat(desktop):** Windows 向导安装器改为品牌化三语并补齐安装体验配置（提交于 `f9c96fb`，本次一并计入发布记录）
  - 界面语言切到阿/英/法后，NSIS 向导里我们自己写的提示仍是硬编码中文：安装目录含 `.idexal`
    数据时的阻断页、"重选目录"按钮、旧版本清理失败与删除失败提示。英/法用户会卡在一个
    只有报错是中文的流程里。改为 10 个 LangString 键 × 3 语言（共 30 条），全部经 `$(...)` 引用。
  - 两个非显然的实现约束，均已实测：语言常量必须用数字 ID（1033/1036/1025）而非 `${LANG_ENGLISH}`——
    后者要等 `MUI_LANGUAGE` 展开才有定义，而 `installer.nsh` 的展开时机由 electron-builder 决定，
    实测用 `${LANG_ENGLISH}` 会被 `makensis -WX` 判为错误；文件必须带 **UTF-8 BOM**，否则
    `makensis` 按系统代码页读取（实测无 BOM 报 `(ACP)`、有 BOM 报 `(UTF8)`），阿拉伯语会静默乱码。
  - 机制用独立夹具在 electron-builder 自带的 NSIS 3.0.4.1 上以 `-WX` 编译通过（三语言 +
    nsDialogs 页面引用自定义 LangString）。**与 electron-builder 生成模板的整包集成编译尚未执行**：
    那需要整包构建，而构建会删除当前运行中的开发实例所依赖的 `out/` 目录。
  - 补齐向导配置：`installerLanguages` 三语、品牌化 header/sidebar 位图（150×57 与 164×314，
    MUI2 的硬性尺寸，由 `logo_idexal` 生成并断言笔画与底色亮度差）、`menuCategory`、
    稳定的 `shortcutName` / `uninstallDisplayName`、`deleteAppDataOnUninstall=false`
    （卸载只删程序文件，不碰用户数据）。
  - 生成位图时修正了一处自己的错误假设：`dark_*` / `light_*` 是按**目标背景**命名
    （`dark_*` 是浅色笔画，用于深底），第一版把两者用反，产出的图在各自底色上几乎不可见却
    "生成成功"；生成脚本因此改为对素材 alpha 加权亮度做断言，而不是靠人眼盯预览。
    顺带发现并纠正了断言本身的缺陷：最初测的是合成后画布（全像素不透明，恒通过），
    改测源标志的 alpha 加权亮度后才有判别力。
- **fix(i18n):** 补齐阿/法双语的应用外壳文案，并撤回 v3.16.0 中一句未经实测的判断
  - `locales/ar.ts` 与 `locales/fr.ts` 各从 59 键增至 **208 键**（净增 149），两份文件的键集
    经 `diff` 复核**完全一致**，不会出现在阿语里有条目、法语里回退英文的不对称覆盖。
  - 覆盖范围为常驻可见外壳：`workspaceSidebar.*`（44）、`sidebar.*`（51）、`titleBar.*`（21）、
    `common.*`（16）、`app.*`（5）、`chat.*`（5）、`taskList.*`（3）、`workspace.*`（2）、
    `webRemoteControl.*`（2）与 `taskGroup.*` / `offPeak.*` / `mode.*` / `locale.*` /
    `commandCenter.*` / `automations.*` 各 1。
  - **撤回上一版的错误结论**：v3.16.0 的 changelog 与 README 写着"Tailwind 物理工具类不认 `dir`，
    ≥400 处 / 197 文件 ⇒ 部分组件的内外边距与绝对定位仍按 LTR 摆放"。那句是从**计数**推断的，
    不是观察来的。对同一视口分别以 `en-US` 与 `ar` 实测几何后，外壳已经正确镜像：侧栏
    `x=936..1200`（从右起）、发送按钮落到左侧、唯一一处"越界"是本来就停在画布外的抽屉面板。
    据此把该节改写为"待逐组件复核"，而不是"已知的镜像缺陷"。物理类不自动镜像这一条**仍然成立**，
    但它构成的是未验证区域，不是已确认的故障。
  - 真正的缺陷是**翻译覆盖率**而非排版方向。选择待译键的方式也随之纠正：按前缀（`sidebar.` 等）
    批量取键会漏掉界面上真实可见的文案——"New task""Search""Automations" 分别挂在
    `taskList.*` / `commandCenter.*` / `workspace.*` 下。改用语义反查（按英文值找键）加 DOM 溯源
    （`#task-new-button` → `NewTaskButtonGroup.tsx:40` → `taskList.newThread`）逐条补齐。
  - 实测（隔离实例，独立 app name + userData/HOME + CDP 9234，未触碰用户正在使用的 9229）：
    阿语态 `dir === "rtl"`、`lang === "ar"`，`مهمة جديدة / بحث / الأتمتة / متج…` 等外壳标签全部为阿语，
    输入框占位为 `اسأل Idexal أي شيء`，**可见英文残留计数为 0**。
  - 覆盖率的诚实数字：`en-US` 共 **5859** 键，故 ar/fr 覆盖率为 **208 / 5859 ≈ 3.6%**；其余仍走
    英文回退链（不会泄漏 key）。未译大头是 `settings`（约 1847）与 `chat`（约 1343）。
    `PPT Creation` / `Error Fix` / `Weekly Summary` 一类建议芯片由服务端下发文案，客户端无法翻译，
    需要服务端支持或在前端做键映射，另行处理。
  - 门禁：`pnpm typecheck` exit 0；`pnpm lint` 70 warnings / 0 errors（与既有基线一致，未新增）；
    `pnpm fmt:check` 通过；`architecture:check --changed` violations 0。本次为纯文案表变更，
    未触及桌面子进程代码，故未重复启动实例。

## 3.16.0 (2026-09-26)

### Changes

- **feat(i18n):** 应用语言改为阿拉伯语 / 英语 / 法语，并接入 RTL 排版方向
  - `Locale` 由 `"zh-CN" | "en-US"` 扩展为 `"ar" | "en-US" | "fr" | "zh-CN"`，新增
    `TextDirection` 与 `resolveTextDirection(locale)`：方向**由语言推导**，不作为独立设置项，
    避免出现"阿拉伯语 + LTR"这种自相矛盾的状态。
  - 中文不再出现在语言切换器与设置下拉的可选项里，且不再是默认值：`DEFAULT_LOCALE` 仍是 zh-CN
    但 `localeSchema.default` 改为 en-US，`BotMessageLocale` 默认值同步改为 en-US，
    系统语言未覆盖时（如德语）一律降级英文而不是中文。
  - **zh-CN 暂留类型与 schema 的原因（不是遗漏）**：已落盘的 `setting.json` 可能写着
    `locale: "zh-CN"`，若直接从 `z.enum` 移除会让整份设置解析失败并回落默认值，等于升级即清空
    用户配置。彻底删除需要一次带 `zh-CN → en-US` 迁移的独立改动，已记入待办。
  - 新增 `locales/ar.ts`（68 键）与 `locales/fr.ts`（68 键），覆盖登录、API key 表单、
    会话过期、应用外壳、引导首屏与语言/主题等首次运行可见界面。
  - 关键架构改动：`createIntl` 的查表由 `messages[id] ?? id` 改为
    `目标语言 → en-US → key`。原实现没有编译期校验，漏一个键就把 `login.foo.bar`
    直接渲染给用户；有了回退链，翻译才能按界面逐块补齐，而不必攒成一次不可发布的巨型改动。
  - 语言下拉从逐个写死 `SelectItem` 改为 `LOCALE_SELECT_VALUES` 列表驱动，并修掉
    `SettingsPage.tsx:1278` 的 `if (value === "zh-CN" || value === "en-US")` 硬编码判断——
    该判断会让新语言在设置里"看得见、选了没反应"。
  - 宿主映射收敛到 shared：新增 `isSupportedLocale` 与 `localeFromLanguageTag`，
    桌面渲染进程与 UI 层共用同一份系统语言→界面语言映射，避免新增语言时只改一处。
  - 外部契约刻意**不**跟着 `Locale` 扩张（详见 docs/i18n-rtl.md）：官网订阅页
    `CodingPlanWebviewLocale` 经 `toCodingPlanWebviewLocale()` 把 ar/fr 降级为 en-US；
    分享站 URL 只有 `/cn` 与裸路径两种形状，抽出 `ConversationShareSiteLocale` 保持窄类型，
    避免凭空承诺两个不存在的站点前缀；`community_urls` 与 bot 回复同理。
  - 补齐 ar/fr 文案的界面：桌面 About 窗口、Computer Use 权限拖拽面板、
    macOS Finder 与 Windows 资源管理器的"在 Idexal 中打开"、应用菜单栏全部 51 项。
  - 实测（隔离实例，独立 app name + userData/HOME + CDP 9233，不触碰用户 9229）：
    阿语态 `documentElement.dir === "rtl"`、`lang === "ar"`、计算样式 direction 为 rtl，
    登录面板显示"مرحبًا بك في Idexal / الاشتراكات قريبًا / استخدام مفتاح API"；
    法语态 `dir === "ltr"`、`lang === "fr"`，显示"Bienvenue dans Idexal /
    Abonnements bientôt disponibles / Utiliser une clé API"；两种语言 rawKeyLeak 均为空，
    EXCEPTIONS 0。法语按钮文本经 `textContent` 逐字符复核无损坏（`innerText` 抽取会丢字母，
    那是提取侧的伪影而不是界面缺陷）。
  - 门禁：`pnpm typecheck` exit 0；`pnpm lint` 70 warnings / 0 errors —— 与 HEAD 的
    detached worktree 实测基线（70 warnings / 2617 files）逐项对齐，本次 2619 files 未新增告警；
    `architecture:check --changed` violations 0；oxfmt 通过。
  - 过程中被真实运行抓到、而类型检查抓不到的缺陷：桌面 renderer 不在 `pnpm typecheck` 覆盖范围内
    （`tsconfig.renderer.json` 有 125 个既有错误且不作为门禁），我在 `main.tsx` 与
    `desktopPlatform.ts` 调用了新助手却漏了 import，启动即
    `ReferenceError: isSupportedLocale is not defined`、白屏无按钮。是这次实跑发现的，
    补 import 后复测为 EXCEPTIONS 0。结论：改完桌面侧代码必须实跑，不能只看 typecheck 绿。
  - **明确未完成**：Tailwind 物理工具类不认 `dir`，`packages/ui/src` 实测有 ≥400 处
    `ml-/mr-/pl-/pr-/left-/right-/translate-x-/text-left/rounded-l/border-l/space-x-`
    分布在 197 个文件，不会自动镜像。当前状态是"阿拉伯语可读、文本方向正确"，
    但部分组件的间距与绝对定位仍按 LTR 摆放。改为逻辑属性并逐组件验收是独立一次工程，
    本次不声称"完整 RTL"。
    （**该判断已在 3.16.1 撤回**：末句是从计数推断的，未经观察；同视口几何实测显示外壳已正确镜像，
    真实缺口是翻译覆盖率。计数本身仍然成立，但它指向的是未复核区域而非已知缺陷。）

## 3.15.22 (2026-09-26)

### Changes

- **feat(ui):** 登录入口下线 Z.ai / BigModel 账号连接按钮，改为单个"订阅即将上线"占位
  - 按产品决策：Idexal 现阶段用户自带 API key，走已内置的多家模型供应商；订阅平台的 web
    门户尚未就绪，因此不对外提供账号 OAuth 入口。原来并排的 `Connect to Z.ai (Global)` 与
    `Connect to BigModel (CN)` 两个按钮删除，原位替换为**一个禁用按钮** `Subscriptions coming soon`，
    无链接、无 onClick、不发请求——避免先给用户一个"看着可点、点了没反应"的按钮。
  - 文案进入应用全部语言：`Locale` 只有 `zh-CN` 与 `en-US`（`packages/shared/src/protocol.ts:75`），
    新增 `login.subscription.comingSoon` 两份都写。这里必须人工对齐——`createIntl` 对缺失 key
    只是回退成 key 字面量，**没有编译期校验**，漏一份不会报错、只会把 `login.subscription.comingSoon`
    直接显示给用户。
  - 同步清理随按钮一起失效的死代码与死文案：`LoginPanel` 的 provider 列表渲染、加载态、
    "无可用登录提供方"告警，以及 `resolveVisibleLoginProviders`/`getProviderPriority`/
    `getLoginOAuthButtonMessageId`/`LoginOAuthRegionTag` 四个私有辅助函数；删除
    `login.oauth.{loadingProviders,noProviders,button,button.zai,button.bigmodel}` 与
    已无引用方的 `TID_OAUTH_LOGIN_BUTTON`。
  - **保留** `login.oauth.regionTag.*`：核验时发现 `packages/ui/src/botsUi.ts:72-74` 仍在读取这两个
    key，只按 WelcomeScreen 的引用删除会打断另一处功能。同理保留 `useOAuth` 的
    waiting/error/retry/cancel 状态机——`loginEntryRequest` 仍会从设置页发起指定 provider 的授权，
    登录入口继续负责统一展示。删的是按钮，不是这条链路。
  - 新增 `docs/login-entry.md` 固化产品规则与验收场景（AGENTS.md 要求先写 spec 再改行为）。
  - 实测于隔离实例（`IDEXAL_DESKTOP_APPLICATION_NAME=Idexal QA` + 独立 userData/HOME + CDP 9232，
    不触碰正在运行的 9229）：英文态按钮为 `Subscriptions coming soon`(disabled) +
    `Use API key`，两枚 302×40；切到 `zh-CN` 重载后为 `订阅功能即将上线` + `使用 API key`，
    `rawKeyLeak=false` 即未出现 key 字面量；`Connect to Z.ai`/`Connect to BigModel` 文本命中 0。
    点击序列：点占位按钮面板无变化 → 点 `使用 API key` 进入表单（`apiKeyInput=true`，5 枚按钮）→
    点 `取消` 回到两按钮面板；全程 `EXCEPTIONS 0`。
  - 门禁：`pnpm typecheck` exit 0；`pnpm lint` 70 warnings / 0 errors（与改动前基线一致，无新增）；
    `oxfmt` 4 个改动文件通过；`architecture-check --changed` violations 0 / new 0。

## 3.15.21 (2026-09-26)

### Changes

- **feat(web):** 公开分享页的下载入口切到官方域名 idexal.com
  - 此前连续几轮把"官网尚未部署"当作不改的理由记录在案，这个前提是错的。实测
    `https://idexal.com` 返回 **200**，页面标题为 `Idexal — AI products that build with you`，
    域名解析到 Cloudflare。之前的探测输出 `http=000` 是一次请求抖动，不是站点不可达。
  - 因此把 `ConversationShareLandingPage.tsx` 的 `IDEXAL_DOWNLOAD_URL` 由上游域名改为
    `https://idexal.com`。仍指根路径而非 `/download`：实测 `/download` 返回 404，
    与该文件既有注释"站点首页本身就是下载入口"一致。
  - 文档入口**不改**并写明代价：`productDocs.ts` 仍指向上游文档站，因为官方站目前只有根路径可用——
    实测 `/docs`、`/docs/`、`/documentation`、`/guide`、`/guides`、`/handbook`、`/blog`、`/help`、`/faq`
    全部 404，换成 `idexal.com/docs` 会把可用链接变成死链。已在源码注释里记下这组探测结果与切换条件。
  - 同时完成对外身份字符串的逐项核验：`contact@idexal.com` 确认存在于 `README.md`(2)、
    `README.en.md`(2)、`NOTICE.md`(1)、`packages/desktop/electron-builder.config.js`(2)，
    这些文件里没有任何非 idexal 邮箱；`THIRD-PARTY-NOTICES.md` 与 `third-party/**` 下的第三方
    版权邮箱属法律署名，按 Apache-2.0 原样保留、不得改写。

## 3.15.20 (2026-09-26)

## 3.15.20 (2026-09-26)

### Documentation

- **docs:** 审计已发布的 Releases 一致性，并记下"所有 release 都没有可下载产物"这一事实
  - 用 `git credential fill` 取本机凭据（不使用聊天里粘贴过的 token）调 GitHub Releases API 逐个比对：
    本地 `v3.15.*` 标签 20 个、GitHub releases 20 个，`tagsWithoutRelease` 与 `releasesWithoutTag`
    均为空，即标签与发布一一对应、无孤儿；全部 `draft=false`、`prerelease=false`，
    命名统一为 `Idexal vX.Y.Z`，正文长度 481–1581 字符，`latest` 指向 v3.15.19。
  - 发现的真实缺口：**20 个 release 的 assets 全部为 0**，也就是从 GitHub 上下载不到任何安装包。
    构建产物确实存在（`packages/desktop/dist/Idexal Preview-3.15.14-win-x64_TEST.exe`，150,462,088 字节），
    但从未上传。
  - 不擅自上传的理由（记录以免被当成遗漏后随手补上）：产物未签名；文件名带 `_TEST`
    （来自 `desktopArtifactEnvSuffix`，是后端环境标记而非品牌残留），是否以该形态对外发布属产品决策；
    且现存产物对应 3.15.14，落后于当前 3.15.19，直接上传会发布一个与最新代码不符的安装包。
    上传 150MB 二进制到公开仓库也是对外可见、体量大的动作，需先确认。
  - 同时记录一条测试环境结论：用无后端的静态服务器托管 `packages/web/dist` 时，控制台必然出现
    `WebSocket connection to 'ws://127.0.0.1:4179/ws' failed: Unexpected response code: 200`——
    静态服务器把 `/ws` 当 SPA 回退返回了 index.html。这是测试装置缺后端所致，不是产品缺陷；
    生产包本身加载、挂载、标题与图标选择均正常。

## 3.15.19 (2026-09-26)

### Bug Fixes

- **fix(web):** 标签页图标改由**应用主题**选择，撤回 v3.15.18 的 media 查询方案（实测无效）
  - 补做 v3.15.18 明确承认没做的端到端验证：跑 `pnpm --filter @idexal/web build` 出生产包，
    用静态服务器托管后在真实 Chromium 里加载，读 `matchMedia` 与实际存活的 `link[rel=icon]`。
  - 结果推翻上一版的修法：本机系统为浅色而应用默认深色（`html.class = dark theme-zai-dark`、
    脚本写入 `colorScheme: dark`，标签栏因此是深色），而 `prefers-color-scheme` 跟的是**系统**设置，
    浏览器于是选中 light 变体（深色笔画）放到深色标签栏上——**等于没修**。
    这不是边缘情况，而是本应用默认主题下的常态。
  - 修复：两个变体仍作为 `<link data-idexal-theme="dark|light">` 声明，但不再用 media 属性，
    改由首屏主题脚本（原本就已解析出 `finalTheme` 并同步 `theme-color` 与 `colorScheme`）
    按同一结论移除不该生效的那条，使笔画颜色始终与标签栏底色相反。
  - 端到端复核两个方向：应用深色时只剩 `data-idexal-theme=dark`、不透明像素平均亮度 197（白色笔画）；
    置 `localStorage['idexal-theme']='light'` 重载后只剩 `=light`、亮度 70.9（深色笔画），
    且 `theme-color` 同步为 `#f8f8f8`，`#root` 正常挂载、标题为 Idexal。两个方向都对，说明不是写死。
  - 生产构建产物层面也确认过：`packages/web/dist/index.html` 保留两条链接且载荷与官方变体一一对应，
    说明 Vite 处理 HTML 不会破坏内嵌 data URI。
  - 残余限制（记录）：图标在首屏按**已持久化**的主题选定；会话内切换主题不会即时更换标签页图标，
    这与该脚本对 `theme-color` / `colorScheme` 的既有处理方式一致。要即时跟随需在应用主题服务里加一条
    更新链接的副作用，属新增行为，未在本轮擅自引入。

## 3.15.18 (2026-09-26)

### Bug Fixes

- **fix(web):** 标签页图标改用与配色匹配的官方变体，修掉标志主笔画在深色标签栏下看不清
  - 缺陷：`packages/web/index.html` 内嵌的 32×32 图标取自官方 **light** 变体（深色笔画、透明底），
    而本应用声明 `<meta name="color-scheme" content="dark" />`、`theme-color #161616`、
    `DEFAULT_THEME = "zai-dark"`，标签栏默认即为深色，于是标志的白色对应笔画缺失、主笔画与背景同化，
    标签页上只剩蓝色部件，读起来像一个坏掉的标志。
  - 判据不是靠肉眼猜：把内嵌 base64 解码后与 `logo_idexal/dark_icon_idexal.png`、
    `light_icon_idexal.png` 同尺寸合成到同一底色做像素比对，并排渲染确认现用图标缺的正是 dark 变体
    里那条白色笔画，与 light 变体一致。
  - 修复：改为两条带 `media="(prefers-color-scheme: dark|light)"` 的 `<link rel="icon">`，
    分别取官方 dark 与 light 两个变体——两个变体本就是为此成对提供的，不新造品牌样式。
    生成时先按 alpha 外接框裁掉留白再等比缩到 32×32，避免小尺寸下标志被四周透明边距稀释。
  - 验证：从**文件**而非变量回读两条链接的载荷，与两个官方变体做同底色差值比对，
    `media=dark` 命中 dark 变体、`media=light` 命中 light 变体，均 OK；`pnpm fmt:check` 通过、
    oxlint 70 warnings / 0 errors、`pnpm typecheck` 退出码 0 且无 `error TS`、architecture:check 0 违规。
  - 已知残余限制（记录不掩盖）：`prefers-color-scheme` 跟随**系统**设置，而标签栏底色由脚本按
    **应用内** store 主题写入 `documentElement.style.colorScheme`，两者可不一致；
    `packages/web/public/favicon.ico` 是浏览器兜底请求、无法用 media query 选择，已统一改为 dark 变体
    以匹配应用默认深色。彻底与主题无关的做法是给标志加自有底板（应用图标那种深色圆角方块），
    但那属于品牌样式决策，需先定方案再实施。

## 3.15.17 (2026-09-26)

### Documentation

- **docs:** 把品牌域名残留拆成“机器端点保留 / 人点的链接待决”，并定位两处真实缺口
  - 全仓扫 `zcode` 的命中必须先分类才有意义：`zcode|z-code` 与含 `z.ai`/`智谱` 的模式命中数差异巨大，
    因为 Z.ai / BigModel 是本应用支持的第三方模型供应商，与旧品牌无关，混计会误判成“改名没做完”。
  - 分类标准取“该字符串是被程序消费还是被人点击”。机器端点一律保留原值（对端不在本仓库，改名即断
    登录 / 网关 / 插件市场 / 自动更新）：`idexalEndpoint.ts:3`、`remoteCdn.ts:4`、
    `plugin-marketplaces.ts:37`、`zaiProviderConfig.ts:22`、`bigmodelProviderConfig.ts:19`、
    `featureSuggestedPrompts.ts:11`，以及 `zcode-plan`、`zcode_official`、`zcode-artifact://`、
    `zcodejwttoken`、`X-ZCode-*` 等协议字面量；NOTICE 与本文件的新旧对照属溯源，同样保留。
  - 查出两处**人点击的**链接仍指向旧品牌域名，是真实品牌缺口：
    公开分享页 `ConversationShareLandingPage.tsx:91` 的 `IDEXAL_DOWNLOAD_URL` 渲染成 “Download Idexal”
    按钮（`:545`、`:678`），以及应用内“文档”菜单经 `App.tsx:693` 打开
    `productDocs.ts:2` 的 `IDEXAL_PRODUCT_DOCS_URL`。
  - 明确不改的理由与前置条件：`idexal.com` 尚未部署，直接替换会把可用链接变成死链，属于用品牌问题换
    功能问题。记录为“待站点上线并提供下载与文档路径后仅替换这两处”，并提示 `:90` 既有注释所写的
    “根路径才是下载入口、无 `/download` 路径”这一假设迁移时需重新确认。

## 3.15.16 (2026-09-26)

### Documentation

- **docs:** 补测首启引导三步与打包依赖闭包，并纠正一条关于配置目录的错误结论
  - 首启引导（`packages/ui/src/onboarding/`）此前从未实测，现以打包版 + 合成 `Ctrl+Shift+O`
    （`shortcutCommands.ts:99` 默认键，监听在 `window` capture 阶段）打开并逐步量测：
    三步文案品牌均已读作 Idexal（“How would you like Idexal to show its work?”、
    “Let Idexal remember your preferences and work context.”），每步可见文本块重叠 0、
    越界 0、无横向溢出、`Runtime.exceptionThrown` 全程 0；主视觉复用 `IdexalStartupLogoBadge`，
    与启动闪屏同一组件，故深浅色选图与主界面同源。旧记录称其为 “OnboardingDialog” 有误，
    仓库中不存在该标识符，真实入口是 `Root.tsx:1015` 常驻挂载的 `OccupationOnboarding`。
  - 判定并保留一处第三方产品名：步骤 3 “Migrate conversation history from Claude Code” 是迁移功能
    指向外部真实产品，不是 ZCode 旧品牌残留，改名会破坏语义。
  - 记录一条无障碍观察（不改）：该全屏向导 DOM 中无 `role="dialog"` / `aria-modal`，
    屏幕阅读器不会按模态处理；补语义属行为变更，按仓库约定需先改 spec。
  - 复核构建日志 `[afterPack] missing runtime modules count=44`：确认是注入成功的信息行而非缺陷。
    机制见 `electron-builder.config.js:304/359/364-397`（补齐 hoisted 运行时闭包，历史上漏 `undici`、
    `pngjs`、`protobufjs` 会导致已安装应用主进程启动即崩）；构建期另有 `bundle.mjs:641` 无条件硬校验
    （日志 `bundle:verify-runtime-dependencies end duration_ms=587`，无告警）。另做产物级独立复核：
    对 `app.asar`（30630 条目）跑同一闭包逻辑，15 个闭包根展开 75 个模块，缺失 0、不可解析 0；
    并用不存在的包名做反向对照（返回 false）与 4 个真实包名做正向对照（返回 true），
    证明 “0 缺失” 不是空跑。
  - **纠错**：v3.15.15 曾记“打包版与开发版共用同一配置目录，启动会恢复用户真实会话”。实测推翻：
    `desktopRuntimeEnv.ts:61-66` 按形态给出 `Idexal Dev` / `Idexal Preview`，`main/index.ts:261` 据此
    `app.setName`，两者默认 userData 目录不同；本次 `Idexal Preview` 被写入而 `Idexal Dev` 未变，
    且打包版起来是未登录英文首启态。原结论最可能是把用户自己窗口的内容误记为打包版窗口。
  - **机制纠正**：`--user-data-dir` 对打包版无效（主进程自行解析运行时数据路径），本次传入的目录
    始终 0 字节即为反证；隔离要依赖 Dev / Preview 天然分离，而非该开关。

## 3.15.15 (2026-09-26)

### Documentation

- **docs:** 用重新出的 3.15.14 包做了一次实机复核，并记下读版本资源的时机陷阱
  - `pnpm bundle:desktop -- --os win --arch x64` 重新产出 `win-unpacked/Idexal Preview.exe`
    与 `Idexal Preview-3.15.14-win-x64_TEST.exe`（150,462,088 字节）。
  - 陷阱复现并纠正：构建中途读该 exe 得到的是 `ProductName=Electron / CompanyName=GitHub, Inc.
/ FileVersion=41.0.3`，因为 afterPack 的 asar 完整性与版本资源写入发生在文件落盘之后；
    等日志停止增长后重读才得到 `Idexal Preview / Idexal / 3.15.14 / 3.15.14.0`。
    与 v3.15.5 那次误报同源，故明确写入文档。
  - 直接运行打包 exe（`--remote-debugging-port=9230` 与用户已开实例隔离）：UA `IdexalPreview/3.15.14`、
    窗口标题 `Idexal`、深色主题下标题栏与草稿水印均取带 hash 的官方位图 `mark-dark-*.png`、
    水印 `alt="Idexal"`、输入框占位 “Ask Idexal anything…”、模型选择器 `idexal/idexal-code`；
    截图确认标志与问候语无压叠、渐隐生效。
  - 记录副作用：打包版与开发版共用配置目录，启动会恢复用户真实会话并在屏幕上多开一个窗口，
    因此不是只读验证；复核后只对自己启动的那个实例发 `Browser.close`（不用 `taskkill`，
    本机还有其他 Electron 应用），并确认用户实例仍在。

## 3.15.14 (2026-09-26)

### Documentation

- **docs:** 确认 3.15.13 的挂载期收起不会在桌面端误触发
  - `WorkspaceShellLayout` 桌面与 Web 共用，故需证明新增的挂载期执行不会改变桌面正常窗口下的行为。
    以**只读**方式取现成桌面渲染进程的几何（不导航、不重载、不打断正在进行的会话）：
    窗口 1536×824、conversation 实测 691px、侧栏 264 可见、`scrollWidth === 1536` 无溢出。
  - conversation 691px 远高于两个阈值（侧栏 360 / 右侧面板 480），因此桌面在真实窗口尺寸下不可能进入
    挂载期收起分支；只有把窗口缩到 conversation < 360 才会触发，而这与用户手动 resize 后本就会发生的
    收起一致，属既有语义而非新行为。
  - 记录手法要点：判断“响应式布局是否缺失”，先在**同一视口**比较冷加载与任意一次 resize 之后的状态；
    不一致即说明逻辑存在且正确、只是未被触发，属初始化缺陷，不应升级为产品决策问题。

## 3.15.13 (2026-09-26)

### Bug Fixes

- **layout:** 修复手机 Web 冷启动时输入框 Send 按钮被裁出视口且无法触达
  - 现象：390×844 冷启动 Web 目标进入主壳后，侧栏保持展开占 195px，
    `.chat-composer-input-surface` 为 `x=216, width=271`（右边界 487）越出视口；卡片带
    `overflow-hidden` 且 `documentElement.scrollWidth === 390`（无横向滚动可补救），于是
    `Send`（`x=446..474`）、模型选择器、`On`、分支 chip 全部在屏外且无法触达。
  - 根因：响应式收起逻辑本身正确且已实现，缺的只是挂载期那一次执行——
    `runAutoCollapseForWindowResize` 只注册在 `window` 的 `resize` 监听
    （`WorkspaceShellLayout.tsx:524`），从不随 mount 运行，页面“一打开就是窄视口”时无人触发。
    判别依据是同一视口对照：390 冷加载 conversation 318（已低于阈值 360）却不收起；
    同一 390 下任意一次 resize 后侧栏归零、`Send` 右边界 346 可达。
  - 修复：注册 resize 监听后补一次挂载期执行，用双层 `requestAnimationFrame` 等首屏布局稳定再读宽度，
    只跑一次且不引入 ResizeObserver，从而保留原注释声明的语义（只按 conversation 实际宽度收起、
    不与用户手动打开面板对抗）。
  - 验证：390 冷加载侧栏归零、surface 342、`Send` 位于 x=318..346 可达、错误数降为 2（仅已记录的
    `window-controller`）；1280 冷加载无回归（侧栏 264、conversation 1010、`Send` 可达）；
    `pnpm typecheck` 0 错误、oxlint 70 warnings / 0 errors、oxfmt 与 `architecture:check --changed` 通过。
  - 同时纠正 3.15.11 / 3.15.12 对本条的判断：当时认定“需要产品先定方案的响应式设计缺口”故只记录不实现，
    实际是初始化缺陷。两次误判（“移动端已实现只是没接线”“需新写渲染与状态逻辑”）与其证伪证据一并留在
    `docs/rebrand.md`，并补上方法教训：断言“设计缺失”前先用同一视口做“冷加载 vs resize 后”对照，
    不一致即说明布局逻辑存在且正确、只是未被触发。

## 3.15.12 (2026-09-26)

### Documentation

- **docs:** 把 390px composer 缺陷查到根因层，并纠正两条我自己的错误假设
  - 证伪“移动端已实现只是没接线”：`V4ComposerToolbar` 的 `isMobileViewport` 是死 prop（只在类型
    `:334` 与解构默认值 `:372` 出现，组件体从未读取），工具条里不存在任何手机布局分支可接；
    三个 `isMobileViewport: false` 字面量（`ConversationComposer.tsx:827/832`、`SessionPane.tsx:2083`）
    只喂 `ComposerAutoFocusOptions` 的聚焦决策，与布局无关。
  - 证伪“窄屏收起为已有 rail”：`WorkspaceSidebarCollapsedRail` 只有定义与
    `WorkspaceSidebar.tsx:156` 的再导出，主壳渲染路径没有任何使用点，收起需要新写渲染与状态逻辑。
  - 结论修正：让 `Send` 在 390px 可达是一次真正的响应式设计工作，且改的是桌面共用的 composer 组件，
    因此仍按仓库规则先与产品对齐，不在未对齐时叠加兜底分支。
  - 补充阈值量测：390px 干净加载侧栏 195 / `Send` 右边界 474 不可达；768px 侧栏 264 / `Send` 可达；
    480px `aside` 宽度 0 / `Send` 可达。480 与 390 的反差说明侧栏宽度不是纯 CSS 断点驱动，
    其收起触发条件尚未定位。
  - 同时修正 3.15.11 条目里“收起为已有 CollapsedRail”的措辞，并补回被误删的“跨渲染层矩形相交”
    假阳性教训（水印与 Settings 面板文案的 7073px² 重叠属不同层，不是缺陷）。

## 3.15.11 (2026-09-26)

### Documentation

- **docs:** 记录手机 Web 宽度下 composer 的 Send 按钮不可达，并补全浅色主题与引导流程复核
  - 390×844 冷启动 Web 目标实测：侧栏展开占 195px，`.chat-composer-input-surface` 为
    `x=216, width=271`（右边界 487）已越出视口，内层卡片 `overflow-hidden` 且
    `documentElement.scrollWidth === 390`（无横向滚动可补救），于是 `Send`（`x=446..474`）、
    模型选择器、`On` 与分支 chip 被裁到屏外且无法触达。链路为 `group/toolbar flex items-end gap-3`
    不换行 + 右侧组 `shrink-0` + 内容列未约束 composer 宽度。属上游小屏适配缺失，非品牌改动引入；
    两种修法（约束宽度并让工具栏收纳 / 窄断点自动收起侧栏为已有 CollapsedRail）取舍不同，
    按仓库规则先与产品对齐，不擅自叠加兜底分支。
  - 同轮复核通过：Settings → Appearance 切到 Light 后 `.dark` 移除、`theme-zai-light` 生效、
    品牌位图为 `mark-light.png` 且 `data-v4-draft-logo="light"`（v3.15.8 的订阅修复在 Web 浅色路径同样成立）；
    完整走完 OccupationOnboarding 三步直至主壳，全程无 hook 顺序告警、无错误边界接管，
    即 v3.15.9 的修复在真实交互路径上成立。
  - 记录一次自我纠正的假阳性：水印与 “Choose the app theme and…” 算出 7073px² 重叠，但后者属于叠在主壳之上的
    Settings 面板，与下层草稿空态水印不在同一渲染层；关闭 Settings 后重测才得到上面可复现的结论。
    做矩形相交前先确认两个盒子同层。

## 3.15.10 (2026-09-26)

### Documentation

- **docs:** 补齐 3.15.9 hook 修复的桌面端回归复核与两条测量陷阱
  - 三个 service hook 桌面与 Web 共用，因此用 `pnpm dev:desktop` 全新构建冷启动后经 CDP 抓取渲染进程日志复核：
    无 hook 顺序告警、无 `useTabStore 必须在 TabStoreProvider 内使用`、无错误边界接管；
    主题为 `dark theme-zai-dark platform-windows-desktop` 时标题栏品牌图为 `mark-dark.png`（一致），
    窗口标题 `Idexal`，侧栏与输入区正常渲染，截图确认无空白与文字压叠。
  - 记录两个会制造假信号的测量陷阱：`pre-dev` 的 `rmSync('./out')` 会删掉**正在运行的**实例所依赖的
    `out/preload/index.cjs`，从而抓到“preload ENOENT + window.idexal undefined”的假错误；
    上一次 dev 的 vite 占用 5174 会让新实例直接启动失败，必须先确认端口空闲再归因。
  - 新增已知非品牌问题条目：`[Root] 刷新 Provider Runtime 失败: Idexal Built-in cdn: invalid response`
    来自 host 侧内置 provider release 下载失败，本机对外部 CDN 不可达（与 Electron 镜像 DNS 失效同源），
    属环境限制；同环境下已登录会话仍可选用 `idexal/auto/best-coding` 正常执行任务，不能据此判定运行时不可用。

## 3.15.9 (2026-09-26)

### Bug Fixes

- **hooks:** 修复 `workspacePath` 由空变有时 hook 数量变化导致 OnboardingDialog 子树崩溃
  - 现象：Web 端 390×844 冷加载主界面后，控制台固定报
    `React has detected a change in the order of Hooks called by OnboardingDialog`
    （第 8 个由 `useRef` 变 `useContext`），随后
    `TypeError: Cannot read properties of undefined (reading 'length')`
    抛在 `areHookInputsEqual → useStore → useTabStore`，被
    `ScopedErrorBoundary:onboarding-dialog` 接走。全新端口、未热更过模块的冷启动可复现，
    因此不是 Vite Fast Refresh 造成的假信号。
  - 原因：`useIdexalSessionService` / `useIdexalAgentService` / `useIdexalTaskService` 把
    hook 写在三元分支里——`workspacePath ? useWorkspaceServices(...) : useServices()`。
    前者展开成多个 store 读取，后者只有一个 `useContext`。Web 首帧拿不到 `workspacePath`，
    解析完成后才有，于是宿主组件两次渲染的 hook 数量不同，React 用错槽位比较依赖数组直接崩。
  - 修复：三个 hook 改为无条件调用 `useServices()` 与 `useWorkspaceServices(...)`，只在**取值**时
    按 `workspacePath` 分派。保持原语义不变：`workspacePath` 为空时仍返回 context services，
    而不是 `useWorkspaceServices(null)` 会带回的 base services。
  - 验证：同一冷启动路径下错误数由 5 降为 2，剩余 2 条是已记录的桌面专属
    `window-controller` 通道超时；`pnpm typecheck` 0 错误、`pnpm lint` 70 warnings / 0 errors、
    `architecture:check --changed` 0 violations。
- **web:** 去掉浏览器标签标题里的内部接线字样
  - `packages/web/src/main.tsx` 无条件把标题写成 `Idexal - Web + Server`，启动失败页写成
    `Idexal - Web`。“Web + Server”是本仓库的内部部署组合，会漏进标签页、浏览历史、书签和
    任务切换器。正常路径改由 `index.html` 提供 `Idexal`，失败页也只保留 `Idexal`；
    登录回调页的 `Idexal - Sign In` 属页面文案，保持不变。

## 3.15.8 (2026-09-26)

### Bug Fixes

- **branding:** 修复 App theme 选 “System” 时品牌位图与已生效主题不匹配
  - 现象：桌面端把应用主题设为 System（系统为浅色）时，`documentElement` 已是
    `theme-zai-light`，而标题栏 logo、侧栏收起栏与草稿页水印三处品牌图仍取 `mark-dark.png`，
    等于把白色标志画在浅色底上；刷新后依旧，属稳态问题不是过渡闪烁。
  - 原因：品牌选图走 `resolveTheme(store.theme)`，`"system"` 会在 React 渲染期再查一次
    `matchMedia('(prefers-color-scheme: dark)')`；桌面端该媒体值由主进程按 nativeTheme 异步回推，
    与 `applyTheme` 写 `.dark` 类的时机不同步。同一“当前主题”存在两个判定入口，就会互相不一致。
  - 修复：新增 `useIsDarkThemeApplied()`，用 `useSyncExternalStore` 订阅 `<html>` 的 `.dark` 类，
    让品牌选图与 CSS 共用同一事实来源；五处消费方（`App.tsx` 顶栏 logo 与主题切换目标、
    `WindowsTopLeftLogo`、`WorkspaceSidebarCollapsedRail`、`IdexalWordmarkLogo`、
    `ConversationDraftEmptyState`）全部改用该 hook，并删掉被它取代的 `inferAppliedTheme`。
    订阅 DOM 类同时消除了 StoreProvider 渲染边界问题，启动遮罩不再需要容错式 store 读取。
  - 复核：三种偏好逐一实测“类名 vs 实际取图”一致性——`zai-dark` → `dark` 类 + `mark-dark.png`、
    `zai-light` → 浅色类 + `mark-light.png`、`system` → 浅色类 + `mark-light.png`，
    三者 `mismatchCount` 均为 0，0 运行时异常、无横向溢出；验证后已把主题偏好还原为 `zai-dark`。

## 3.15.7 (2026-09-26)

### Bug Fixes

- **branding:** 修复深色主题下草稿首页问候语压在满强度品牌标志上看不清
  - 现象：`ConversationDraftEmptyState` 的大号品牌水印只在浅色主题带渐隐遮罩，深色主题既不透明也无遮罩；
    实测问候语与标志的重叠面积两个主题都是 `14400px²`，浅色下重叠区已被遮罩淡到几乎不可见，
    深色下标志仍是 `opacity:1` 无遮罩，白色笔画直接压在 “Noon break?” 文字上。
  - 原因：我此前写下的注释断言“夜间资源本身已带渐变和透明度，再叠遮罩会重复变淡”。实测两张官方位图的
    逐行 alpha 曲线完全一致（10%=103、30%=157、50%=125、70%=166、90%=67、98%=67），
    深色件并没有自带渐隐，该前提不成立，因此按主题分支去掉遮罩是错的。
  - 修复：遮罩与透明度不再跟主题分支，深浅两套统一 `opacity-70` + 向下渐隐；注释改为记录实测 alpha 依据。
  - 复核：修复后深色主题实测 `opacity:0.7`、`masked:true`，截图确认问候语清晰，0 运行时异常、无横向溢出。
  - 附带取证：`WindowsTopLeftLogo`（20×20 标题栏）与草稿水印在应用主题切换时确实换图——
    深色选 `mark-dark.png`、浅色选 `mark-light.png`，`data-v4-draft-logo` 同步为 `dark`/`light`。

## 3.15.6 (2026-09-26)

### Documentation

- **branding:** 把品牌素材的一致性从“看起来对”升级为逐像素溯源证明
  - 四个 UI 位图与官方 `logo_idexal` 素材 rgb/alpha 差均为 `0.000` 且尺寸一致；两个 HTML 启动壳的
    `/brand/idexal-mark-dark.png` 与官方深色 icon sha256 相同；Web 内联 favicon 与品牌 32px 帧差 `0.000`。
  - `build/icon.png` 与 `master-macos-padded-1024.png` 差 `0.000`；`icon_windows.png` 与
    `master-fullbleed-1024.png` 直接比是 `24.588`，裁到内容外接框归一化后只剩 `0.529`，
    说明 Windows 图标是同一图形换内边距，不是另一套设计。记录该归一化步骤，避免下次把版式差异误报成换图。
  - 枚举了渲染层 6 个品牌组件、2 个 HTML 启动壳与主进程窗口/托盘/通知图标的全部取图路径，均指向上表素材。
  - 真机复核：登录页品牌图在深浅两主题下均为官方深底白墨 mark，裁区亮度标准差 `99.0`（高对比可见）。

## 3.15.5 (2026-09-26)

### Documentation

- **branding:** 补齐 Windows 打包产物的品牌取证，并记录 About 窗口不放 wordmark 的实测理由
  - 实测 `dist/win-unpacked/Idexal Preview.exe`：PE 资源已是 `ProductName=Idexal Preview` /
    `CompanyName=Idexal` / `FileVersion=3.15.4`，取其 32px 图标与 `build/icons/32x32.png` 逐像素平均差
    `0.000`（与 Electron 默认图标差 `106.769`），证明 exe 图标确实换成官方品牌图标。
  - 实测 NSIS 产物 `Idexal Preview-3.15.4-win-x64_TEST.exe`：`FileDescription=Idexal Desktop App`，
    图标取自 `build/icon_installer.ico`（与源素材差 `13.1`，为 1024→32 重采样误差）；`_TEST` 后缀来自
    `desktopArtifactEnvSuffix` 的后端环境标记，不是品牌残留。
  - 记录打包机限制：`cdn.npmmirror.com` 与 `registry.npmmirror.com` 本机 DNS 不可解析，
    `bundle.mjs` 的 binaries mirror 回退只覆盖 404、不覆盖 DNS 失败，需显式指定可直达的镜像。
  - 取证教训：构建进程覆写 exe 期间读取会拿到覆写中途的副本，一度据此误判“图标没换”；
    必须先确认构建退出或复制到稳定路径再测。
  - About 窗口经实测纵向余量为 0（`scrollHeight == clientHeight == 280`），塞入 132×44 的 wordmark
    会把按钮推到视口外，属版式设计改动，不在品牌重构范围内。

## 3.15.4 (2026-09-26)

### Bug Fixes

- **branding:** 修复 3.15.3 启动遮罩崩溃
  - 现象：真机启动后 `AppErrorBoundary` 弹出 “The app ran into a problem”，
    错误为 `useIdexalStore 必须在 StoreProvider 内使用`，组件栈指向 `IdexalWordmarkLogo` ← `RootStartupLoading`。
  - 原因：`RootStartupLoading` 由 `Root.tsx` 的 `isStartupRenderBlocked` 分支渲染，位置低于同文件挂载的
    `<StoreProvider>`，所以 3.15.3 引入的 store 读取在 Provider 之外抛错。`pnpm typecheck` 查不出这条边界，
    只有真机启动才会暴露；这次是自己改出来的回归，已按实测修正。
  - 修复：四个品牌组件统一改用 `useIdexalStoreWithDefault((s) => s.theme, inferAppliedTheme())`，
    有 Provider 时随主题响应式更新，无 Provider 时退回 `applyTheme` 已写入的 `.dark` 类推断而不抛错；
    `inferAppliedTheme` 对 `document` 缺失（SSR/单测）也返回默认深色。
  - 复核：CDP 重连真机，启动遮罩在两套主题下都正常渲染——深色主题取 `logo-dark.png`、
    浅色主题取 `logo-light.png`（该轮 `matchMedia('(prefers-color-scheme: dark)')` 为 false，
    即旧 CSS 方案会把深色墨压在深色底上），登录页无 error boundary、控制台 0 报错。
  - 附带：wordmark 加 `aspect-[1136/380]`，消除冷加载首帧 `h=0` 造成的一次位移（实测已为 `112×37.5`）。

## 3.15.3 (2026-09-26)

### Features

- **branding:** 官方 wordmark 落地到应用内启动遮罩
  - `RootStartupLoading` 在品牌徽标下方渲染 `IdexalWordmarkLogo`（`w-28`，实测 112×37.5px），
    这是应用内唯一没有产品名文字的大尺寸品牌面；登录页与引导页的方形深色 logo 壳按 DESIGN.md
    “Brand icon backplates” 保留，其下已有 “Welcome to Idexal” 文案，塞横向组合标会变成重复。
  - 生产构建复核：`mark-light/dark-*.png` 与 `logo-light/dark-*.png` 四张全部落盘并被主 JS chunk 引用，
    此前 wordmark 因组件无调用方而被 tree-shaking 移出产物。

### Bug Fixes

- **branding:** 修复品牌位图深浅切换跟随操作系统而非应用主题
  - 现象与实测：本仓没有 class 版 dark 变体（`packages/ui/src/styles.css` 只声明 platform 类变体，
    `shadcn/dist/tailwind.css` 也没有），因此 `dark:` 编译为 `@media (prefers-color-scheme: dark)`，
    见 `packages/desktop/out/renderer/assets/styles-*.css`。在浏览器里给祖先元素加 `.dark` 或改
    `color-scheme: dark` 都不会让 `dark:hidden` 生效（实测 `matchMedia` 仍为 false、display 仍为 block）。
  - 影响：桌面端因为 `desktopMainIpcPlatform.ts` 会写 `nativeTheme.themeSource`，媒体查询恰好跟应用主题一致，
    问题被掩盖；Web/手机远控端在应用主题与系统偏好相反时会把深色墨压在深色底上，标志直接看不见。
  - 实测复核（CDP 直连运行中的桌面应用）：系统为浅色、应用主题为深色时 `documentElement.className`
    是 `dark theme-zai-dark platform-windows-desktop`，而 `matchMedia('(prefers-color-scheme: dark)')` 仍为
    `false`，即桌面端启动阶段同样会命中这个缺陷；仓库其余 122 处 `dark:` 工具类的这一上游主题机制问题
    已登记在 `docs/rebrand.md`，本版本只修品牌位图选图，不全局改写 `dark` 变体语义。
  - 修复：`IdexalWordmarkLogo`、`WindowsTopLeftLogo`、`IdexalEmptyStateLogo`、`WorkspaceSidebarCollapsedRail`
    改为按 `useIdexalStore((s) => s.theme)` + `resolveTheme(theme)` 显式选图，与仓库既有的
    `GlmMonochromeIcon`、`App.tsx` `appLogoUrl` 同一套做法，两个目标表现一致且不再依赖 CSS 变体。
  - 同时更正 3.15.0 留下的错误注释（原文声称 `.dark` 类由主题系统切换、与 prefers-color-scheme 无关）。

## 3.15.2 (2026-09-26)

### Documentation

- **rebrand:** 补充品牌视觉验收口径与已知非品牌问题
  - 新增验收项 6：以 `pnpm exec vite build` 的产物为证，要求 `mark-light-*.png` / `mark-dark-*.png` 带哈希落盘并被 JS chunk 引用。
  - 记录实测缺口：wordmark 两套 PNG 仅被 `IdexalWordmarkLogo` 引用，而该组件上游即无调用方，会被 tree-shaking 移出产物；其在项目内的实际落点是 README 双语横幅与 macOS DMG 背景，应用内版式落点属 DESIGN.md 的设计决策。
  - 新增「已知非品牌问题」小节，登记 3.15.1 修复的 Windows `dev:web` 引号问题、About 窗口 CSP 只能内联 data URI 的约束、未登录时 Agent 运行时守卫属预期、以及 `window-controller` 通道在 Web 目标超时属平台差异。

## 3.15.1 (2026-09-26)

### Bug Fixes

- **server:** 修复 Windows 下 pnpm dev:web 无法启动
  - 现象：tsup 报 Cannot find dist/entry-http.js'（结尾多出一个单引号），web 开发服务整体退出。
  - 原因：dev 脚本用单引号包裹 --onSuccess 参数，cmd.exe 不把单引号当作引号，参数被原样带上尾随 '；
    而 dist/entry-http.js 实际存在，因此不是构建缺失而是 shell 引号差异。
  - 修复：改用双引号包裹，cmd.exe 与 POSIX shell 都能正确解析，不改变 macOS/Linux 行为。

## 3.15.0 (2026-09-26)

### Features

- **branding:** 完成从上游 ZCode 到 Idexal 的全量品牌重构
  - 产品名 `ZCode` → `Idexal`，根包名 `zcode` → `idexal`，桌面窗口标题、设置页与*about* 展示统一为 Idexal。
  - 官网切换为 `https://idexal.com`，仓库切换为 `https://github.com/idexal/idexal`，官方联系邮箱统一为 `contact@idexal.com`。
  - npm scope `@zcode/*` → `@idexal/*`，覆盖全部 workspace 包名与跨包导入路径。
  - 数据目录 `~/.zcode`、`.zcode/`、`.zcode-plugin/` → `~/.idexal`、`.idexal/`、`.idexal-plugin/`；插件 manifest 按 `.idexal-plugin/plugin.json` 发现。
  - 环境变量前缀 `ZCODE_*` → `IDEXAL_*`。
  - Electron appId `dev.zcode.app` → `dev.idexal.app`（Preview 为 `dev.idexal.app.preview`）；Linux 可执行名与包名固定为 `idexal`，保证 `Icon=idexal` 与 hicolor 图标命中一致。
  - CLI 与安装器命令 `zcode` → `idexal`；协议与模块标识 `zcode-protocol`、`zcode-*` → `idexal-protocol`、`idexal-*`；工作区包 `@zcode/zcode-cua` → `@idexal/idexal-cua`。
  - 本次为品牌级功能变更，按 minor 版本发布，不作为补丁版本推出。
- **desktop:** 更换 Idexal 图标与标识集
  - 新增 artwork 源目录 `logo_idexal/`：`light_logo_idexal.png` / `dark_logo_idexal.png` 为 wordmark（分别用于浅色与深色背景），`light_icon_idexal.png` / `dark_icon_idexal.png` 为独立标识。
  - 覆盖桌面安装器图标（macOS `icon.icns`、Windows `icon.ico`、Linux PNG 尺寸集）、托盘图标、macOS Dock 图标、Web favicon 与站点图标，以及应用内品牌 chrome。
  - 旧 ZCode 图标视觉在本版本整体替换，不再作为独立任务延后。

### Chores

- **release:** 发行元数据与版本来源保持单一
  - `electron-builder` 的 `author.email` 与 Linux `maintainer` 由占位地址改为对外地址 `contact@idexal.com`，随 deb / rpm / pacman 包元数据一并发布。
  - 版本号仍只写在根 `package.json`：经 `packages/desktop/scripts/build-metadata.mjs` 得出 `appVersion`，再注入构建期常量 `__IDEXAL_VERSION__`（即 `IDEXAL_VERSION`）与 electron-builder `extraMetadata.version`，源码中不另写版本常量。
  - `apps/idexal-cli` 使用自身 `.release-it.json` 独立发版，不参与桌面应用版本对齐。
  - 保留上游契约 token 不改名：`zcode.z.ai`、`cdn-zcode.z.ai`、`/zcode/electron/releases/`、`zcode-plan`、`zcode-plugins-official`、`zcode-cua`、`zcode-artifact://`、`zcode-team-api-key`、`zcode_official`、`zcodejwttoken` 与 `X-ZCode-*` / `x-zcode-*` 请求头。这些字符串的远端对端不在本仓库内，改名会直接打断登录、网关、插件市场与自动更新。
  - `LICENSE` 的 `Copyright 2026 Z.AI Co., Ltd` 与 `THIRD-PARTY-NOTICES.md` 的事实性内容保持上游原值。

### Documentation

- **rebrand:** 同步品牌重构 spec 与对外文档
  - `docs/rebrand.md` 补充联系邮箱身份项，新增「品牌视觉」章节并撤销「图标视觉更换为独立任务」的旧约定，验收清单增加邮箱与版本一致性检查。
  - `README.md` / `README.en.md` 增加 Idexal wordmark 横幅与官网、仓库、Issues、联系邮箱入口，修正已不存在的 `third-party/README.md` 引用，并补齐中英文缺失章节使两边结构一致。
  - `NOTICE.md` 新增「联系方式」章节，登记官方邮箱、仓库与官网。
