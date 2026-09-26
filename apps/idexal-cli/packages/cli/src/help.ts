import { getIdexalCopy, type SupportedLocale, type UiLocale } from "@idexal/i18n";

export function formatCliHelp(
  version: string,
  locale?: UiLocale,
  detectedLocale?: SupportedLocale,
): string {
  return getIdexalCopy(locale, detectedLocale).cli.help(version);
}
