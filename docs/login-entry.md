# 登录入口（WelcomeScreen）

唯一实现：`packages/ui/src/WelcomeScreen.tsx`，由 `packages/ui/src/Root.tsx` 以全屏面板挂载（不再是模态弹窗）。

## 产品规则

1. Idexal 登录入口**不提供账号 OAuth 连接**。上游的 `Connect to Z.ai` / `Connect to BigModel` 两个入口已下线，不保留隐藏入口或开关。
2. 当前唯一可用路径是 **API key**：用户使用自己的密钥，走已内置的多家模型供应商。
3. 订阅能力以**禁用占位按钮**呈现，文案 `Subscriptions coming soon`，无链接、无点击行为。等订阅平台 web 门户就绪后，再把这个按钮接到真实入口。
4. OAuth 状态机（waiting / error / retry / cancel）**继续保留**：`loginEntryRequest` 仍会从设置页等入口发起指定 provider 的授权流程，登录入口负责统一展示等待、失败和取消。删除按钮不等于删除这条链路。

## 状态所有者

| 状态                                   | 所有者                                 |
| -------------------------------------- | -------------------------------------- |
| 展示哪条登录路径（providers / apiKey） | `LoginPanel` 局部 `loginMode`          |
| OAuth 流程状态                         | `useOAuth` hook                        |
| 用户身份、OAuth 错误与成功信号         | `useIdexalStore`（Zustand）            |
| 订阅可用性                             | 尚无所有者；占位按钮不读取任何远端事实 |

## 文案与国际化

- 应用只有两种语言：`zh-CN`、`en-US`（`packages/shared/src/protocol.ts` 的 `Locale`）。
- `createIntl` 对缺失 key 回退成 key 本身，**没有编译期校验**，因此新增文案必须同时写进两份 locale 文件。
- 占位按钮文案：`login.subscription.comingSoon`。

## 验收场景

| 场景                     | 期望                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| 未登录打开应用           | 面板只有两行：禁用按钮 `Subscriptions coming soon` + `Use API key` |
| 切换语言中/英            | 占位按钮文案随应用语言切换，不出现 key 字面量                      |
| 点击占位按钮             | 无任何反应，不打开浏览器、不发请求、不进入 loading                 |
| 点击 `Use API key`       | 进入 API key 表单，可取消回到该面板                                |
| 设置页发起 provider 连接 | 仍进入等待态，可取消；失败态可重试                                 |
