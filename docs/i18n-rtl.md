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

## 已知未完成：RTL 的组件级镜像

`dir="rtl"` 与 `lang` 已正确作用到 `documentElement`，**文本流、输入光标与 bidi 排版随 RTL 生效**。
但 Tailwind 的物理工具类不认 `dir`：`packages/ui/src` 内实测有 **≥400 处**
`ml-/mr-/pl-/pr-/left-/right-/translate-x-/text-left/text-right/rounded-l/rounded-r/border-l/border-r/space-x-`
分布在 **197 个文件**。这些不会自动镜像，因此当前状态是"阿拉伯语可读、方向正确，
但部分组件的内外边距与绝对定位仍按 LTR 摆放"。

把它们改为逻辑属性（`ms-/me-/ps-/pe-/start-/end-/text-start/text-end`）是独立的一次工程，
需要逐组件验收，不能与语言集变更混在同一次发布里声称完成。

## 验收场景

| 场景                               | 期望                                                               |
| ---------------------------------- | ------------------------------------------------------------------ |
| 切到阿拉伯语                       | `documentElement.dir === "rtl"`、`lang === "ar"`，界面显示阿语文案 |
| 切到法语                           | `dir === "ltr"`、`lang === "fr"`，界面显示法语文案                 |
| 任一语言下查找未翻译键             | 显示英文原文，**不出现 `login.foo.bar` 这类 key**                  |
| 老用户 `setting.json` 为 `zh-CN`   | 设置解析成功、仍为中文，不丢配置                                   |
| 新装用户（系统语言为阿/法）        | 直接以该语言启动                                                   |
| 新装用户（系统语言未覆盖，如德语） | 回退英文                                                           |
