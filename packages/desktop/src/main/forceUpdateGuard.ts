import {
  DEFAULT_IDEXAL_ENDPOINT_ORIGIN,
  FALLBACK_LOCALE,
  IDEXAL_VERSION,
  buildIdexalEndpointUrls,
  getForceUpdateMinimalVersionFromConfig,
  resolveForceUpdateRequirement,
  type ForceUpdateRequirement,
  type Locale,
} from "@idexal/shared";
import { requestForceAutoUpdate, type ForceAutoUpdateState } from "./autoUpdater.js";
import { showForceUpdatePrompt } from "./forceUpdatePrompt.js";

const IDEXAL_CLIENT_CONFIG_API_PATH = "/api/v1/client/configs";
const FORCE_UPDATE_CONFIG_REQUEST_TIMEOUT_MS = 10_000;
const FORCE_UPDATE_CONFIG_MAX_RESPONSE_BYTES = 1024 * 1024;

export interface ForceUpdateDialogText {
  title: string;
  message: string;
  detail: string;
  autoUpdateButton: string;
  manualUpdateButton: string;
  quitButton: string;
}

export interface ForceUpdateGuardLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

interface ForceUpdateGuardResult {
  blocked: boolean;
  requirement?: ForceUpdateRequirement;
}

interface ForceUpdateGuardOptions {
  locale: Locale;
  logger: ForceUpdateGuardLogger;
  endpointOrigin?: string;
  fetchRemoteConfig?: () => Promise<unknown>;
  requestAutoUpdate?: (
    onStateChange?: (state: ForceAutoUpdateState) => void,
  ) => (() => void) | void;
  onBlocked?: (requirement: ForceUpdateRequirement) => void;
}

function resolveForceUpdateClientConfigUrl(
  endpointOrigin = DEFAULT_IDEXAL_ENDPOINT_ORIGIN,
): string {
  const url = new URL(
    `${buildIdexalEndpointUrls(endpointOrigin).origin}${IDEXAL_CLIENT_CONFIG_API_PATH}`,
  );
  url.searchParams.set("app_version", IDEXAL_VERSION);
  url.searchParams.set("platform", `${process.platform}-${process.arch}`);
  return url.toString();
}

function getForceUpdateMinimalVersionFromClientConfig(config: unknown): string | undefined {
  if (typeof config !== "object" || config === null) {
    return undefined;
  }

  const envelope = config as {
    code?: unknown;
    data?: {
      configs?: unknown;
    };
  };
  if (typeof envelope.code === "number" && envelope.code !== 0) {
    // /client/configs 与服务层一样只有 code=0 才可信，避免错误 envelope 携带旧 data 时误触发启动强更。
    throw new Error(`Idexal client config failed: ${envelope.code}`);
  }
  return getForceUpdateMinimalVersionFromConfig(envelope.data?.configs);
}

async function fetchRemoteForceUpdateConfig(
  endpointOrigin?: string,
  fetchRemoteConfig?: () => Promise<unknown>,
): Promise<unknown> {
  if (fetchRemoteConfig) {
    return fetchRemoteConfig();
  }

  const { net } = await import("electron");
  return new Promise<unknown>((resolve, reject) => {
    let request: ReturnType<typeof net.request>;
    let timer: ReturnType<typeof setTimeout>;
    let data = "";
    let receivedBytes = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      request?.abort();
      reject(error);
    };

    const finish = (value: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    timer = setTimeout(() => {
      fail(new Error("force update config request timeout"));
    }, FORCE_UPDATE_CONFIG_REQUEST_TIMEOUT_MS);
    timer.unref?.();

    request = net.request(resolveForceUpdateClientConfigUrl(endpointOrigin));
    request.on("response", (response) => {
      const statusCode = response.statusCode ?? 0;
      if (statusCode < 200 || statusCode >= 300) {
        // 启动前强更 gate 不能把 4xx/5xx/HTML 错页当正常配置解析，统一走离线降级路径。
        fail(new Error(`force update config request failed with status ${statusCode}`));
        return;
      }

      response.on("data", (chunk) => {
        receivedBytes += Buffer.byteLength(chunk);
        if (receivedBytes > FORCE_UPDATE_CONFIG_MAX_RESPONSE_BYTES) {
          // 远端配置在主窗口创建前读取，必须限制响应体，避免异常响应撑爆 main 进程内存。
          fail(new Error("force update config response too large"));
          return;
        }
        data += chunk.toString();
      });
      response.on("end", () => {
        try {
          finish(JSON.parse(data));
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      });
      response.on("error", (error) => {
        fail(error instanceof Error ? error : new Error(String(error)));
      });
    });
    request.on("error", (error) => {
      fail(error instanceof Error ? error : new Error(String(error)));
    });
    request.end();
  });
}

async function resolveDesktopForceUpdateRequirement(options: {
  logger: ForceUpdateGuardLogger;
  endpointOrigin?: string;
  fetchRemoteConfig?: () => Promise<unknown>;
}): Promise<ForceUpdateRequirement | null> {
  const resolveFromConfig = (config: unknown) =>
    resolveForceUpdateRequirement({
      currentVersion: IDEXAL_VERSION,
      forceUpdate: {
        minimalVersion:
          getForceUpdateMinimalVersionFromClientConfig(config) ??
          getForceUpdateMinimalVersionFromConfig(config) ??
          "",
      },
    });

  try {
    const remoteConfig = await fetchRemoteForceUpdateConfig(
      options.endpointOrigin,
      options.fetchRemoteConfig,
    );
    const remoteRequirement = resolveFromConfig(remoteConfig);
    if (remoteRequirement) {
      return remoteRequirement;
    }
  } catch (error) {
    // 预留离线跳过接口：完全离线时先不拉闸，后续可在这里接入显式 offline bypass 策略。
    options.logger.warn("[force-update] 读取远端强制升级配置失败，跳过强制升级校验", { error });
    return null;
  }

  return null;
}

function resolveForceUpdateDownloadUrl(
  locale: Locale,
  endpointOrigin = DEFAULT_IDEXAL_ENDPOINT_ORIGIN,
): string {
  const origin = buildIdexalEndpointUrls(endpointOrigin).origin;
  return locale === "zh-CN" ? `${origin}/cn` : `${origin}/en`;
}

const FORCE_UPDATE_DIALOG_TEXT: Record<
  Locale,
  (requirement: ForceUpdateRequirement) => ForceUpdateDialogText
> = {
  "zh-CN": (requirement) => ({
    title: "需要升级 Idexal",
    message: "当前版本无法继续使用",
    detail: `当前版本：v${requirement.currentVersion}\n最低可用版本：v${requirement.minimalVersion}`,
    autoUpdateButton: "自动升级",
    manualUpdateButton: "手动升级",
    quitButton: "退出",
  }),
  "en-US": (requirement) => ({
    title: "Update Idexal",
    message: "The current version can no longer be used",
    detail: `Current version: v${requirement.currentVersion}\nMinimum supported version: v${requirement.minimalVersion}`,
    autoUpdateButton: "Auto update",
    manualUpdateButton: "Manual update",
    quitButton: "Quit",
  }),
  ar: (requirement) => ({
    title: "يجب تحديث Idexal",
    message: "لا يمكن استخدام الإصدار الحالي",
    detail: `الإصدار الحالي: v${requirement.currentVersion}\nأقل إصدار قابل للاستخدام: v${requirement.minimalVersion}`,
    autoUpdateButton: "تحديث تلقائي",
    manualUpdateButton: "تحديث يدوي",
    quitButton: "إنهاء",
  }),
  fr: (requirement) => ({
    title: "Mettre à jour Idexal",
    message: "La version actuelle ne peut plus être utilisée",
    detail: `Version actuelle : v${requirement.currentVersion}\nVersion minimale requise : v${requirement.minimalVersion}`,
    autoUpdateButton: "Mise à jour auto",
    manualUpdateButton: "Mise à jour manuelle",
    quitButton: "Quitter",
  }),
};

function formatForceUpdateDialogText(
  requirement: ForceUpdateRequirement,
  locale: Locale,
): ForceUpdateDialogText {
  const build = FORCE_UPDATE_DIALOG_TEXT[locale] ?? FORCE_UPDATE_DIALOG_TEXT[FALLBACK_LOCALE];
  return build(requirement);
}

export async function maybeBlockStartupForForceUpdate(
  options: ForceUpdateGuardOptions,
): Promise<ForceUpdateGuardResult> {
  const requirement = await resolveDesktopForceUpdateRequirement({
    ...options,
    endpointOrigin: options.endpointOrigin,
  });
  if (!requirement) {
    return { blocked: false };
  }

  options.logger.warn("[force-update] 远端配置要求强制升级，阻止创建主窗口", requirement);
  options.onBlocked?.(requirement);
  const { app, shell } = await import("electron");
  const action = await showForceUpdatePrompt(
    formatForceUpdateDialogText(requirement, options.locale),
    options.locale,
    options.logger,
    {
      startAutoUpdate: (onStateChange) =>
        options.requestAutoUpdate?.(onStateChange) ??
        requestForceAutoUpdate(onStateChange, "force-update", requirement.minimalVersion),
    },
  );
  if (action === "auto") {
    return { blocked: true, requirement };
  }

  if (action === "manual") {
    const url = resolveForceUpdateDownloadUrl(options.locale, options.endpointOrigin);
    options.logger.info(`[force-update] 用户选择手动升级：${url}`);
    await shell.openExternal(url);
  }

  // 强制升级命中后不能进入主界面；非自动升级路径处理完弹窗后退出，避免露出旧客户端功能。
  app.quit();
  return { blocked: true, requirement };
}
