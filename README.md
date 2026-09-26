# Idexal

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./logo_idexal/dark_logo_idexal.png" />
    <img src="./logo_idexal/light_logo_idexal.png" alt="Idexal" width="360" />
  </picture>
</div>
<p align="center">
  <a href="https://idexal.com">idexal.com</a> ·
  <a href="https://github.com/idexal/idexal">GitHub</a> ·
  <a href="https://github.com/idexal/idexal/issues">Issues</a> ·
  <a href="mailto:contact@idexal.com">contact@idexal.com</a>
</p>
<p align="center">
  简体中文 | <a href="README.en.md">English</a>
</p>

Idexal 是 AI 编程工作台，提供桌面应用、浏览器界面和终端 Agent。本仓库包含客户端、后端服务、共享 UI，以及 Agent CLI 与运行时源码。

## 更新

- 2026-9-26：更新至 Idexal v3.15.11 版本，补记手机 Web 390px 下 composer 的 Send 按钮被裁到屏外且无法滚动触达的实测缺陷与两种待定修法，并记录浅色主题与引导全流程复核通过。
- 2026-9-26：更新至 Idexal v3.15.10 版本，补齐 3.15.9 hook 修复的桌面端冷启动回归复核，并记录 Provider Runtime 外网刷新失败属环境限制。
- 2026-9-26：更新至 Idexal v3.15.9 版本，修复 Web 端 workspacePath 异步到位时 hook 数量变化导致 OnboardingDialog 子树崩溃，并去掉浏览器标签标题里的内部接线字样。
- 2026-9-26：更新至 Idexal v3.15.8 版本，修复 App 主题选“跟随系统”时品牌位图与已生效主题不一致（浅色页面配白色标志）的问题，品牌选图改为只订阅 .dark 类。

- 2026-9-26：更新至 Idexal v3.15.7 版本，修复深色主题下草稿首页问候语被满强度品牌水印压住导致看不清的问题（遮罩不再按主题分支）。

- 2026-9-26：更新至 Idexal v3.15.6 版本，品牌素材一致性改为逐像素溯源证明：UI 位图与官方素材差值 0.000，Windows 图标经内边距归一化后确认与官方母图同源。
- 2026-9-26：更新至 Idexal v3.15.5 版本，逐像素取证 Windows exe 与 NSIS 安装包已携带官方品牌图标和 Idexal 文件身份信息，并记录 About 窗口不放 wordmark 的实测理由。
- 2026-9-26：更新至 Idexal v3.15.4 版本，修复 3.15.3 在启动遮罩上误用 store 导致的页面错误，并补齐 wordmark 的固有比例。
- 2026-9-26：更新至 Idexal v3.15.3 版本，官方 wordmark 落地到应用内启动遮罩，并修复品牌位图深浅切换跟随操作系统而非应用主题的问题。
- 2026-9-26：更新至 Idexal v3.15.2 版本，补充品牌视觉验收口径与已知非品牌问题说明。
- 2026-9-26：更新至 Idexal v3.15.1 版本，修复 Windows 下 `pnpm dev:web` 因 shell 引号差异无法启动的问题。
- 2026-9-26：更新至 Idexal v3.15.0 版本，完成从上游 ZCode 到 Idexal 的完整品牌重构。完整记录见 [CHANGELOG.md](CHANGELOG.md)。
- 2026-9-23：更新至 Idexal v3.14.3 版本。

## 初始化

准备 Git、Node.js **24.14.0** 和 pnpm **10.33.2**，版本以 [mise.toml](mise.toml) 为准。以下开发和打包命令均在仓库根目录执行。

```bash
pnpm bootstrap
```

`pnpm bootstrap` 安装 workspace 依赖、准备桌面本地运行资源，再执行 `build:bootstrap`。

Agent CLI 与运行时源码位于 [apps/idexal-cli/](apps/idexal-cli/)，作为普通目录随本仓库一起克隆，无需单独拉取或初始化 Git submodule。

根据需要选择其他初始化或构建入口：

| 命令                           | 用途                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `pnpm install`                 | 安装依赖                                                          |
| `pnpm prepare:desktop-runtime` | 准备桌面运行资源，默认包含远程资源准备                            |
| `pnpm prepare:remote-assets`   | 单独准备远程运行资源                                              |
| `pnpm bootstrap:with-remote`   | 初始化依赖、本地与远程资源，并串行构建相关包；跳过桌面应用 bundle |
| `pnpm build`                   | 递归执行各 workspace 包的构建脚本，包括包内的资源准备步骤         |

默认 `bootstrap` 跳过远程资源准备，适合本地桌面开发。使用远程工作区或验证远程发行资源时，再运行对应准备命令。

## 开发与运行

### 桌面版

```bash
pnpm dev:desktop

# 使用测试环境
pnpm dev:desktop:test
```

`pnpm dev:desktop` 默认等同于 `pnpm dev:desktop:prod`，使用生产服务配置。启动脚本会准备本地运行资源、构建桌面 Agent，再启动 Electron 和源码监听。

需要独立开发数据目录时，可设置 `IDEXAL_DATA_BASE_DIR`。例如在 macOS / Linux 中：

```bash
IDEXAL_DATA_BASE_DIR="$HOME/.idexal-dev-home" pnpm dev:desktop:test
```

### 远程功能（SSH/WSL）

先执行 `pnpm bootstrap:with-remote` 准备远程资源（mock-cdn），再 `pnpm dev:desktop`；连接远程项目时资源选择「本地下载后上传」。开发态资源取自本地 `packages/desktop/mock-cdn` 和本地构建产物，经 SFTP 上传到远程，不访问 CDN。

### Web 开发

修改 Web 或后端源码时，使用开发模式：

```bash
pnpm dev:web

# 指定后端工作区（macOS / Linux）
IDEXAL_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

该命令同时启动 Web 开发服务器（默认 `http://localhost:5173`）和后端（默认 `http://localhost:3030`）；浏览器访问前者。`/ws` 和一般 `/api` 请求代理到本地后端，`/api/v1/oauth/token` 单独代理到当前配置的产品服务。

Agent 源码修改后，执行 `pnpm --filter @idexal/cli... build` 并重启服务。需要验证完整发行包时，按下方“Idexal 命令行版”打包章节解压运行。

### Idexal 命令行版

命令行发行包包含 TUI、Web 和 Agent，统一使用 `idexal` 启动：无参数进入 TUI；第一个参数为 `--web` 时启动 Web；其他参数交给现有 Agent CLI 处理。两种模式都在本机运行，无需 Electron。

```bash
# 默认进入终端交互界面
idexal

# 启动 Web 界面
idexal --web

# 指定项目和端口，不自动打开浏览器
idexal --web --workspace /path/to/project --port 3030 --no-open

# 查看 CLI 或 Web 参数
idexal --help
idexal --web --help
```

Web 模式默认工作目录为当前目录，监听 `127.0.0.1`，默认不启用访问令牌，自动选择空闲端口并打开浏览器。访问终端输出的地址，按 `Ctrl+C` 停止服务。局域网访问可使用 `--host 0.0.0.0`；监听非本机地址时默认生成访问令牌，使用终端输出的带令牌链接。可通过 `--token` 指定令牌或 `--no-token` 关闭令牌认证。

直接启动通用 Web 服务的 HTTP 入口时，通过 `IDEXAL_SERVER_AUTH_TOKEN` 配置 API／WebSocket 认证；通过程序接口创建服务时，使用 `authToken` 选项。

构建方式见下方打包章节。`pnpm build:idexal` 只生成发行包，不会替换 `PATH` 中已有的 `idexal`。如果命令仍指向旧安装或其他源码目录，macOS / Linux 可用 `command -v idexal` 检查，Windows 可用 `where.exe idexal` 检查。

### CLI 源码开发

直接开发 TUI 或 Agent 时，运行源码入口：

```bash
pnpm --filter @idexal/cli dev --help
pnpm --filter @idexal/cli dev

# 构建 CLI 及其 workspace 依赖
pnpm --filter @idexal/cli... build
node apps/idexal-cli/packages/cli/dist/idexal.cjs --help
```

这个入口直接运行 Agent CLI，不经过发行包的 `--web` 分流。开发 Web 用 `pnpm dev:web`；验证统一的 `idexal` 命令，用下方解压后的 `bin/idexal.mjs`。

## 配置

根目录 [.env.example](.env.example) 提供服务地址与构建配置示例，可按需复制到 `.env`，本地覆盖放入 `.env.local`。Desktop 的开发环境通过 `dev:desktop:test` / `dev:desktop:prod` 选择。

| 配置                                  | 用途                                             |
| ------------------------------------- | ------------------------------------------------ |
| `IDEXAL_DATA_BASE_DIR`                | 应用数据基目录，数据写入其下的 `.idexal/`        |
| `IDEXAL_SERVER_WORKSPACE`             | Web 后端的工作区路径                             |
| `IDEXAL_BUILTIN_PROVIDER_CONFIG_FILE` | 本地 Provider 配置文件路径；未设置时使用内置配置 |
| `IDEXAL_DIST_BASE_URL`                | 命令行安装脚本使用的下载根地址                   |

运行时变量可在启动命令的环境中显式设置。随客户端发布的默认配置见 [config/README.md](config/README.md)。

## 打包

第三方声明的事实来源是根目录 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)；组件清单、上游许可原文、内置 Node 运行时与 native-search 归档等声明材料位于 [third-party/](third-party/)，由 `scripts/generate-third-party-notices.mjs` 生成、`scripts/third-party-notices.mjs` 在打包与发行校验时读取。

### 桌面版

```bash
pnpm bundle:desktop

# 指定目标平台与 CPU 架构
pnpm bundle:desktop -- --os win --arch x64

pnpm bundle:desktop -- --help
```

默认目标为 macOS arm64，默认输出目录为 `packages/desktop/dist/`。`--os` 支持 `mac`、`win`、`linux`，`--arch` 支持 `x64`、`arm64`；实际打包与签名需要目标平台对应的工具和配置。

安装：双击打开产物 DMG，将 Idexal 拖入"应用程序"。本地构建未签名，首次打开若被 macOS 拦截，执行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/Idexal.app
```

### Idexal 命令行版

构建入口为 `pnpm build:idexal`。脚本会依次构建 CLI/TUI、后端和 Web，收集 TUI 的原生库、worker 与运行时依赖，再组装发行包；运行发行包仍需要 Node.js，版本以 `mise.toml` 为准。

打包前必须设置下载根地址 `IDEXAL_DIST_BASE_URL`（可放在 `.env`、`.env.local` 或环境变量中），也可以通过 `--base-url` 传入。以下地址是占位示例，发布时替换为实际托管地址：

```bash
pnpm build:idexal --base-url https://downloads.example.com/idexal/

# 已配置 IDEXAL_DIST_BASE_URL 时
pnpm build:idexal

# 仅重新组包，复用已有的 Agent、后端和 Web 构建产物
pnpm build:idexal --skip-build

# 查看版本、输出目录等可选参数
pnpm build:idexal --help
```

默认版本取根目录 `package.json`，输出目录为 `dist/idexal/`：

- `releases/<version>/idexal-<version>.tar.gz`：运行包。
- `releases/<version>/sha256.txt`：校验摘要。
- `latest.json`、`install.sh`：版本索引和安装脚本。

完整目录可上传到配置的下载根地址。安装脚本从该地址下载运行包，默认安装到 `~/.idexal/runtime`，并在 `~/.local/bin` 创建 `idexal` 命令。安装目录可通过 `IDEXAL_DIST_HOME` 修改，命令目录可通过 `IDEXAL_DIST_BIN_DIR` 修改。

旧 Lite 用户需要改用上述构建命令、环境变量和新的安装脚本。新安装不会删除旧 Lite 目录，也不会迁移或删除已有会话数据。

本地调试打包产物时，可直接解压运行，无需上传或安装：

```bash
idexal_version=$(node -p "require('./dist/idexal/latest.json').version")
mkdir -p dist/idexal/debug
tar -xzf "dist/idexal/releases/$idexal_version/idexal-$idexal_version.tar.gz" \
  -C dist/idexal/debug
# 默认启动 TUI
node dist/idexal/debug/idexal/bin/idexal.mjs

# 启动 Web
node dist/idexal/debug/idexal/bin/idexal.mjs --web \
  --workspace "$PWD" --port 3030 --no-open
```

浏览器打开 `http://127.0.0.1:3030`，即可验证同一后端服务托管 Web 页面和 Agent 的完整链路。该端口需要空闲；如正在运行 `pnpm dev:web`，可改用其他 `--port`。

## 仓库结构

| 目录                                                 | 职责                                       |
| ---------------------------------------------------- | ------------------------------------------ |
| `packages/desktop`                                   | Electron Main、Host、Renderer 与桌面打包   |
| `packages/web`                                       | Web 客户端                                 |
| `packages/server`                                    | HTTP / WebSocket 服务与远程连接            |
| `packages/idexal-server-cli`                         | 独立 Server 启动与进程管理                 |
| `packages/ui`                                        | 共享 React 组件、hooks 与 Zustand 状态     |
| `packages/services`                                  | 业务服务与持久化                           |
| `packages/shared`、`packages/rpc`、`packages/client` | 共享协议和类型、RPC 框架、Agent 客户端 SDK |
| `packages/provider`、`packages/provider-node`        | Provider 公共能力与 Node 实现              |
| `apps/idexal-cli`                                    | Agent CLI、TUI、运行时与工具               |
| `scripts`、`config`、`third-party`                   | 构建维护脚本、内置配置与第三方声明材料     |

## 项目声明

功能与优惠范围、维护规则、执行与数据风险，以及许可和第三方版权说明，详见 [NOTICE.md](NOTICE.md)。

产品、部署与商务合作问题请联系 <contact@idexal.com>；使用问题优先通过 [GitHub Issues](https://github.com/idexal/idexal/issues) 反馈。
