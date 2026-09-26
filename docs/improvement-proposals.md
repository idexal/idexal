# 改进提案（Idexal）

> 本文所有"现状"都是读当前检出代码得出的，带 `文件:行号`。
> 每条都标注 **[已存在]** / **[确证缺失]** / **[已发现的缺陷]**，避免重复建设。
> 优先级：P0 = 现在就坏的；P1 = 高杠杆且可独立交付；P2 = 需要前置条件。

---

## 0. 先说结论：最值钱的几件事

1. **改语言集这件事还没做完，而且它藏在一道类型检查到不了的墙后面。**
   把界面语言换成 ar/en/fr 之后，代码里仍有若干处写死 `zh-CN` / `en-US` 的判断在**合法地编译、
   静默地给错答案**：崩溃界面（§1.2，本已修复于 3.16.4）之外，桌面主进程里还有
   **强制更新对话框、退出确认、内嵌浏览器的原生 alert/confirm、"Idexal 正在操作你的电脑"提示条**
   （§1.6）。这些都是"用户必须看懂才不会做错事"的时刻，而 `packages/desktop/src/main/**`
   **不在 `pnpm typecheck` 覆盖范围内**，所以没有任何门禁会提醒。
   根因形态只有一个：联合类型扩容后，`x === "zh-CN"` 不会报错。要的是扫描与收敛（§1.7），
   不是逐个补字符串。
2. **模型 fallback 是数据层缺失，不是重试缺失。** 重试机制已经很完整（同模型、上限 10 次、
   退避、按 30+ 个业务码分类），但**没有任何一处代码会因为一个模型失败而换到另一个模型**。
   所以正确做法不是"再写一套重试"，而是给现有分类器的结论加一个"是否该换模型"的判定，
   并在已有的执行器里消费它。见 §3。
3. **没有任何自动化测试与 CI**，而这是 agent 产品最贵的一类风险：代码改坏只能靠人肉发现。
   本仓库自己就撞过两次（渲染进程 `import` 漏写导致启动白屏，静态门禁全绿）。见 §1.1。
4. **凭据是"混淆"而不是"加密"。** 默认密钥由 `sha256("idexal-credential-fallback:" + platform + homedir + username)`
   派生——这三项全部可枚举，等于密钥就在机器上。见 §2.1。

---

## 1. P0：先补住"改一下就静默坏掉"

### 1.1 [确证缺失] 端到端可运行的测试入口

现状：全仓只有 4 个 `node:test` 文件
（`packages/services/test/{importedClaudeRecovery,nonCliAcpRetirement,providerConfigMigration}.test.ts`、
`packages/ui/test/nonCliAcpRetirement.test.ts`），**没有任何 package.json 里有 test 脚本**，
`.github/` 目录不存在。唯一的崩溃类断言是 `scripts/idexal-distribution-smoke.mjs:64`，
它只跑 CLI tarball / TUI / 服务端 HTML，**从不启动 Electron 渲染进程**。

提案（按投入产出排序，前两项各约半天）：

1. **渲染进程启动冒烟测试**（最高优先）。不要求完整 E2E：用 `electron --version` 级的方式加载
   `out/renderer/index.html`，等待 `#root` 下出现首个可交互节点，断言
   `window.__IDEXAL_BOOT_ERROR__` 为空，并抓一次 `unhandledrejection`。
   验收：**故意在一个 UI 模块里删掉一个 import，这条冒烟必须失败**。
   这一条直接消灭"全绿但白屏"这类缺陷。
2. **语言表一致性门禁**（见 §1.3），比测试更便宜，因为它纯静态。
3. 把已有 4 个 `node:test` 文件接进 `pnpm test`，先让"有测试"这件事可运行，再谈覆盖率。
4. `.github/workflows/`：只跑 `typecheck + lint + architecture:check + 冒烟`。
   顺带解决 macOS/Linux 安装包无法在本机产出的问题（见 §4.5）。

**不要做**：不要一上来追求组件单测覆盖率。当前最大风险是"起不来"和"接错线"，不是"算错值"。

### 1.2 [已修复 · 3.16.4] 崩溃界面不认阿拉伯语与法语

`packages/ui/src/ErrorBoundary.tsx`：

- `:6-7` 只 import 了 `zh-CN.js` 与 `en-US.js` 两张表；
- `:66-72` `resolveBoundaryLocale()` 只接受 `"zh-CN"` 或 `"en-US"`，用户在应用里选的 `ar`/`fr`
  **走到这里被直接忽略**；
- `:88` `const messages = locale === "en-US" ? enUS : zhCN`。

后果：选了阿拉伯语的用户崩溃后看到英文（若其系统语言是中文则看到中文）。
崩溃屏恰恰是最需要用户看懂的时刻，而且这里通常提示"重启/清缓存"，看不懂就会造成数据误删。

修法：`ErrorBoundary` 不能用 `IntlProvider`（它可能正是崩掉的那一层），
所以保持独立实现但改判定：先 `isSupportedLocale(storedPreference)`，再用
`localeFromLanguageTag(navigator.language)`，最后 `DEFAULT_LOCALE`；消息表从 4 张改成按
`Locale` 索引的表，并只放崩溃屏用到的十几个键（不要引入整张 5872 键表）。
验收：把语言设为 `ar`，人为抛一个渲染期异常，崩溃屏为阿语且 `dir="rtl"`。

### 1.3 [确证缺失] 语言表没有任何一致性门禁

现状：`MESSAGES` 类型是 `Record<Locale, Record<string, string>>`
（`packages/ui/src/i18n/IntlProvider.tsx:30`），只校验"文件存在"，不校验键。
`.oxlintrc.json:17-22` 反而给 `i18n/locales/*.ts` **关掉**了 `max-lines`。
缺键工具、类型级防漏、重复键检测：全部不存在。

本次会话已经手工写出三份可用脚本（`z-work/tmp/verify-locales.mjs`、
`verify-placeholders.mjs`、`scan-untranslated.mjs`），检查内容分别是：
重复键 / 孤儿键 / `ar`↔`fr` 键集对称 / 值因换行漏解析、
`{placeholder}` 集合须与英文逐字一致、以及值里残留未译英文词。

提案：把这三份脚本收进 `scripts/i18n/`，接进 `verify:pre-push`。
其中占位符那条是**会导致渲染错误**的（漏掉 `{time}` 会渲染出字面量），属于必须拦。
每条检查都要配"构造坏数据能失败"的反向用例，否则又是一个恒绿门禁。

**这条已经真实咬过一次**：那三份脚本最初都用正则数键名，字符集写成 `[A-Za-z0-9_.]`，
于是**静默跳过**了所有含连字符与非 ASCII 的键（`sidebar.settings.locale.en-US`、
`ssh.assetInstallMode.local-download-upload`、`feedback.severity.P1-高.label`），
en-US 漏 13 个、ar/fr 各漏 4 个。结果 `orphans=0`、`对称=0` 这些绿灯对那 17 个键根本没跑过，
而据此发布出去的覆盖率分母（5859）也是错的（真实 5872）。
现在改成**真正加载语言表模块**再 `Object.keys`（`z-work/tmp/locale-loader.mjs`）。
教训：门禁看不到它解析不到的东西时照样报绿——写检查时要问"我的解析器到不了哪里"。

### 1.4 [已发现的缺陷] `zh-CN` 全表仍在打包产物里

`IntlProvider.tsx:24,31` 仍然 import 整张 `zh-CN.ts`（5871 键 / 428 KB 源码）。
而 §产品规则已把可选语言定为 ar/en/fr，`zh-CN` 只是为了让老 `setting.json` 不解析失败
（`docs/i18n-rtl.md:6-8`）。**"能解析老配置"不需要"把表发给每个用户"**：
把 `zh-CN` 从 `Locale` 联合与 `MESSAGES` 里移出、改成一个显式的读取期迁移
（`locale: "zh-CN"` → 首次读取时写回 `"en-US"` 并记一条 info 日志），
schema 校验放宽一个版本即可，无需继续携带整张表。
验收：构建产物里不含 `zh-CN` 表；用带 `locale:"zh-CN"` 的旧 `setting.json` 启动，设置不丢且界面为英文。
**注意**：这条要先做 §1.3，否则迁移与漏译无法区分。

### 1.5 [确证缺失] 主渲染进程没有 CSP

`Content-Security-Policy` 只出现在几个辅助小窗口
（`aboutWindow.ts:27`、`forceUpdatePrompt.ts:117`、`windowsCuaOperationIndicatorContent.ts:42`、
`browserView/electronBrowserWebmRecorder.ts:99`）。
主应用 renderer 的 HTML / `vite.config.ts` 上没有。
桌面端会渲染模型输出的 Markdown/HTML 预览、还会挂载远程内容，这是最值得收紧的面。
提案：主 renderer 上先加 `default-src 'self'` + 显式放行需要的 `style-src`/`img-src`/`connect-src`，
以报告模式跑一个版本收集违规，再转强制。

---

### 1.6 [部分完成 · 3.16.6] 桌面主进程里还有一批界面只认 `zh-CN` / `en-US`

> **3.16.6 已做**：表中除 CUA 提示条外的全部位置已收敛为 `Record<Locale, Copy>`；
> `desktopOAuthDeepLink.ts` 的那条 `TODO(i18n)` 已完成并删除。
> **仍待做**：`windowsCuaOperationIndicatorContent.ts:15` 的文案与像素宽度耦合（见下方坑 1）。
> **另发现并修掉**：退出确认对话框写的是 `"Quit Z Code?"`，属改名遗漏，见 §1.6.1。

这与 §1.2 是同一个错误的第三、四、五个现场。3.16.0 的 changelog 写着"补齐 ar/fr 文案的界面：
桌面 About 窗口、Computer Use 权限拖拽面板、Finder/资源管理器菜单、应用菜单栏 51 项"——
**那句话是不完整的**：那四处确实补了，但主进程里还有一批同等用户可见的界面从未进入视野。
以下都是**应用自己的文字**，不属于 `docs/i18n-rtl.md` 里那五个刻意保持窄类型的外部契约
（分享站 `/cn` 前缀、`BotMessageLocale`、`CodingPlanWebviewLocale` 等），所以是真缺陷：

| 位置                                                                    | 内容                                                                    | 为什么严重                                                                                                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `desktop/src/main/forceUpdatePrompt.ts:41-52`                           | 强制更新全流程文案：检查中 / 下载中 / 已下载 / 安装中，含"请勿关闭应用" | 用户正在执行**不可中断**的操作，却收到自己没选的语言                                                                         |
| `desktop/src/main/index.ts:1317-1322`                                   | 退出确认：进行中的会话数与中断提示                                      | 决定用户是否中断正在跑的任务                                                                                                 |
| `desktop/src/main/embeddedBrowserJavaScriptDialog.ts:67-69`             | 内嵌浏览器 `alert`/`confirm` 的按钮（确定/取消 vs OK/Cancel）           | **原生阻塞弹窗**，不点掉页面就卡住                                                                                           |
| `desktop/src/main/windowsCuaOperationIndicatorContent.ts:14-17`         | "Idexal is controlling your computer" 提示条                            | 告知 agent 正在操作用户机器的**安全提示**，必须读得懂                                                                        |
| `desktop/src/main/desktopOAuthDeepLink.ts:140-150`                      | 打开外部工作区文件夹的确认框                                            | 源码已有 `TODO(i18n)`：_"新增 Locale 时把这里收敛成完整 `Record<Locale, …>`，避免未覆盖语言静默回退英文"_——我加 ar/fr 时没做 |
| `desktop/src/main/desktopArchitectureGuard.ts:72`、`autoUpdater.ts:349` | `isZh` 分支的守卫与更新菜单标签                                         | 同一形状                                                                                                                     |

两个坑必须一起处理，否则会把"漏译"换成"排版坏"：

1. `windowsCuaOperationIndicatorContent.ts:14-17` **把文案和像素宽度绑在同一个分支**
   （中文 234 / 英文 308）。加一种语言不是加一个字符串，还要给出**实测宽度**；
   阿语与法语长度都不同于中文，凭感觉填数字会直接让提示条截断或留白。
   正解是按文本测量，或改成不依赖手填宽度。
2. `packages/desktop/src/main/**` **不在 `pnpm typecheck` 覆盖范围内**
   （`tsconfig.main.json` 约 90 个既有错误，不作门禁）。这里既没有类型帮助，也没有穷尽检查。

**比逐个补字符串更重要的是收敛形态**：把这些散落的 `locale === "zh-CN" ? … : …`
统一改成 `Record<Locale, Copy>` + 编译期穷尽，让"新增语言"在类型层面强制处理每个界面——
这正是 `desktopOAuthDeepLink.ts:142` 那条 TODO 已经预言过的做法。
参照物：`desktopMenu.ts` 是唯一已做到 ar/fr/en 全覆盖的宿主界面（51 项 × 3 语言），
可作为收敛后的目标形状。

#### 1.6.1 [改名残留] 用户可见文案与发给网关的请求头

全仓复查 `Z[ -]?Code` 后只剩 4 处（3 个文件），分两类，处理方向**相反**：

| 位置                                                                    | 性质                                                                                           | 处理                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| `desktop/src/main/index.ts` 退出确认 `"Quit Z Code?"`                   | 用户可见文案，且只在"有运行中会话时退出"才弹，所以一直没被发现                                 | **已改为 Idexal**（3.16.6） |
| `shared/src/idexal-source-headers.ts:6,50` `X-Title: "Z Code@electron"` | **发给模型网关的请求头**；同一份 header 里 `User-Agent: Idexal/…` 与 `HTTP-Referer` 已经是新名 | **未动**，需决策            |
| `apps/idexal-cli/packages/bootstrap/src/model-config.ts:59` 同上        | 同上                                                                                           | 同上                        |

不改的理由：`X-Title` 这类标识常被上游用于展示来源、统计甚至限额/白名单键。
把它当清理项顺手改掉，是在没有上游确认的情况下改变对外行为——**外部可见的标识变更要单独确认**。
注意同一份 header 已经"半新半旧"（`User-Agent` 新、`X-Title` 旧），这本身就是要整理的信号。
决策见 §6。

#### 1.6.2 [方法论] 改名要按"消费者"分类，不按命中数

3.16.6 之所以能一次收尾，靠的不是把 `zh-CN` 换成 4 语言，而是先给每处判定"这是**谁**在读"：
用户在读 → 补齐；对端机器在读（`/cn` 前缀、`X-Title`、bot 回复语言、订阅页 `__idexalLang__`）
→ 保持窄类型。同一形状的两处（URL 前缀 vs 对话框文案）结论完全相反，
按命中数量统一处理必然出错。

### 1.7 [确证缺失] 没有"闭集成员判断"的扫描

`grep -rnE '=== *"zh-CN"|=== *"en-US"'` 一次就暴露了 §1.2 与 §1.6 的全部现场。
这类判断在类型系统里**合法且静默**：联合类型扩到 4 个成员后，
`x === "zh-CN" || x === "en-US"` 不报错，只给错误答案。
提案：加一条 lint 级规则，禁止在 `Locale` 值上写字面量成员判断，
只允许调用 `isSupportedLocale` / `resolveTextDirection` / `localeFromLanguageTag`；
并把外部契约（`/cn` 站点前缀、`X-Title`、bot 回复语言、订阅页 `__idexalLang__`）
放进显式允许列表、逐条注明理由——否则允许列表会变成下一个藏缺陷的地方
（分界见 §1.6.2）。3.16.6 收尾后，`packages/desktop/src/main` 里仍剩 3 处 URL 前缀
与 1 处 CUA 提示条，前者正是这条规则应放行、后者应拦下的样本。

## 2. P0/P1：凭据与本机安全

### 2.1 [确证缺失] 真·系统钥匙串

`packages/services/src/credential/credentialService.ts:24-32` 把凭据写成
`~/.idexal/v2/credentials.json`，逐值用 AES-256-GCM
（`credential/providers/credentialCipherProvider.ts:6-10,57-88`），
但**默认密钥是 `sha256("idexal-credential-fallback:" + platform + homedir + username)`**。
platform/username 可枚举、homedir 通常可知，所以任何拿到该文件的进程都能重新派生出密钥。
`providers/credentialCipherProvider.ts:24-36` 的注释自己也把 safeStorage/keychain 列为待办。

提案：

1. 桌面端优先 Electron `safeStorage`（Windows DPAPI / macOS Keychain / Linux libsecret），
   `IDEXAL_CREDENTIAL_SECRET` 降为无钥匙串环境的兜底，并在 UI 里显式标注"本机未受钥匙串保护"。
2. 一次性迁移：读到用派生密钥加密的旧值 → 用钥匙串重新封装 → 覆盖写回，保留一份
   `.bak` 并在成功后删除。失败要能退回而不丢 key。
3. 把"当前凭据保护等级"暴露到设置页与日志导出脱敏逻辑里。
   验收：同机另一用户无法解密导出的 `credentials.json`。

### 2.2 [确证缺失] 提交前密钥扫描

`.husky/` 里只有自动生成的 `_/`，**没有 pre-commit/pre-push 钩子**；`lint-staged` 在
devDependencies（根 `package.json:73`）但没有任何配置文件；gitleaks/secretlint/detect-secrets 全无。
本仓库还有一个额外理由必须有这道门：本次 rebrand 期间用户在对话里贴过真实 PAT。

提案：`pre-push` 上跑 gitleaks（或 secretlint），基线扫描一次并入库允许列表，之后只扫增量。
注意 `.env.example`、`.env.development`、`.env.production` 目前是**被 git 跟踪的**，
必须确认其中没有真值。

### 2.3 [已存在但需注明风险] 浏览器凭据读取面

`packages/desktop/src/main/chromeCredentialManager.ts` 与
`chromeLocalStorageManager.ts:411,415` 会读浏览器本地凭据/存储（为 CUA 登录态服务）。
这是本仓库风险最高的能力之一。提案不是删除，而是：默认关闭 + 首次使用显式授权 +
每次读取记一条 `info` 日志 + 在设置页可见可撤销。
文件侧另有一个缺口：`services/src/file/fileService.ts:427-428` 只对 identity 做 `realpath`，
**没有"路径必须在工作区内"的中心断言**；`startsWith("../")` 只出现在
`desktop/src/host/browserRecordingArtifactMaterializer.ts:42` 一处。
建议在工作区内做规范化路径断言作为所有 agent 文件工具的统一入口校验。

---

## 3. P1：**模型/供应商 fallback**（核心诉求）

### 3.1 现状：重试很强，换模型为零

已存在且质量不错：

- 失败分类器 `apps/idexal-cli/packages/adapters/src/model/failure-classifier.ts:81-310`
  已区分 429 / 529 / 401·403 / 400·422 / 5xx / 超时 / 流空闲 / 上下文超长 / TLS / 取消 /
  无效响应，并给出 `retryable`、`retryReason`、`retryAfterMs`；
- 另有 30+ 个供应商业务码到分类的映射 `failure-provider-business-codes.ts`；
- 重试策略 `retry-policy.ts:13-28`：默认 `maxAttempts = 10 + 1`，可用
  `IDEXAL_MODEL_RETRY_MAX_RETRIES` 覆盖；`runner-generate.ts:384` 还区分了
  "无上限预算的 workflow 流量读策略表"；
- 空响应已有专门处理 `empty-completion-retry.ts:8`（上限 1 次）。

**[确证缺失] 跨模型/跨供应商 fallback**：全仓搜索 `fallbackModel` / `modelFallback` /
`nextModel` / `degraded` 的运行时命中为零——所有 `nextModelId`（
`packages/provider/src/config/model-config.ts:471`、`config-service.ts:376,457`、`facades.ts:78-408`）
都是"配置里改模型 ID"的重命名路径，`switchModelConfig`
（`packages/services/src/idexal-agent/idexalTaskServiceAdapter.ts:1169,2741`）
是**用户主动**发出的命令。也就是说：**没有任何代码路径会因为模型 A 失败而去调模型 B。**

### 3.2 设计原则：不新建第二条真相链

`AGENTS.md` 要求"避免重复状态和多条写入路径"。所以：

- **触发判定复用现有分类器的 reason**，不再写第二个分类器。新增的是"这类失败是否允许换模型"
  这一维，放进 §3.3 的策略表；`runner-generate.ts` 已经是"策略表 vs 分类器"双读的地方，
  这是唯一正确的落点。
- **候选链在 provider 层解析**（`packages/provider/src/resolver.ts` 已经有
  `executable` / `selectable` 判定：`:278-286`）。fallback 必须走同一判定，
  否则会静默把请求发到被禁用、无权益或配置有问题的模型上——那比原始故障更糟。
- **链本身是配置数据**，不是硬编码列表，因此可以由现有的远端目录下发
  （`packages/provider-node/src/idexal-builtin-provider-config-source.ts`，带 `revision`，
  见 `config/provider/idexal-builtin.json:3` `revision: 30`），**改 fallback 不必发版**。

### 3.3 触发矩阵（建议初版）

| 分类 reason（已存在）                                               | 换模型？                                          | 说明                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `RateLimited`(429) / `ProviderOverloaded`(529) / `ServerError`(5xx) | 是，但**先耗尽同模型重试**，且尊重 `retryAfterMs` | 只有配额/过载才值得换                                |
| `StreamIdleTimeout` / `Timeout`                                     | 是                                                | 单模型持续卡死时最有价值的一条                       |
| `ContextExceeded`                                                   | 是，但**只允许换到 `contextWindow` 更大的模型**   | 元数据已有：`packages/shared/src/model-config.ts:71` |
| `AuthFailed`(401/403)                                               | **否（静默）**；提示用户重连                      | 换供应商会掩盖账号问题；分类器已标 `retryable:false` |
| `InvalidRequest` / 内容审核类业务码                                 | **否**                                            | 换模型只会把同一个坏请求再犯一次                     |
| `Cancelled`                                                         | **否**                                            | 用户意图，绝不能自动重来                             |

链路语义另需两条硬规则：

1. **深度上限**（建议 ≤3 跳）并记录整条尝试链，否则配额耗尽时会形成链式放大。
2. **一次 run 内链固定**：首跳选定后整个 run 不换回，避免同一任务中途换模型导致输出风格与
   工具协议漂移。要换必须用户显式发起。

### 3.4 真正的难点：流式已经开始后才能不能换

如果已经有 token 送到 UI，或者有工具调用已经执行，**简单重放会造成副作用重复执行**。
已存在的可复用机制：`CommandInbox` 串行 admission（`AGENTS.md:65`）、
`runner-stream.ts` 的流处理、以及 `web-remote-replayable` 的快照/恢复语义
（`idexalTaskServiceAdapter.ts:1340` `reason: "replayable_snapshot" | "resume_task"`）。

建议的安全边界：

- **未产生第一个 token → 直接换**，用户无感（只在看板/日志里可见）。
- **已产生 token 但尚未执行任何工具 → 按策略二选一**：
  (a) 丢弃局部输出重放（默认，干净）；(b) 保留局部输出、从下一个 assistant 轮继续（可选，省 token）。
  两种都要显式配置，不要默认"看起来更省"的那个。
- **已有工具执行 → 不换模型，改为失败上抛**。这一条不要试图聪明：
  幂等性无法由模型层推断，宁可让用户点重试。
- 实现时**必须以"工具只执行一次"为验收条件**，用一个故意在第 2 个 token 后 5xx 的假供应商打测试，
  确认已执行的工具不会二次调用。

### 3.5 用户可控的部分（对应"控制自定义供应商与模型"）

数据落点已存在，不用新建 schema 层：

- 在 `providerConfigDataSchema`（`packages/provider/src/config/provider-data-schema.ts:83-94`）
  加 `fallbackModelIds`（有序、只引用本供应商或跨供应商 `providerId/modelId` 对）；
- 要让用户能改，就必须同时加进 `manualModelConfigSchema` 的白名单
  （`packages/provider/src/config/manual-model-config.ts:6-27`）。
  这个白名单机制本身很好——它显式列出"个人可编辑的叶子"，新字段默认不属于用户可改，
  所以**加字段是刻意的产品决策**，保持这个习惯。

UI 建议：

- 设置页供应商区（`packages/ui/src/settings/model-provider-section/`）里做**链编辑器**：
  拖动排序、每跳显示"会被哪些失败原因触发"、并**预校验链上每个候选是否 `selectable`**，
  不可选的直接标灰并说明原因（复用 `resolver.ts` 产出的 `issues`）。
- 聊天内 `ModelConfigSelect.tsx` 增加一个"备用：→ GLM-4.7"的次级标记，
  让用户在发请求前就知道会发生什么。
- 运行时可见性：复用 `chat.apiRetryStatus`（"Reconnecting... {attempt}/{maxRetries}"）
  的模式，加一条非阻断横幅"因 {reason} 已从 {from} 切换到 {to}"，
  并接进已有的 React 错误桥 `packages/ui/src/lib/reactErrorArmsTelemetry.ts`
  与聊天横幅遥测 `chatErrorBannerTelemetry.ts`，这样线上真实触发率是**可查的**。

### 3.6 顺带补齐：让 fallback 决策有依据的能力元数据

现有元数据已包含 `contextWindow`、`inputFormat.{text,image,video,audio,pdf}`、
`supportsToolCall`、`supportsJsonSchemaOutput`、`supportsNativeWebSearch`、
`supportsMidConversationSystem`（`packages/shared/src/model-config.ts:51-100`）。
缺的正是做智能路由需要的三项：

- **价格**：`pricing`（输入/输出/缓存命中每百万 token）——**确证缺失**。
  有了它才能做"最便宜可用"与成本上限，也才能做真正的用量与预算面板。
- **能力探测（把猜测变成证据）**：加一个"验证此模型"动作，发两个极小请求——
  一个 1-token 探测 + 一个强制 tool_call 探测，把结果写回能力字段。
  按 `providerApiTypeDataSchema`（`provider-data-schema.ts:4-8`）只有 3 种 API 类型，
  探测实现可以完全按类型驱动，成本很低。
- **模型列表发现**：`openai-*` 类型普遍支持 `/v1/models`，为自定义供应商提供"拉取模型列表"，
  免去手抄模型 ID。

**明确不建议做的**："自动挑最快/最便宜模型"的智能路由。它会在用户不知情时改变输出质量，
在编码 agent 上这是很难归因的降级；先做 §3.3 的失败驱动 fallback，价值最大且行为可解释。

---

## 4. P1/P2：其余高价值项

### 4.1 [确证缺失] ICU / 复数——阿语必须要

`IntlProvider.tsx:131-133` 只有 `{key}` 的 `replaceAll`，**没有复数、没有性别、没有选择分支**
（全仓唯一的手工单复数是 `packages/ui/src/components/workflow-timeline/timeline-summary.ts:46`）。

这不是抽象问题，是我刚制造的具体缺陷：`chat.mention.whiteboards.strokeCount = "{count} strokes"`
我译成 `{count} حركة رسم`，这对 0、1、2、3–10、11+ 中的部分数值在语法上是错的——
阿拉伯语有 6 个复数类别（zero/one/two/few/many/other）。
**在键数从 386 涨到几千之前把复数机制装上**，否则之后要重做所有含数量的文案。

提案：引入 `intl-messageformat`（或 `@formatjs` 生态）做 select/plural，
迁移策略是新增键用 ICU、老键保持原样，不做一次性大改。

### 4.2 [不一致] 数字与日期格式

部分位置已 locale 感知（`contextUsage.tsx:104,132,782`、`display.tsx:108`、
`CodingPlanContextUsage.tsx:79`、`DeveloperToolsPane.tsx:18,25`），
但大量是硬编码或 `undefined` locale（`ai-elements/context.tsx:38,174,233,283,316,353,386`、
`WorkflowRunSidePaneSections.tsx:28,223`、`artifactPresentation.tsx:70-71` 的 `toFixed`、
`workflowWorkspaceTranscript.ts:178,187-188`、`WorkflowCompletionCard.tsx:60-62`）。

需要先做一个产品决定：**阿语界面用西文数字（1234）还是东阿拉伯数字（١٢٣٤）**。
代码里两种都会"正确"，但对同一产品不能混。定完后抽一个 `useFormatters()`，
把 `Intl.NumberFormat`/`DateTimeFormat` 收敛到唯一所有者。

### 4.3 [确证缺失] 离线感知与草稿外发队列

`navigator.onLine` 与 `online`/`offline` 监听在 `packages/ui`、`packages/desktop`、`packages/web`
**一处都没有**。重连状态机是有的（`packages/rpc/src/remote.ts:250,295-320`
`connected|reconnecting|disconnected` + 递归 `reconnect(attempt+1)`），
但队列表在 host 侧（`AGENTS.md:65`：渲染进程只留草稿与乐观覆盖层），
所以**断网时用户输入没有客户端缓冲**。

手机远控是这条最疼的路径（移动网络必然抖）。提案：断网时把未提交输入落进
`localStorage` 的 outbox，恢复后按现有 `CommandInbox` 的串行 admission 提交，
并显式区分 `desktop-continuous`（实时链路）与 `web-remote-replayable`（恢复链路）
——`AGENTS.md:63-64` 已要求两者必须分清，改 queue/reconnect 时两种语义都要验。

### 4.4 [已存在，不要重建] 扩展面

提案前先明确这里已经很完整，避免重复劳动：

- 服务层：`plugins/`、`plugin-sync/`、`skills/`、`mcp-sync/`、`official-mcp/`、
  `subagents/`、`hooks/`、`commands/`、`session/automation*`、`bots/`、`memory/`。
- **技能开关已经实现**（`skillsService.ts:1019-1046` `readSkillEnabledMap()` + `attachEnabledState()`）。
- 商店 UI 完整（`settings/PluginStore{Page,ListView,DetailView,Card,SourcesDialog}.tsx` 等）。
- 第三方作者路径已通：个人来源支持 git / GitHub / URL / 本地目录
  （`CONTEXT.md:21-23`），清单格式 `CONTEXT.md:61-63`。

真正缺的是**公开提交与审核接口**、第三方自助发布、以及分成/支付面（**确证缺失**）。
按产品当前阶段，我建议先补"来源健康度"——`CONTEXT.md:79-81` 定义了
Orphaned Installed Plugin（可用但无法更新），目前用户看不到哪些插件处于该状态。
低成本、直接减少支持工单。

### 4.5 [确证缺失] 跨平台安装包与 CI 构建

Windows 向导安装器的本地化与品牌位图已经做完（`packages/desktop/build/installer.nsh`、
`electron-builder.config.js`，NSIS 两个约束已实测：语言常量必须用数字 ID、脚本必须带 UTF-8 BOM）。
但**整包编译还没跑过**，且 macOS/Linux 产物在这台 Windows 上无法产出。
`.github/workflows/` 不存在，所以也没有 CI runner 可用。

提案：先落 §1.1 的最小 CI（同一份 workflow），再加 3 个平台的构建 job 与产物上传，
一并解决"27 个 release 全部 0 个可下载产物"。
另需决定**代码签名**：目前无证书，未签名安装包在 Windows 上必然触发 SmartScreen，
这是"专业安装包"这个目标上唯一的硬阻碍，需要采购 OV/EV 证书或走 Azure Trusted Signing。

### 4.6 可观测性：这块**已经**做得不错

不要重复建设：ARMS RUM 已上线（`packages/desktop/src/main/appARMSBootstrap.ts`，
开关 `packages/shared/src/env.ts:50`），上报前有脱敏
（`armsEventRedaction.ts:98-114`），Electron `crashReporter` 已接入
（`desktopCrashCapture.ts:373`），ANR 5s / 冻结 30s
（`desktopStabilityTelemetry.ts:19,21,24-25`），React 错误专门桥接
（`reactErrorArmsTelemetry.ts` → `renderer/src/main.tsx:323-329`），
"报告问题"会附日志 zip（`feedbackService.ts:232-243`、`compactLogArchive.ts:14-23`）。

值得补的两点：

1. `packages/ui/src/logger.ts:39-41,46-48`——渲染进程日志在生产环境是**完全 no-op**。
   于是"用户端渲染层中间态"无法事后重建。建议加一个环形缓冲（只在崩溃/上报时导出，
   与 `armsEventRedaction` 共用脱敏函数），而不是把日志改成常开上报。
2. `env.ts:50` 把遥测硬编码为 `true`，即用户无法关闭。
   面向公开版本这是合规与信任问题：加设置项，默认值由产品明确决定并写进文档。

---

## 5. 建议实施顺序

| 阶段 | 内容                                                           | 为什么先做                                                   |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | §1.6 + §1.7 桌面语言扫描与收敛、§1.3 语言表门禁、§4.1 ICU 决策 | 已坏的用户可见路径；扫描先做，一次就能把"还有几处"变成已知数 |
| 2    | §1.1 渲染冒烟 + CI 骨架                                        | 之后每一项都需要它兜底                                       |
| 3    | §2.1 钥匙串、§2.2 密钥扫描                                     | 安全债按天计息                                               |
| 4    | §3.3–§3.5 失败驱动 fallback                                    | 核心诉求，且需要 §1.1 保证不回退                             |
| 5    | §4.5 三平台产物 + 签名决定、§1.4 去 zh-CN 表                   | 发布面                                                       |
| 6    | §3.6 价格/探测、§4.3 离线队列                                  | 有前置数据与测试后才有意义                                   |

（§1.2 崩溃界面已随 3.16.4 修掉，因此不在阶段 1；§1.6 是同一形状里还没修的部分，排第一。）

## 6. 待你拍板的五个决定

1. **代码签名**：是否采购证书（OV/EV 或 Azure Trusted Signing）。不签就无法交付"专业安装包"目标。
2. **遥测默认值**：面向公开版本是否允许用户关闭。现状是 `packages/shared/src/env.ts:50`
   把 `IDEXAL_TELEMETRY_ENABLED` **硬编码为 true**，用户无从关闭。
3. **`X-Title` 请求头**：发给模型网关的 `X-Title: "Z Code@electron"` 是否改成 Idexal
   （§1.6.1）。同一份 header 的 `User-Agent`/`HTTP-Referer` 已是新名，只有它还留旧名；
   但上游可能用它做来源展示、统计或限额键，所以**不擅自改**，需要与网关侧确认后一起做。
4. **`zh-CN` 的处置**：读取期迁移 + 停止打包（§1.4，目前全表 5871 键 / 428 KB 仍随产物分发），
   还是继续携带整张表。
5. **阿语数字形态**：西文数字（1234）还是东阿拉伯数字（١٢٣٤）。代码里两种都"能跑"，
   但同一产品不能混，这条决定所有含数字的文案与 `Intl.NumberFormat` 的 locale 选择（§4.2）。
