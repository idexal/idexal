# Changelog

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
