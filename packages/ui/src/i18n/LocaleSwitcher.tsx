import { useCallback } from "react";
import type { Locale } from "@idexal/shared";
import { TID_LOCALE_TOGGLE } from "@idexal/shared";
import { useIdexalIntl } from "./IntlProvider.js";

/**
 * 切换器只提供产品当前支持的三种语言。
 * zh-CN 仍在 `Locale` 联合类型里，只为让已经落盘的 setting.json 继续解析成功；
 * 不再出现在这里，中文用户下次主动切换后就进入阿/英/法集合。
 */
const LOCALE_CYCLE: Locale[] = ["ar", "en-US", "fr"];

// 语言名一律用该语言自身的写法（ع / EN / FR），否则用户看不懂自己要切去哪。
const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "中",
  "en-US": "En",
  ar: "ع",
  fr: "Fr",
};

/**
 * 语言切换按钮 —— 点击循环切换语言
 */
export function LocaleSwitcher() {
  const { intl, locale, setLocale } = useIdexalIntl();

  const cycleLocale = useCallback(() => {
    const idx = LOCALE_CYCLE.indexOf(locale);
    const next = LOCALE_CYCLE[(idx + 1) % LOCALE_CYCLE.length] ?? LOCALE_CYCLE[0]!;
    setLocale(next);
  }, [locale, setLocale]);

  return (
    <button
      onClick={cycleLocale}
      data-testid={TID_LOCALE_TOGGLE}
      className="cursor-pointer rounded-lg bg-btn-alt-bg px-3 py-1 text-ui-base text-btn-alt-text transition hover:bg-surface-raised"
      title={intl.formatMessage({ id: "locale.switchLanguage" })}
    >
      {LOCALE_LABELS[locale]}
    </button>
  );
}
