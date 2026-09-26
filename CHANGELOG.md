# Changelog

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
