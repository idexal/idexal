import type { UiLocale, SupportedLocale } from "@idexal/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { IdexalCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, IdexalCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, IdexalCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getIdexalCopy(locale?: UiLocale | string, detected?: string | null): IdexalCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
