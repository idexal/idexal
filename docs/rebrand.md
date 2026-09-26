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
- 深浅切换规则（实测修正）：品牌位图的墨色必须由 `useIdexalStore((s) => s.theme)` + `resolveTheme(theme)` 显式选图（同 `GlmMonochromeIcon`、`App.tsx` 的 `appLogoUrl`），**不得**用 Tailwind `dark:` 互斥两张 `<img>`。原因是本仓没有声明 class 版的 dark 变体，`node_modules/shadcn/dist/tailwind.css` 也没有，因此 `dark:` 编译为 `@media (prefers-color-scheme: dark)`；桌面端 `desktopMainIpcPlatform.ts` 会写 `nativeTheme.themeSource`，媒体查询随应用主题变化，看起来是对的，而 Web 目标里它只跟操作系统偏好，应用主题与系统偏好相反时深色底会压深色墨。实测证据：`packages/desktop/out/renderer/assets/styles-*.css` 内为 `@media (prefers-color-scheme:dark){.dark\:block{display:block}.dark\:hidden{display:none}}`，在浏览器里给祖先加 `.dark` 或改 `color-scheme: dark` 都不会让 `dark:hidden` 生效。
- 宽度取 `w-28`（112px → 可见高约 37px），与上方 96px 徽标形成组合锁版；组件自带 `max-w-full`，窄屏不会溢出。
- 验收口径：构建产物必须出现 `logo-light-*.png` / `logo-dark-*.png` 且被 JS chunk 引用（此前该组件无调用方，两张图会被 tree-shaking 移除）。

## 已知非品牌问题（记录以免被当成改名引入）

- `pnpm dev:web` 在 Windows 上因 `packages/server` 的 `--onSuccess` 使用单引号而失败（cmd.exe 不识别单引号），已在 3.15.1 改为双引号。
- About 窗口以 `data:text/html` 加载且 CSP 为 `img-src data:`，无法引用打包后的图片文件，因此其品牌标志以内联 data URI 提供，见 `packages/desktop/src/main/aboutWindowLogo.ts`。
- 未登录时 `idexal-agent.subscribeSessionsIndexV4` 返回 'Idexal Agent runtime is not running.' 属预期守卫：Agent 运行时在鉴权并挂载工作区之后才启动。
- 桌面专属通道 `window-controller` 在 Web 目标中会超时，属平台差异，与品牌无关。
