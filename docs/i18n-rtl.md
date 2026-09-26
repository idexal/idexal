# 界面语言与排版方向（i18n / RTL）

## 产品规则

1. 应用语言集合为 **阿拉伯语 `ar`、英语 `en-US`、法语 `fr`**。
2. `zh-CN` 仍保留在 `Locale` 联合类型与设置校验中，但**不再作为默认值**，也不再出现在语言切换器里。
   保留它的唯一理由是：已落盘的 `setting.json` 里可能写着 `locale: "zh-CN"`，若从 schema 中移除，
   整份设置会解析失败并回落到默认值，等于升级即清空用户配置。彻底删除需要一次带迁移的独立改动。
3. 排版方向**由语言推导**，不作为独立设置项：`ar → rtl`，其余 `→ ltr`。
   任何需要方向的地方都必须调用 `resolveTextDirection(locale)`，不允许自己写 `locale === "ar"`。
4. 未翻译的文案回退到**英文**，不回退到中文，也不回退成 key 字面量。

## 唯一所有者与依赖方向

| 概念                                | 所有者                                              | 位置                                                  |
| ----------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| 语言集合、方向推导、系统语言映射    | `@idexal/shared`                                    | `packages/shared/src/protocol.ts`                     |
| 当前语言与偏好、`document.dir/lang` | `IdexalIntlProvider`                                | `packages/ui/src/i18n/IntlProvider.tsx`               |
| 文案表                              | 每语言一个文件                                      | `packages/ui/src/i18n/locales/{ar,en-US,fr,zh-CN}.ts` |
| 设置里的语言下拉                    | `settingsPageHelpers.tsx` 的 `LOCALE_SELECT_VALUES` | 单一列表，新增语言只改这里                            |

`isSupportedLocale` / `localeFromLanguageTag` / `FALLBACK_LOCALE` 都定义在 shared，
桌面渲染进程与 UI 层共用同一份，避免"新增语言只改了一处宿主"。

## 新增一种语言的正确步骤

1. `protocol.ts`：加入 `Locale` 联合、`isSupportedLocale`、`RTL_LOCALES`（若为 RTL 语言）、
   `localeFromLanguageTag` 的语言族判断。
2. `validationAppSettings.ts`：`localeSchema` 与 `localePreferenceSchema`。
3. `settingsPageHelpers.tsx`：把值加进 `LOCALE_SELECT_VALUES`。
4. 新建 `locales/<tag>.ts`，**只需翻译已经做过的界面**，其余键自动回退英文。
5. `IntlProvider.tsx`：注册进 `MESSAGES`。

第 4 步刻意不要求一次译完 5870 条：`createIntl` 的
`目标语言 → en-US → key` 回退链保证半成品语言可用且不会泄漏内部标识。

## 外部契约：不随界面语言扩张

这些是**机器或对端页面的契约**，不是本应用的语言集合，新增语言时必须保持窄类型：

| 契约                                                     | 允许值        | 处理方式                                                 |
| -------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| `CodingPlanWebviewLocale`（官网订阅页 `__idexalLang__`） | zh-CN / en-US | `toCodingPlanWebviewLocale()` 把 ar/fr 降级为 en-US      |
| 分享站 URL 前缀（`/cn/share` 与裸 `/share`）             | zh-CN / en-US | `ConversationShareSiteLocale`；无前缀即英文站            |
| `BotMessageLocale`（飞书/微信回复）                      | zh-CN / en-US | 默认值已从 zh-CN 改为 en-US                              |
| `community_urls`（远端配置）                             | zh-CN / en-US | ar/fr 取英文入口                                         |
| `providerTemplateNameMap`                                | 可选键        | 缺 `ar`/`fr` 时 `resolveProviderTemplateName` 回退 en-US |

## 翻译覆盖现状

| 语言    | 键数 | 相对 `en-US` 覆盖率 | 覆盖范围                                                   |
| ------- | ---- | ------------------- | ---------------------------------------------------------- |
| `en-US` | 5872 | 100%（事实来源）    | 全量                                                       |
| `ar`    | 386  | 6.57%               | 登录/引导 + 外壳 + 设置页前两区 + 输入框与 @ 引用 + 崩溃屏 |
| `fr`    | 386  | 6.57%               | 同上，键集与 `ar` 逐一相同                                 |
| `zh-CN` | 5871 | 遗留                | 仅兼容旧配置，不再新增文案                                 |

> **这些数字怎么来的，以及之前为什么错**：3.16.1–3.16.3 三份 changelog 里的
> `5859 / 208 / 317 / 371` 全部偏低，因为当时是**用正则数键名**，字符集写成
> `[A-Za-z0-9_.]`，**静默跳过**了含连字符与非 ASCII 的键
> （`sidebar.settings.locale.en-US`、`ssh.assetInstallMode.local-download-upload`、
> `feedback.severity.P1-高.label`——en-US 漏 13 个、ar/fr 各漏 4 个）。
> 现在改为**真正加载语言表模块**再 `Object.keys`。
> 教训：门禁看不到它解析不到的东西时，照样报绿灯。

未译部分靠回退链显示英文。补齐时**按界面取键，不要按前缀取键**：界面上真实可见的文案常常不在
直觉的前缀下——"New task" 在 `taskList.newThread`、"Search" 在 `commandCenter.*`、
"Automations" 在 `workspace.*`。可靠做法是按英文值反查键，再从 DOM 元素反查组件与 `intl` 调用点；
设置页这类界面还可以直接扫组件里出现的 `id: "…"` 字面量（`settingsPageConfig.ts` 的
`titleId / contentTitleId / descriptionId` 就是导航文案的唯一来源）。

`ar` 与 `fr` 的键集必须保持对称：新增语言条目时两份文件同批提交，并用 `diff` 比对键名列表。

**键补齐 ≠ 值正确**。已发生的三类值级缺陷需要单独扫：句子里漏译的英文单词
（`Demandez anything à Idexal`）、语法不通的阿语（`تُعاد التعيين` 对应 `Resets`）、以及被截断的半句。
两条机器可查的不变量：每条值的 `{placeholder}` 集合必须与英文逐字一致；值不得为空且必须能被解析出来。

有两类文案**不是客户端能译的**：由服务端下发内容的建议芯片（`PPT Creation`、`Error Fix`、
`Weekly Summary` 等）。要覆盖它们需要服务端按语言返回，或在前端建立"返回值 → 键"的映射表。

## 尚未实跑验证的界面

再起一个隔离 dev 实例要先跑 `@idexal/desktop` 的 `pre-dev`，它会 `rmSync('./out', {recursive:true})`，
而用户正在运行的开发实例有 `tsup --watch` 在写同一份 `out/`。这些隔离环境变量
（`IDEXAL_DESKTOP_APPLICATION_NAME` / `_USER_DATA_DIR` / `_HOME_DIR` /
`IDEXAL_DISABLE_FIXED_REMOTE_DEBUGGING_PORT`）只隔离 userData、应用名与调试端口，
**不隔离构建产物目录**。因此只要用户实例还开着，桌面侧的实跑验证就无法安全进行。

受影响的未测面：

| 界面                                    | 发布   | 状态                                           |
| --------------------------------------- | ------ | ---------------------------------------------- |
| 应用外壳（侧栏/标题栏/任务列表/输入框） | 3.16.1 | 已实跑：`dir=rtl`、可见英文残留 0、几何已镜像  |
| 设置页（导航 + 通用 + 外观）            | 3.16.2 | **未实跑**，仅静态门禁与字符串校验             |
| @ 引用面板 / 错误横幅 / 上下文用量弹层  | 3.16.3 | **未实跑**；且这些是弹层与下拉，RTL 下从未量过 |

要放开验证，前提是要么关闭开发实例，要么把桌面构建产物目录参数化，让 QA 实例写到别处。
`SettingsPage` 也只在桌面渲染进程挂载，`packages/web` 不引用它，所以没有浏览器侧的等价界面可替代。

## RTL 镜像：已实测的部分与待复核的部分

`dir="rtl"` 与 `lang` 已正确作用到 `documentElement`。对同一视口分别以 `en-US` 与 `ar`
**实测几何**（隔离实例，`getBoundingClientRect` 逐元素比对）后，应用外壳已正确镜像：

| 元素     | 实测结果                                       |
| -------- | ---------------------------------------------- |
| 侧栏     | `x = 936..1200`，即从右端起，而非 LTR 的左端   |
| 发送按钮 | 落到输入区左侧                                 |
| 越界计数 | 1 处，且是设计上就停在画布外的抽屉面板，非缺陷 |

Tailwind 的物理工具类（`ml-/mr-/pl-/pr-/left-/right-/translate-x-/text-left/text-right/rounded-l/r/border-l/r/space-x-`）
确实不认 `dir`。逐类**实测计数**（`packages/ui/src`，1494 个 ts/tsx 文件）：

| 类别                   | 出现次数  | 涉及文件 |
| ---------------------- | --------- | -------- |
| `pl-N` / `pr-N`        | 130 / 139 | 82 / 90  |
| `text-left` / `-right` | 152 / 35  | 105 / 12 |
| `left-N` / `right-N`   | 77 / 82   | 56 / 56  |
| `ml-N` / `mr-N`        | 44 / 32   | 38 / 21  |
| `translate-x-`         | 30        | 19       |
| `rounded-l/r-N`        | 13        | 6        |
| `border-l/r-`          | 7         | 5        |
| `space-x-`             | 2         | 2        |
| **合计**               | **743**   | **250**  |

对照之下，**已经使用逻辑属性的地方是 0**：`ms-/me-/ps-/pe-` = 0，
`rounded-s/e-` = 0，`border-s/e-` = 0，`inset-inline` = 0。
`text-start` 只有 1 处且在代码注释里；`start-N/end-N` 的 30 处命中经逐条核对
**全是 `col-start-*` / `row-start-*` 栅格线名**，与书写方向无关——这两个数字如果直接引用
就会把"零迁移"错报成"已开始迁移"。

这条事实的含义只是"这些不会自动镜像"，**不等于"这些是错的"**：外壳的实测结果表明大量物理类
要么出现在左右对称的布局里，要么其容器本身已被 flex/grid 的 `dir` 翻转。

因此这里的准确状态是**未逐组件复核**，而不是"已知存在镜像缺陷"。
把它们改为逻辑属性仍是独立的工程，需要逐组件验收，不能与语言集变更混在同一次发布里声称完成。

## 验收场景

| 场景                               | 期望                                                               |
| ---------------------------------- | ------------------------------------------------------------------ |
| 切到阿拉伯语                       | `documentElement.dir === "rtl"`、`lang === "ar"`，界面显示阿语文案 |
| 切到法语                           | `dir === "ltr"`、`lang === "fr"`，界面显示法语文案                 |
| 阿语态下的常驻外壳                 | 侧栏/标题栏/任务列表/输入框可见文案无英文残留                      |
| `ar` 与 `fr` 的键名列表            | `diff` 后完全一致，覆盖不对称视为缺陷                              |
| 任一语言下查找未翻译键             | 显示英文原文，**不出现 `login.foo.bar` 这类 key**                  |
| 老用户 `setting.json` 为 `zh-CN`   | 设置解析成功、仍为中文，不丢配置                                   |
| 新装用户（系统语言为阿/法）        | 直接以该语言启动                                                   |
| 新装用户（系统语言未覆盖，如德语） | 回退英文                                                           |
