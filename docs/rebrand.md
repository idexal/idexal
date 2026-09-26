# Idexal Full Rebrand Spec

## 背景

上游项目 ZCode（开源桌面 Agent 应用）以实验方式在此仓库继续开发，产品正式更名为 **Idexal**。

| 项               | 旧值                                            | 新值                                                                                         |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 产品名           | ZCode                                           | Idexal                                                                                       |
| 网站             | zcode.ai                                        | https://idexal.com                                                                           |
| 仓库             | 上游仓库                                        | https://github.com/idexal/idexal                                                             |
| npm scope        | `@zcode/*`                                      | `@idexal/*`                                                                                  |
| 根包名           | `zcode`                                         | `idexal`                                                                                     |
| CLI/安装器命令   | `zcode`                                         | `idexal`                                                                                     |
| 数据目录         | `~/.zcode`、`.zcode/`、`.zcode-plugin/`         | `~/.idexal`、`.idexal/`、`.idexal-plugin/`                                                   |
| 环境变量前缀     | `ZCODE_*`                                       | `IDEXAL_*`                                                                                   |
| 协议/模块标识    | `zcode-protocol`、`zcode-*` 文件与模块          | `idexal-protocol`、`idexal-*`                                                                |
| 工作区包名       | `@zcode/zcode-cua`（目录 `packages/zcode-cua`） | `@idexal/idexal-cua`（目录 `packages/idexal-cua`）；外部 pip/git/MCP 中的 `zcode-cua` 仍保留 |
| 插件 marker 目录 | `.zcode-plugin/`                                | `.idexal-plugin/`（代码按 `.idexal-plugin/plugin.json` 发现 manifest）                       |
| Electron appId   | `dev.zcode.app`                                 | `dev.idexal.app`（Preview 为 `dev.idexal.app.preview`）                                      |
| 联系邮箱         | 上游地址                                        | contact@idexal.com                                                                           |

## 重命名规则（大小写感知，按此顺序）

1. `ZCode` → `Idexal`
2. `ZCODE` → `IDEXAL`
3. `Zcode` → `Idexal`
4. `zcode` → `idexal`
5. `z-code` → `idexal`（注释中的旧写法）

规则同时作用于：文件内容、文件名、目录名。`pnpm-lock.yaml` 不手工改写，由 `pnpm install` 重新生成。

## 必须保留的外部契约 token（**不重命名**）

这些 token 是客户端与上游后端/CDN 之间的线上契约，改名会导致登录、网关、插件市场、下载失败：

| token                                                                                                                                                                             | 出现场景                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `zcode.z.ai`、`cdn-zcode.z.ai` 及含它们的完整 URL（含路径段 `/zcode/electron/releases/...`、`/zcode/official-plugin/...`）                                                        | API origin、CDN 下载、插件市场、分享页                                     |
| `zcode-plan`                                                                                                                                                                      | Coding Plan 网关 API 路径 `/api/v1/zcode-plan*` 与业务错误分类             |
| `zcode-plugins-official`                                                                                                                                                          | 官方插件市场 id（后端下发内容按此 id 匹配）                                |
| `zcode-cua`（含 `mcp__zcode-cua__`、`zcode-cua-broker-*`、`zcode-cua-permission-status`、发行路径 `packages/zcode-cua-plugin`、git/pip 规格 `zcode-cua.git`、`zcode-cua==1.2.3`） | Computer Use 外部包与本地注入边界（改名会破坏 helper 启动与 MCP 工具路由） |
| `zcode-guide@zcode-plugins-official`                                                                                                                                              | 官方内容插件 id（市场按此 id 匹配）                                        |
| `zcode-artifact://`                                                                                                                                                               | 会话分享 artifact URI scheme（跨端分享内容按此解析）                       |
| `zcode-team-api-key`、`zcode_official`                                                                                                                                            | 凭据/鉴权存储键（改名会导致已保存凭据失效）                                |
| `zcodejwttoken`                                                                                                                                                                   | 本地凭据存储键（改名会导致已保存登录态失效）                               |
| `X-ZCode-App-Version`、`X-ZCode-Agent`、`x-zcode-trace-id`、`x-zcode-session-type`、`x-zcode-bot-secret`                                                                          | 发往上游后端的请求头/机器人 webhook 头                                     |

判定原则：**凡请求目标不在本仓库内的字符串一律保持原值**；仅在本仓库两端对称出现的协议（stdio 协议、本地 RPC header、`window.idexal`、git checkpoint refs）允许重命名。

## 明确不改动

- `LICENSE` 中的 `Copyright 2026 Z.AI Co., Ltd` 与 Apache-2.0 附录（上游版权必须保留）。
- 上游第三方组件声明 `THIRD-PARTY-NOTICES.md` 的事实性内容（仅同步因路径/名称变化而失效的引用）。
- `zhipu-*`、`ZAI_*`、`bigmodel` 等上游服务商标识（它们是 provider 类型/配置值，属于后端契约）。
- native-search 等上游构建产物二进制；它们随版本更新替换，不做品牌改写。

## 品牌视觉（v3.15.0 起随发布一并交付）

历史版本曾把图标视觉列为“独立任务”，该约定自 v3.15.0 起失效：旧 ZCode 图标已在本版本整体替换。

- artwork 源文件位于仓库根 `logo_idexal/`：`light_logo_idexal.png` / `dark_logo_idexal.png` 为 wordmark（分别用于浅色与深色背景，GitHub 浅色背景使用 light 版），`light_icon_idexal.png` / `dark_icon_idexal.png` 为独立标识，`master-*-1024.png` 为导出母版。README 顶部横幅引用该目录，不引用产物目录。
- 覆盖范围：桌面安装器图标（`*.icns`、`*.ico` 与 PNG 集）、托盘与 Dock 图标、Web favicon 与站点图标、应用内品牌 chrome。
- 产物目录 `packages/desktop/build/`、`public/`、`packages/web/public/`、`packages/ui/src/assets/` 中的图标由视觉资产任务生成与维护；本 spec 只登记范围与来源，不记录像素级内容。
- 改名规则不适用于这些二进制资源：它们不是文本 token，只能整体替换。

## 验收

1. `rg -i zcode` 剩余命中仅允许出现在“外部契约 token”与上游版权/第三方声明中。
2. `pnpm typecheck`、`pnpm lint`、`pnpm architecture:check --changed` 通过。
3. `pnpm dev:desktop` 可启动，桌面窗口标题与设置页显示 Idexal。
4. 对外身份字符串一致：全仓搜索历史占位邮箱（`dev@` + 本站域名）无命中；官方联系邮箱在 `README.md`、`README.en.md`、`NOTICE.md` 与 `packages/desktop/electron-builder.config.js` 中均为 `contact@idexal.com`。
5. 版本号一致：发行元数据只有一个来源。根 `package.json` 的 `version` 经 `packages/desktop/scripts/build-metadata.mjs` 得出 `appVersion`，再注入 `__IDEXAL_VERSION__` 与 electron-builder `extraMetadata.version`；源码中不另写版本常量。`apps/idexal-cli` 用自身 `.release-it.json` 独立发版，不参与桌面版本对齐。

6. 品牌视觉落地以生产构建为证：在 `packages/desktop` 执行 `pnpm exec vite build` 后，`out/renderer/assets/` 必须出现带哈希的 `mark-light-*.png`、`mark-dark-*.png`、`logo-light-*.png`、`logo-dark-*.png`，且四张都被 JS chunk 引用（v3.15.3 起 wordmark 有了应用内调用方，不再被 tree-shaking 移除）。

### wordmark 的应用内落点

官方 wordmark（`logo-light.png` / `logo-dark.png`，画布 1136×380、墨迹满幅、比例 2.99:1）除 README 双语横幅与 macOS DMG 背景外，应用内落点为**启动/重连遮罩**（`RootStartupLoading`）：

- 该遮罩是应用内唯一的大尺寸品牌留白面，且原本只渲染方形 mark 徽标、没有任何产品名文字，wordmark 在此补充信息而不是重复文字。
- 登录页与引导页的方形深色 logo 壳由 `DESIGN.md` “Brand icon backplates” 一条明确保留，且其下已有 “Welcome to Idexal” 文案，把横向组合标塞进 96px 方形槽位会破坏版式，因此不改。
- 选图规则（v3.15.8 定稿）：品牌位图的墨色必须由 `useIsDarkThemeApplied()` 决定，它用 `useSyncExternalStore` 订阅 `<html>` 的 `.dark` 类，与 CSS 共用同一事实来源。**不得**用 Tailwind `dark:`（本仓没有 class 版 dark 变体，`dark:` 编译成 `@media (prefers-color-scheme: dark)`），也**不得**在渲染期 `resolveTheme(store.theme)`：偏好为 `"system"` 时那条媒体值由主进程按 nativeTheme 异步回推，和 `applyTheme` 写类的时机抢先后，实测出现过 `theme-zai-light` 的浅色页面配 `mark-dark.png` 白墨标志的稳态组合（三种偏好逐一复测后 `mismatchCount` 才归零）。
- About 窗口不放 wordmark（实测结论，不是猜测）：在 256×280 视口渲染 `createCustomAboutDialogHtml` 的真实产物，`.app-icon` 占 22→74、`.title` 94→125.9、`.meta` 153.9→202.1、`.ok-button` 230→266，卡片 `scrollHeight == clientHeight == 280`，即纵向余量为 0；插入 132×44 的 wordmark 后 `scrollHeight` 变成 310、按钮底边 296 已超出 280。要在 About 里放横向组合标必须同时改窗口尺寸或卡片版式，属设计改动，不在品牌重构范围内。
- Provider 边界（v3.15.4 教训，v3.15.8 起结构性消除）：`RootStartupLoading` 由 `Root.tsx` 的 `isStartupRenderBlocked` 分支渲染，位置低于同文件挂载的 `<StoreProvider>`，品牌组件里直接用 `useIdexalStore` 会在启动遮罩抛 `useIdexalStore 必须在 StoreProvider 内使用` 并触发 `AppErrorBoundary`（“The app ran into a problem”）。v3.15.4 用 `useIdexalStoreWithDefault` 加 `inferAppliedTheme()` 兜底绕过；v3.15.8 品牌组件改为只订阅 `<html>` 的 `.dark` 类（`useIsDarkThemeApplied`），既不碰 Provider 也不碰媒体查询，两个问题一起消失，`inferAppliedTheme` 随之删除。类型检查发现不了这条边界，只有真机启动才会暴露。
- 画布固有比例：wordmark 取 `w-28`（112px，与上方 96px 徽标组成锁版）并配 `aspect-[1136/380]` 预留高度，否则 `h-auto` 在 PNG 解码完成前塌成 0 高（实测冷加载首帧 `w=112 h=0`，加比例后 `112×37.5`）；组件自带 `max-w-full`，窄屏不溢出。
- 验收口径：构建产物必须出现 `logo-light-*.png` / `logo-dark-*.png` 且被 JS chunk 引用（此前该组件无调用方，两张图会被 tree-shaking 移除）。

### Windows 打包产物里的品牌落点（v3.15.5 实测）

- `win` 段没有显式写 `icon`，electron-builder 走 `buildResources: "build"` 下的 `build/icon.ico` 自动发现（`build/icon.ico` 由本次品牌重构新增，含 16/24/32/48/64/128/256 七帧）。实测 `dist/win-unpacked/Idexal Preview.exe` 的 PE 资源：`ProductName=Idexal Preview`、`CompanyName=Idexal`、`FileDescription=Idexal Preview`、`FileVersion=3.15.4`；用 `ExtractAssociatedIcon` 取出的 32px 图与 `build/icons/32x32.png` 逐像素平均差为 `0.000`，与 Electron 自带图标为 `106.769`，即 exe 图标确实是官方品牌图标而非默认图标。
- NSIS 产物 `dist/Idexal Preview-3.15.4-win-x64_TEST.exe`：`FileDescription=Idexal Desktop App`，其图标来自 `nsis.installerIcon/uninstallerIcon/installerHeaderIcon` 指向的 `build/icon_installer.ico`，与品牌应用图标不同素材属设计意图（配置注释里写明“安装图标与应用运行时图标解耦”）；与 `build/icon_installer.png` 缩到 32px 后平均差 `13.1`，为 1024→32 重采样误差。
- 产物名里的 `_TEST` 后缀来自 `desktopArtifactEnvSuffix`，标记该包连的是测试后端，不是品牌残留。
- 打包机网络限制：本机对 `cdn.npmmirror.com` 与 `registry.npmmirror.com` 都是 `no such host`，而 `bundle.mjs` 的 binaries mirror 回退只在输出含 404 时触发、不覆盖 DNS 失败，所以前两轮 `electron-builder` 在 `building target=nsis` 处失败；Electron runtime 镜像也要显式给出（`ELECTRON_MIRROR=https://github.com/electron/electron/releases/download/`），因为 `mise.toml` 默认写的是 npmmirror。第三轮重试成功产出安装包。
- 取证方法教训：第一次读该 exe 时后台重试构建正在覆写同一文件，拿到的是覆写中途的副本（`VersionInfo` 仍是 `Electron`、体积与 `electron.exe` 完全相同），据此一度误判“Windows 图标没换”。对正在被构建覆写的产物做取证，必须先确认构建进程退出，或先复制到稳定路径再测。

### 品牌素材溯源与像素一致性（v3.15.6 实测）

链路每一环都对官方素材做过像素比对，不是“看起来对”：

| 仓内素材                                                                | 官方来源                       | 逐像素结果                                                               |
| ----------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `packages/ui/src/assets/brand/mark-{dark,light}.png`                    | `{dark,light}_icon_idexal.png` | rgb/alpha 差 `0.000`，尺寸同为 377×380                                   |
| `packages/ui/src/assets/brand/logo-{dark,light}.png`                    | `{dark,light}_logo_idexal.png` | rgb/alpha 差 `0.000`，尺寸同为 1136×380                                  |
| `packages/{desktop/src/renderer,web}/public/brand/idexal-mark-dark.png` | `dark_icon_idexal.png`         | sha256 相同                                                              |
| `packages/web/index.html` 内联 favicon（data URI）                      | `build/icons/32x32.png`        | 平均差 `0.000`                                                           |
| `packages/web/public/favicon.ico`                                       | 同上                           | 平均差 `0.120`（同一素材的容器重编码）                                   |
| `packages/desktop/build/icon.png`                                       | `master-macos-padded-1024.png` | 平均差 `0.000`                                                           |
| `packages/desktop/build/icon_windows.png`、`icons/1024x1024.png`        | `master-fullbleed-1024.png`    | 裁剪内容归一化后平均差 `0.529`，即同一图形只是内边距不同，不是另一套设计 |

- 归一化比对是必要的：直接比 `icon_windows.png` 与 `master-fullbleed-1024.png` 得到 `24.588`，看着像“素材不一致”，实际差异全部来自 Windows 与 full-bleed 画布的内边距比例；裁到内容外接框再缩放后只剩 `0.529`。做品牌一致性判断时先归一化，否则会把版式差异误报成换图。
- 消费方枚举（`assets/brand/`、`public/brand/`、`build/icon*`、`tray_icon`）显示渲染层 5 个组件（`App.tsx`、`WindowsTopLeftLogo`、`WorkspaceSidebarCollapsedRail`、`ConversationDraftEmptyState`、`IdexalAboutLogo`、`RootStartupLoading`）与两个 HTML 启动壳全部指向上表素材；主进程窗口/托盘/通知图标指向 `build/icon*.png` 与 `build/icon.ico`。没有指向仓外或旧品牌位图的路径。
- 真机复核（CDP 截图后测合成像素）：登录页 40×40 品牌图在深色与浅色主题下都是官方 `mark-dark.png`，落在固定深色底板内（`DESIGN.md` 明确保留该底板），裁区亮度标准差 `99.0`，即高对比、可见。两主题裁片完全相同属预期——底板恒定深灰，选深底专用白墨 mark 正是设计意图。

- 真机复核（CDP 截图后测合成像素）：登录页 40×40 品牌图在深浅两主题下均为官方深底白墨 mark，落在固定深色底板内（`DESIGN.md` 明确保留该底板），裁区亮度标准差 `99.0`，即高对比、可见。两主题裁片完全相同属预期——底板恒定深灰，选深底专用白墨 mark 正是设计意图。
- 主界面品牌面实测（v3.15.7）：跳过鉴权进入桌面主壳后，`WindowsTopLeftLogo`（20×20）与 `ConversationDraftEmptyState`（400×320 水印）随应用主题正确换图（深 `mark-dark.png` / 浅 `mark-light.png`，`data-v4-draft-logo` 同步）。
  - 同批发现并修复：水印的向下渐隐遮罩原先只在浅色主题生效，依据是一条我写在注释里的断言“深色位图自带渐隐”。逐行 alpha 实测否证了它——两张官方位图曲线完全一致（10%=103…98%=67），于是深色下标志保持满强度，与问候语 `14400px²` 的重叠区直接把文字压花。遮罩改为与主题无关后深色复核通过（`opacity:0.7`、`masked:true`）。
  - 教训：为深浅两套位图做差异化视觉处理前，先量两张图的 alpha/像素分布；“另一个文件看起来更淡”不等于它自带渐隐，可能只是墨色不同。

### Web 目标移动视口实测（v3.15.9）

- 此前所有真机验证都在桌面端；本轮按 `AGENTS.md` 的桌面/手机 Web 双端要求，用 390×844 视口冷启动 `pnpm dev:web` 复核主壳。
- 发现并修复一个上游遗留的 Rules of Hooks 违规：`useIdexalSessionService`、`useIdexalAgentService`、`useIdexalTaskService` 都把 hook 写在三元分支里（`workspacePath ? useWorkspaceServices(...) : useServices()`）。`useWorkspaceServices` 展开为多次 store 读取，`useServices()` 只有一个 `useContext`，所以 `workspacePath` 由空变有的那次渲染会改变宿主组件的 hook 数量。Web 端首帧拿不到 `workspacePath`，因此必现：`OnboardingDialog` 第 8 个 hook 由 `useRef` 变 `useContext`，React 用错槽位比较依赖数组后抛 `Cannot read properties of undefined (reading 'length')`，整棵子树被 `ScopedErrorBoundary:onboarding-dialog` 接走。修复为两个 hook 无条件调用、只在取值时分派，从而保留“空 `workspacePath` 返回 context services 而非 base services”的原语义。
- 判别“是 HMR 假信号还是真缺陷”的方法：换一个从未接收过热更新的端口冷加载。`createRoot() on a container that has already been passed to createRoot()` 只出现在被我热编辑过入口模块的旧页面上（`index.html` 仅一个 `#root` 与一个 module script，源码里只有一次 `createRoot`），冷启动不复现；hook 顺序崩溃在冷启动依旧复现，所以它是真缺陷。两者症状相同、结论相反，不能因为“看起来都像 dev 噪声”一起放过。
- 修复后同一路径错误数 5 → 2，剩余 2 条是下方已记录的 `window-controller` 平台差异。`OnboardingDialog` 的 hook 列表在关闭态也会执行（Radix 只跳过 children 渲染），因此“挂载不再被错误边界接走”即为该崩溃已消除的直接证据；引导向导正文的实际展开需要用户主动打开，本轮未覆盖。
- 桌面端回归复核（v3.15.10）：这三个 hook 是桌面与 Web 共用的，所以改完必须在桌面目标再跑一次。用 `pnpm dev:desktop` 全新构建冷启动后经 CDP 抓取渲染进程日志：无 hook 顺序告警、无 `useTabStore 必须在 TabStoreProvider 内使用`、无错误边界接管；`documentElement.className` 为 `dark theme-zai-dark platform-windows-desktop` 且标题栏品牌图为 `mark-dark.png`（主题与位图一致），窗口标题 `Idexal`，侧栏与输入区均渲染。截图确认主壳可见、无空白与文字压叠。
  - 复核过程中的两个测量陷阱，记录以免下次误判：`pnpm dev:desktop` 的 `pre-dev` 会 `rmSync('./out')`，若此时已有实例在跑，就会删掉它依赖的 `out/preload/index.cjs`，于是抓到“preload ENOENT + window.idexal undefined”三条假错误——那是我把被测产物删了，不是产品缺陷。另外端口 5174 被上一次 dev 的 vite 占用会让新实例直接启动失败（`Port 5174 is already in use`），必须先确认端口空闲再归因。

### 打包产物在 v3.15.14 的实机复核

- `pnpm bundle:desktop -- --os win --arch x64` 重新出包，产物 `packages/desktop/dist/`：`win-unpacked/Idexal Preview.exe` 与 `Idexal Preview-3.15.14-win-x64_TEST.exe`（150,462,088 字节）。
- **读 VersionInfo 必须在 electron-builder 完全结束后**：构建中途读同一个 exe 会得到 `ProductName=Electron / CompanyName=GitHub, Inc. / FileVersion=41.0.3`，因为 `afterPack` 的 “updating asar integrity executable resource” 与版本资源写入发生在文件已落盘之后。等日志停止增长（本例 `bundle:audit-bundle-size end`）后重读，才是 `ProductName=Idexal Preview`、`CompanyName=Idexal`、`FileDescription=Idexal Preview`、`FileVersion=3.15.14`、`ProductVersion=3.15.14.0`。这条与 v3.15.5 那次误报同源，再次记录以免重犯。
- 直接运行打包 exe（用 `--remote-debugging-port=9230` 与用户已开实例的 9229 隔离）：UA 报 `IdexalPreview/3.15.14`，窗口标题 `Idexal`，`documentElement.className = dark theme-zai-dark platform-windows-desktop`，标题栏 20px 品牌图与草稿水印均取 `mark-dark-<hash>.png`（生产构建带 hash 的官方位图），水印 `alt="Idexal"`，输入框占位文案为 “Ask Idexal anything…”，模型选择器显示 `idexal/idexal-code`。截图确认深色下标志与问候语无压叠、渐隐生效。
- 复核后只关闭自己启动的那个实例（对该实例的 CDP 端点发 `Browser.close`，并确认 9229 仍存活），不用 `taskkill`，因为本机同时存在其他 Electron 应用。
- 需要注意的副作用：启动打包版会在用户屏幕上多开一个窗口，因此“跑一下打包版”不是无副作用的只读验证；验证完应立即只关闭自己启动的那个实例。
- 纠错记录（v3.15.16）：本条原文曾断言“打包版与开发版共用同一配置目录，启动后会恢复用户的真实会话”。该断言被 v3.15.16 的实测推翻：`desktopRuntimeEnv.ts:61-66` 按运行形态取 `runtimeApplicationName`（开发态 `Idexal Dev`、打包态 `Idexal Preview`），`main/index.ts:261` 用它 `app.setName(...)`，两者因此落在**不同**的默认 userData 目录（`%APPDATA%\Idexal Dev` 与 `%APPDATA%\Idexal Preview`）。判别证据是同一次运行里两者互不影响：`Idexal Preview` 目录 mtime 随本次打包版启动更新，`Idexal Dev` 未变；且打包版起来是**未登录的英文首启状态**（默认语言 en、无任何历史会话），若真共享受信配置就不可能如此。当初的“看到用户阿拉伯语会话”最可能是把用户自己那个窗口的内容误记成了打包版窗口。教训：多实例并存时，任何“某实例显示了 X”的结论都必须先确认量的是哪个 CDP 端点，跨端点读屏会把别人的窗口当成自己的证据。
- 另一处机制纠正（v3.15.16）：`--user-data-dir` 对打包版**无效**——主进程自行解析并覆盖运行时数据路径（`main/index.ts:265-273` 在 `shouldUseElectronDefaultUserDataPath` 为假时才 `app.setPath("userData", ...)`，且 `app.setName` 已决定默认路径）。本次给打包版传 `--user-data-dir=<仓库>/z-work/profile-9231` 后该目录始终为 0 字节，而 `%APPDATA%\Idexal Preview` 被写入，即为反证。要隔离实例数据不能靠这个开关，得靠运行形态本身（Dev / Preview 已天然分离）。

### 首启引导三步实测（v3.15.16）

补上此前唯一未验证的界面：`packages/ui/src/onboarding/` 下的三步引导（旧记录里把它叫作 “OnboardingDialog” 是错的，仓库中不存在该标识符，实际入口是 `Root.tsx:1015` 常驻挂载的 `OccupationOnboarding`）。

- 触发方式：默认快捷键 `CmdOrCtrl+Shift+O`（`shared/src/shortcutCommands.ts:99`，`channel: "window"`），监听在 `window` 的 capture 阶段（`OccupationOnboarding.tsx:150`），因此对打包版合成一个 `KeyboardEvent` 即可打开，不必碰用户实例。设置页也有“打开引导”按钮（`settingsPageHelpers.tsx:885`）。
- 三步全部通过：步骤 1 “What do you do?” 职业网格 12 项；步骤 2 “Choose your UI mode”，文案 “How would you like **Idexal** to show its work?”；步骤 3 “Personalize your work assistant”，含 “Let **Idexal** remember your preferences and work context.”。中文版对应 `occupationOnboarding.modeTitle/modeDescription` 亦已读作 Idexal。
- 几何与稳定性：每步可见叶子文本块 10 个、**重叠 0、越界 0、无横向溢出**、`Runtime.exceptionThrown` 全程 0。深色下标志取 `mark-dark-<hash>.png`（56px 徽标 + 右侧大图标）。
- 品牌取自共享组件而非本地拷贝：右侧主视觉是 `IdexalStartupLogoBadge`（`OccupationOnboardingVisual.tsx:54`，与启动闪屏同一组件），因此深浅色选图逻辑与主界面一致，不存在“引导页漏改品牌”的可能；该装饰块带 `aria-hidden="true"`。窄屏下右栏 `hidden ... lg:flex` 收起，属既有响应式设计。
- 一处需要产品确认而非改名的文案：步骤 3 的 “Migrate conversations / Migrate conversation history from **Claude Code**”。这是迁移功能指向第三方真实产品名（从 Claude Code 导入历史），不是 ZCode 旧品牌残留，改名会破坏语义，故保留并在此标注出处。
- 无障碍观察（记录不修改）：该向导是全屏流程，DOM 中不存在 `role="dialog"` 或 `aria-modal="true"`（实测 `dialogCount: 0`），所以屏幕阅读器不会把它当作模态。是否补语义属于行为变更，按仓库约定需先改 spec 再动代码，本轮只记录。

### 打包产物运行时依赖闭包复核（v3.15.16）

针对构建日志里的 `[afterPack] missing runtime modules count=44` 给出结论：它是**注入成功**的信息行，不是缺陷。

- 机制：`electron-builder.config.js:304` 先扫 `app.asar` 找出缺失的 hoisted 运行时包，`:359` 打印数量，随后 `:364-397` 解压、按 `package.json` 递归补齐依赖闭包、再重写 `app.asar`。注释里写明历史动因——漏 `module-details-from-path`、`@fiahfy/icns` 的 `pngjs`、`undici`、`protobufjs/minimal` 都会让**已安装应用主进程启动即 `Cannot find module` 崩溃**。
- 构建期已有硬校验：`bundle.mjs:641` 的 `verifyPackagedRuntimeDependencies` 在 `main()` 中无条件执行（`:742-744`），任一模块缺失即 `throw`、`:760-763` 转成 `exit 1`。日志证据：`bundle:verify-runtime-dependencies start/end duration_ms=587`，且无 `runtime module not found` 告警、无 `缺少运行时依赖`。
- 产物级独立复核（不依赖退出码）：直接对 `dist/win-unpacked/resources/app.asar` 跑同一套闭包逻辑，得 `asarEntries=30630`、闭包根 15 → 展开 75 个模块、`missingCount=0`、`unresolvable=0`。
- 反向对照（证明该检查不是恒真）：同一匹配器对不存在的 `__idexal_surely_not_a_real_package__` 返回 `false`，对 `undici` / `pngjs` / `node-forge` / `@opentelemetry/sdk-metrics` 返回 `true`。因此 “0 missing” 是有判别力的结果，不是空跑。

### 品牌域名的两类残留：机器端点保留，人点的链接待决（v3.15.17 记录）

全仓扫描 `zcode` 后必须分类，否则“还有 40 个文件命中”这种数字毫无意义——绝大多数命中是上游线上契约，改名会直接打断功能。分类标准是**这个字符串是被程序消费的，还是被人点击的**。

- **机器端点，保留原值**（对端不在本仓库，改名即断登录 / 网关 / 市场 / 自动更新）：
  `shared/src/idexalEndpoint.ts:3` 默认 API origin、`desktop/src/main/remoteCdn.ts:4` CDN base、
  `shared/src/plugin-marketplaces.ts:37` 市场清单、`services/src/oauth/providers/zaiProviderConfig.ts:22`
  与 `bigmodelProviderConfig.ts:19` 的 tokenUrl、`ui/src/v4/featureSuggestedPrompts.ts:11` 素材 base，
  以及 `zcode-plan` / `zcode_official` / `zcode-artifact://` / `zcodejwttoken` / `X-ZCode-*` 等协议字面量。
- **溯源与历史记录，保留**：`NOTICE.md`、本文件的新旧对照表、CHANGELOG 3.15.0 条目与 README 更新行，
  它们存在的意义就是说明“从 ZCode 改到 Idexal”。
- **人点击的链接，属真实品牌缺口，需产品决策而非静默改写**：
  - `packages/web/src/share/ConversationShareLandingPage.tsx:91` 的 `IDEXAL_DOWNLOAD_URL = "https://zcode.z.ai"`，
    在 `:545` 渲染成文案为 “Download Idexal” 的 `<a>`、在 `:678` 渲染成“返回首页”按钮。这是**公开分享页**，
    外部访客看到的下载入口指向旧品牌域名。
  - `packages/ui/src/lib/productDocs.ts:2` 的 `IDEXAL_PRODUCT_DOCS_URL = "https://zcode.z.ai/docs"`，
    经 `App.tsx:693` `platform.openExternal(...)` 挂到应用内“文档”菜单。
  - 为什么不直接改成 `https://idexal.com`：官方站点尚未部署，改过去会把两个可用链接变成死链，
    属于用品牌问题换功能问题，比现状更糟。因此本条只记录并标注前置条件——
    **待 idexal.com 上线且提供下载页与文档路径后，仅替换这两处**，机器端点保持不动。
  - 同文件 `:90` 已有注释说明上游站点没有 `/download` 路径、根路径才是下载入口；迁移到 idexal.com
    时需要一并确认新站的落地路径，避免照搬根路径假设。
- 方法教训：品牌普查的产出必须是**分类后的可执行清单**，不是命中数。同一轮扫描里，
  `zcode|z-code` 与 `zcode|z-code|z\.ai|智谱` 两个模式给出的文件数差异巨大，因为 Z.ai / BigModel
  是本应用支持的**第三方模型供应商**，与旧品牌无关；把两者混在一个计数里会得出“改名没做完”的错误结论。

### 标签页图标取错变体（v3.15.18 修复）

品牌位图全部换完后，Web 端标签页图标仍是唯一“看着不对但说不出为什么”的地方，实测确认是真缺陷。

- 现象与根因：`packages/web/index.html` 内嵌的 32×32 base64 图标取自官方 **light** 变体
  （深色笔画 + 透明底），而该文件自己声明 `<meta name="color-scheme" content="dark" />`、
  `theme-color #161616`、脚本里 `DEFAULT_THEME = "zai-dark"`，即标签栏默认深色。深色笔画落在深色标签栏上，
  标志的白色主笔画又不在该变体里，于是只剩蓝色部件，视觉上像标志损坏。
- 定位手法（不要靠肉眼猜）：把 base64 解码，与 `logo_idexal/dark_icon_idexal.png`、
  `light_icon_idexal.png` 裁到同一 alpha 外接框、缩到同尺寸、合成到同一底色做像素比对，
  再并排渲染成一张对照图。**必须看图**：平均亮度会忽略 alpha，单看数字会误判（本轮 dark 变体
  平均亮度反而高于 light 变体，因为它的白色笔画面积更大）。
- 第一次修复（v3.15.18，**已被实测推翻**）：改成两条带 `media="(prefers-color-scheme: dark|light)"` 的 `<link rel="icon">`，
  分别用官方成对提供的两个变体。静态比对载荷是对的，但没在真实浏览器里验证选择结果。
- 端到端验证暴露问题（v3.15.19）：跑 `pnpm --filter @idexal/web build` 出生产包、用静态服务器托管、
  在真实 Chromium 里读 `matchMedia` 与实际存活的 `link[rel=icon]`。结果是本机系统浅色而应用默认深色
  （`html.class = dark theme-zai-dark`，脚本写入 `colorScheme: dark`，标签栏因此是深色），
  浏览器按 `prefers-color-scheme` 选中 **light 变体（深色笔画）放到深色标签栏上——等于没修**。
  这不是边缘情况，而是本应用默认主题下的常态。根因：`prefers-color-scheme` 跟**系统**设置，
  标签栏底色跟**应用内** store 主题，两者可以相反。
- 正确修复：两个变体仍作为 `<link data-idexal-theme="dark|light">` 声明，但**不用 media 属性**，
  改由首屏主题脚本按它已经算出的 `finalTheme`（同一处逻辑已在同步 `theme-color` 与 `colorScheme`）
  移除不该生效的那一条，使笔画颜色始终与标签栏底色相反。
- 双向复核：应用深色时只剩 `data-idexal-theme=dark`、不透明像素平均亮度 197（白色笔画）；
  置 `localStorage['idexal-theme']='light'` 重载后只剩 `=light`、亮度 70.9（深色笔画），
  且 `theme-color` 同步为 `#f8f8f8`、`#root` 正常挂载。两个方向都对，证明不是写死。
- 产物层复核：`packages/web/dist/index.html` 保留两条链接且载荷与官方变体一一对应，
  说明 Vite 处理 HTML 不会破坏内嵌 data URI。
- 残余限制（明确记录）：图标在首屏按**已持久化**的主题选定，会话内切换主题不会即时更换，
  这与该脚本对 `theme-color` / `colorScheme` 的既有处理一致；要即时跟随需在应用主题服务里加副作用，
  属新增行为，未在本轮擅自引入。`public/favicon.ico` 属浏览器兜底请求、无法按主题分流，统一取
  深色主题下可读的 dark 变体。要与主题彻底解耦，需给标志加自有深色圆角底板（即应用图标那种形态），
  属品牌样式决策，先定方案再改。

### 已发布 Releases 的产物缺口（v3.15.20 审计）

- 一致性没问题：本地 `v3.15.*` 标签 20 个 ↔ GitHub releases 20 个，双向都没有孤儿，
  全部非 draft、非 prerelease，命名统一 `Idexal vX.Y.Z`，`latest` 指向最新发布。
  审计脚本用 `git credential fill` 取本机凭据，不使用聊天中粘贴过的 token。
- **缺口：20 个 release 的 assets 全为 0**，即 GitHub 上下载不到安装包。
  本地产物是有的（`packages/desktop/dist/Idexal Preview-3.15.14-win-x64_TEST.exe`，约 150MB），
  但从未上传。
- 为什么先不传：未签名；文件名 `_TEST` 是后端环境标记（`desktopArtifactEnvSuffix`）而非品牌残留，
  以什么形态对外发布属产品决策；且现存产物是 3.15.14 的，落后于当前版本，
  直接上传等于发布一个与最新代码不一致的安装包。需要的是"重新出当前版本包 + 决定是否签名 + 确认命名"，
  而不是把旧文件挂上去。
- 测试装置结论（避免误判为缺陷）：把 `packages/web/dist` 用无后端静态服务器托管时，
  必然报 `ws://…/ws` 握手失败、`Unexpected response code: 200`——静态服务器把 `/ws` 按 SPA 回退
  返回了 index.html。属测试环境缺后端，不是产品问题。

### 官方站点其实已上线：纠正一条被我引用了三轮的前提（v3.15.21）

- 前几轮把"`idexal.com` 尚未部署，所以不能替换人点击的链接"写进了结论。本轮直接探测发现该前提是错的：
  `https://idexal.com` 返回 **200**，标题 `Idexal — AI products that build with you`，DNS 解析到 Cloudflare。
  误判来自一次 `curl -w %{http_code}` 输出 `000` 的抖动，我没有复测就把它当成了"站点不可达"的事实。
- 处置：公开分享页的下载入口已切到 `https://idexal.com`（根路径，因为 `/download` 实测 404，
  且源码既有注释说明首页本身就是下载入口）；应用内"文档"菜单**保持不动**，
  因为官方站目前只有根路径——`/docs`、`/documentation`、`/guide`、`/guides`、`/handbook`、
  `/blog`、`/help`、`/faq` 全部 404，切换只会制造死链。
- 教训：一条"外部条件不满足"的结论必须用可复现的探测支撑，单次网络非零返回不等于对方不可用；
  尤其当我打算据此连续几轮不做某件事时，更应复测或换协议/换重试再确认。

## 已知非品牌问题（记录以免被当成改名引入）

- 实测（v3.15.3，CDP 直连运行中的桌面应用）：应用主题为深色时 `documentElement.className` 为 `dark theme-zai-dark platform-windows-desktop`，而 `matchMedia('(prefers-color-scheme: dark)').matches` 仍为 `false`（系统为浅色）。因此仓库里全部 122 处 `dark:` 工具类在桌面端启动阶段和 Web 端都跟系统偏好走，而不是跟应用主题走：这是上游遗留的主题机制问题，不属于品牌重构，本版本只把品牌位图的选图改成读 store 主题以消除“标志看不见”的后果，没有全局改写 `dark` 变体语义（那会影响所有 shadcn 组件的既有表现，需要单独设计与验收）。

- `pnpm dev:web` 在 Windows 上因 `packages/server` 的 `--onSuccess` 使用单引号而失败（cmd.exe 不识别单引号），已在 3.15.1 改为双引号。
- About 窗口以 `data:text/html` 加载且 CSP 为 `img-src data:`，无法引用打包后的图片文件，因此其品牌标志以内联 data URI 提供，见 `packages/desktop/src/main/aboutWindowLogo.ts`。
- 未登录时 `idexal-agent.subscribeSessionsIndexV4` 返回 'Idexal Agent runtime is not running.' 属预期守卫：Agent 运行时在鉴权并挂载工作区之后才启动。
- 桌面专属通道 `window-controller` 在 Web 目标中会超时，属平台差异，与品牌无关。
- **手机 Web 宽度下输入框的 Send 按钮不可达（v3.15.13 已修复）**：390×844 冷启动 Web 目标并跳过鉴权进入主壳后，侧栏保持展开占 195px，而 `.chat-composer-input-surface` 实测 `x=216, width=271`（右边界 487），已经超出 390 的视口；其内层卡片带 `overflow-hidden`，且 `documentElement.scrollWidth === 390`（页面不产生横向滚动），于是工具栏右侧的 `Send`（`x=446..474`）、模型选择器（`idexal/auto/best-coding`）、`On` 与分支 chip `main` 全部被裁到视口外且**无法通过滚动触达**。
  - 真实根因（v3.15.13 定位并修复）：响应式收起逻辑本身是**正确且已实现**的，缺的只是挂载时那一次执行。`WorkspaceShellLayout` 的 `runAutoCollapseForWindowResize` 只注册在 `window` 的 `resize` 监听上（`WorkspaceShellLayout.tsx:524`），从未在 mount 时运行；页面“一打开就是窄视口”时没有任何事件会触发它。判别方法是同一视口对照：390×844 冷加载 → 侧栏 195、conversation 318、`Send` 右边界 474 不可达；同一 390×844 下任意一次 resize 后 → 侧栏归零、`Send` 右边界 346 可达。conversation 318 已低于 `CONVERSATION_AUTO_COLLAPSE_SIDEBAR_WIDTH_PX = 360`，说明按既有阈值本就该收起。
  - 修复：在注册 resize 监听后补一次挂载期执行，用双层 `requestAnimationFrame` 等首屏布局稳定再读宽度，只跑一次、不引入 ResizeObserver，因此完整保留原注释声明的语义（“自动收起只响应用户改变窗口尺寸后的 conversation 实际宽度，不监听 conversation 自身 ResizeObserver，避免用户手动打开面板时又被策略关回去”）。修复后实测：390 冷加载侧栏归零、surface 342、`Send` 位于 x=318..346 可达、错误数降为 2（仅 `window-controller`）；1280 冷加载无回归，侧栏 264、conversation 1010、`Send` 可达。`pnpm typecheck` 0 错误、oxlint 70 warnings / 0 errors、oxfmt 与 architecture:check 通过。
  - 纠错记录：本条在 v3.15.11/v3.15.12 曾被判为“需要产品先定方案的响应式设计缺口”，并据此只记录不实现。该判断错了两次——先误以为“移动端已实现只是没接线”，后又误以为“没有窄屏布局方案、要新写渲染与状态逻辑”。实际机制是 mount 期缺一次调用。教训：断言“这是设计缺失、需要产品决策”之前，先用同一视口做“冷加载 vs resize 后”的对照；两者不一致就说明布局逻辑存在且正确，只是没被触发，那属于初始化缺陷而非设计缺口。
  - 桌面端回归边界（v3.15.14 记录）：`WorkspaceShellLayout` 是桌面与 Web 共用的，所以“挂载期补一次收起”必须确认不会在桌面正常窗口下误触发。做法是**只读**取现成桌面渲染进程的几何（不导航、不重载、不打断用户会话）：窗口 `innerWidth×innerHeight = 1536×824`，conversation 实测 **691px**，远高于两个阈值（侧栏 360 / 右侧面板 480），侧栏 264 可见，`scrollWidth === 1536` 无溢出。结论：桌面在真实窗口尺寸下不可能进入新加的挂载期收起分支；只有把窗口拖到 conversation < 360 才会触发，而那与用户手动 resize 后本就会发生的收起完全一致，属既有语义而非新行为。
  - 曾用于排除的错误假设（保留以免后人重走）：`V4ComposerToolbar` 的 `isMobileViewport` 是死 prop（只在类型 `:334` 与解构默认值 `:372` 出现，组件体从未读取），三个 `isMobileViewport: false` 字面量（`ConversationComposer.tsx:827/832`、`SessionPane.tsx:2083`）只喂 `ComposerAutoFocusOptions` 的聚焦决策；`WorkspaceSidebarCollapsedRail` 只有定义与 `WorkspaceSidebar.tsx:156` 的再导出，主壳并不渲染它。真正生效的窄屏适配是容器查询（如 `ConversationBackgroundWorkTrigger.tsx:112/137` 的 `@max-[480px]/composer`），实测在 271px 容器下已处于紧凑态，所以工具栏一行都放不下并非设计遗漏，而是容器被 `min-width: auto` 的 flex 链撑住、无法收缩到可用列宽。
  - 同一轮量测里出现过一个假阳性，记录以免被当成缺陷：水印 `[data-v4-draft-logo]` 与文案 “Choose the app theme and…” 算出 7073px² 重叠，但那句文案属于**叠在主壳之上的 Settings 面板**，水印属于下层草稿空态，两者不在同一渲染层。做矩形相交前先确认两个盒子同层；随后在关闭 Settings 的主壳上重测，才得到上面这条可复现结论。
- `[Root] 刷新 Provider Runtime 失败: Error: Idexal Built-in cdn: invalid response`：桌面与 Web 冷启动都会打印，来自 host 侧 `downloadIdexalBuiltinRelease` 拉取内置 provider release 失败。本机对外部 CDN 不可达（与 Electron 二进制镜像 DNS 失效同源），属网络环境限制而非代码缺陷；它解释的是内置 provider 目录无法刷新，不影响品牌与界面链路。同一环境下用户已登录会话仍可正常选择 `idexal/auto/best-coding` 并执行任务，所以不能把这条日志当成运行时不可用的证据。
