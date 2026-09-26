import {
  DEFAULT_IDEXAL_ENDPOINT_ORIGIN,
  IDEXAL_VERSION,
  buildHelpAppConfigUrl,
  createHelpAppConfigReader,
  resolveHelpAppConfig,
  type Locale,
} from "@idexal/shared";
import localDefaultAppConfig from "../../../config/default.json" with { type: "json" };

interface ResolveWebCommunityUrlOptions {
  fetchImpl?: typeof fetch;
  localConfig?: unknown;
  endpointOrigin?: string;
}

const readHelpConfig = createHelpAppConfigReader({
  fetchImpl: (input, init) => fetch(input, init),
});

export async function resolveWebHelpConfig(options: ResolveWebCommunityUrlOptions = {}) {
  const env = import.meta.env;
  const endpoint =
    options.endpointOrigin ??
    (env?.VITE_IDEXAL_BASE_URL?.trim() ||
      env?.VITE_IDEXAL_ENDPOINT_ORIGIN?.trim() ||
      DEFAULT_IDEXAL_ENDPOINT_ORIGIN);
  // 服务端拒绝 platform=web；浏览器省略可选平台参数，避免伪装桌面系统。
  const url = buildHelpAppConfigUrl(endpoint, IDEXAL_VERSION);
  let remote: unknown;
  try {
    remote = await (
      options.fetchImpl
        ? createHelpAppConfigReader({ fetchImpl: options.fetchImpl })
        : readHelpConfig
    )(url);
  } catch {
    // 远端不可用时保留内置入口，不使用旧 CDN 作为第二个远端配置源。
  }
  return resolveHelpAppConfig(remote, options.localConfig ?? localDefaultAppConfig);
}

export async function resolveWebCommunityUrl(
  locale: Locale,
  options: ResolveWebCommunityUrlOptions = {},
): Promise<string | undefined> {
  // community_urls 的外部契约目前只有 zh-CN / en-US 两个入口，阿语和法语没有独立社群，
  // 因此降级到英文入口，而不是返回 undefined 让社群按钮消失。
  const urls = (await resolveWebHelpConfig(options)).community_urls;
  return urls?.[locale === "zh-CN" ? "zh-CN" : "en-US"];
}
