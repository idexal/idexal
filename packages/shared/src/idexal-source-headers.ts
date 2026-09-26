import { DEFAULT_IDEXAL_ENDPOINT_ORIGIN } from "./idexalEndpoint.js";

export const IDEXAL_SOURCE_HEADERS = {
  "User-Agent": "Idexal/unknown",
  "HTTP-Referer": DEFAULT_IDEXAL_ENDPOINT_ORIGIN,
  "X-Title": "Z Code@electron",
} as const;

export interface BuildIdexalSourceHeadersFromContextOptions {
  appVersion?: string;
  arch?: string;
  clientLanguage?: string;
  clientTimezone?: string;
  deviceMid?: string;
  endpointOrigin?: string;
  osVersion?: string;
  platform?: string;
  releaseChannel?: string;
  sourceTitle?: string;
}

export function normalizeIdexalSourceHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\x20-\x7e]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function buildIdexalSourceHeadersFromContext(
  options: BuildIdexalSourceHeadersFromContextOptions = {},
): Record<string, string> {
  const appVersion = normalizeIdexalSourceHeaderValue(options.appVersion);
  const arch = normalizeIdexalSourceHeaderValue(options.arch);
  const clientLanguage = normalizeIdexalSourceHeaderValue(options.clientLanguage) ?? "unknown";
  const clientTimezone = normalizeIdexalSourceHeaderValue(options.clientTimezone) ?? "unknown";
  const deviceMid = normalizeIdexalSourceHeaderValue(options.deviceMid);
  const endpointOrigin =
    normalizeIdexalSourceHeaderValue(options.endpointOrigin) ?? DEFAULT_IDEXAL_ENDPOINT_ORIGIN;
  const osVersion = normalizeIdexalSourceHeaderValue(options.osVersion);
  const platform = normalizeIdexalSourceHeaderValue(options.platform);
  const releaseChannel = normalizeIdexalSourceHeaderValue(options.releaseChannel);
  const sourceTitle = normalizeIdexalSourceHeaderValue(options.sourceTitle) ?? "electron";

  return {
    ...IDEXAL_SOURCE_HEADERS,
    "HTTP-Referer": endpointOrigin,
    "User-Agent": `Idexal/${appVersion ?? "unknown"}`,
    ...(appVersion ? { "X-Idexal-App-Version": appVersion } : {}),
    "X-Title": `Z Code@${sourceTitle}`,
    ...(platform && arch ? { "X-Platform": `${platform}-${arch}` } : {}),
    ...(releaseChannel ? { "X-Release-Channel": releaseChannel } : {}),
    "X-Client-Language": clientLanguage,
    "X-Client-Timezone": clientTimezone,
    ...(platform ? { "X-Os-Category": normalizeOsCategory(platform) } : {}),
    ...(osVersion ? { "X-Os-Version": osVersion } : {}),
    ...(deviceMid ? { "X-Device-Mid": deviceMid } : {}),
  };
}

function normalizeOsCategory(platform: string): string {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}
