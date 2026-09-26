# Changelog

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
