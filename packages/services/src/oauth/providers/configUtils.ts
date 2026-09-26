import {
  IDEXAL_VERSION,
  buildRuntimeIdexalApiUrl,
  buildRuntimeIdexalEndpointUrls,
} from "@idexal/shared";

const DESKTOP_OAUTH_CALLBACK_URI = "idexal://oauth/callback";

export function readEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function readBoolean(env: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = readEnv(env, key);
  if (raw == null) {
    return fallback;
  }

  return raw !== "0" && raw.toLowerCase() !== "false";
}

export function buildIdexalApiUrlFromEnv(env: NodeJS.ProcessEnv, path: string): string {
  // OAuth provider 是运行时配置，必须跟随传入 env.IDEXAL_ENV；
  // 地址来自 .env 的通用变量，默认线上；登录与 token 交换必须使用同一配置来源。
  return buildRuntimeIdexalApiUrl(env, path);
}

export function buildDesktopOAuthRedirectUriFromEnv(env: NodeJS.ProcessEnv): string {
  const url = new URL("/app/oauth/login", buildRuntimeIdexalEndpointUrls(env).origin);
  url.searchParams.set("redirect", DESKTOP_OAUTH_CALLBACK_URI);
  // Website 需要按 App 版本决定是否关闭自动 deep link；缺少版本时必须兼容旧客户端行为。
  url.searchParams.set("app_version", IDEXAL_VERSION);
  return url.toString();
}
