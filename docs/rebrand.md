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

## 已知非品牌问题（记录以免被当成改名引入）

- 实测（v3.15.3，CDP 直连运行中的桌面应用）：应用主题为深色时 `documentElement.className` 为 `dark theme-zai-dark platform-windows-desktop`，而 `matchMedia('(prefers-color-scheme: dark)').matches` 仍为 `false`（系统为浅色）。因此仓库里全部 122 处 `dark:` 工具类在桌面端启动阶段和 Web 端都跟系统偏好走，而不是跟应用主题走：这是上游遗留的主题机制问题，不属于品牌重构，本版本只把品牌位图的选图改成读 store 主题以消除“标志看不见”的后果，没有全局改写 `dark` 变体语义（那会影响所有 shadcn 组件的既有表现，需要单独设计与验收）。

- `pnpm dev:web` 在 Windows 上因 `packages/server` 的 `--onSuccess` 使用单引号而失败（cmd.exe 不识别单引号），已在 3.15.1 改为双引号。
- About 窗口以 `data:text/html` 加载且 CSP 为 `img-src data:`，无法引用打包后的图片文件，因此其品牌标志以内联 data URI 提供，见 `packages/desktop/src/main/aboutWindowLogo.ts`。
- 未登录时 `idexal-agent.subscribeSessionsIndexV4` 返回 'Idexal Agent runtime is not running.' 属预期守卫：Agent 运行时在鉴权并挂载工作区之后才启动。
- 桌面专属通道 `window-controller` 在 Web 目标中会超时，属平台差异，与品牌无关。
- **手机 Web 宽度下输入框的 Send 按钮不可达（实测，未修复，待与产品对齐修法）**：390×844（iPhone 12/13/14 宽度）冷启动 Web 目标并跳过鉴权进入主壳后，侧栏保持展开占 195px，而 `.chat-composer-input-surface` 实测 `x=216, width=271`（右边界 487），已经超出 390 的视口；其内层卡片带 `overflow-hidden`，且 `documentElement.scrollWidth === 390`（页面不产生横向滚动），于是工具栏右侧的 `Send`（`x=446..474`）、模型选择器（`idexal/auto/best-coding`）、`On` 与分支 chip `main` 全部被裁到视口外且**无法通过滚动触达**。链路是 `group/toolbar flex items-end gap-3`（nowrap）+ 右侧组 `shrink-0`，加上外层内容列没有把宽度约束住，所以 composer 被撑到比可用列宽更宽。属上游布局在小屏下的适配缺失，不是品牌改动引入的。两个候选修法需要产品先定：① 让内容列以 `min-w-0` 约束住 composer 宽度并允许工具栏在窄屏换行/收纳次要控件；② 在窄断点自动收起侧栏为已有的 `WorkspaceSidebarCollapsedRail`，把 195px 还给内容区。二者取舍不同（前者保住侧栏信息密度，后者保住工具栏一行布局），因此不擅自叠加兜底分支。
  - 同一轮量测里出现过一个假阳性：水印 `[data-v4-draft-logo]` 与文案 “Choose the app theme and…” 的重叠面积算出 7073px²，但那句文案属于**叠在主壳之上的 Settings 面板**，水印属于下层草稿空态，两者不在同一层，不构成缺陷。教训与 v3.15.7 那条同源：做矩形相交前先确认两个盒子在同一渲染层；本轮随后在关闭 Settings 的主壳上重测，才得出上面那条可复现结论。
- `[Root] 刷新 Provider Runtime 失败: Error: Idexal Built-in cdn: invalid response`：桌面与 Web 冷启动都会打印，来自 host 侧 `downloadIdexalBuiltinRelease` 拉取内置 provider release 失败。本机对外部 CDN 不可达（与 Electron 二进制镜像 DNS 失效同源），属网络环境限制而非代码缺陷；它解释的是内置 provider 目录无法刷新，不影响品牌与界面链路。同一环境下用户已登录会话仍可正常选择 `idexal/auto/best-coding` 并执行任务，所以不能把这条日志当成运行时不可用的证据。
