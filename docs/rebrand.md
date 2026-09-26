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
