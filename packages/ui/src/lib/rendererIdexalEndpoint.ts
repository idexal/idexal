import {
  buildRuntimeIdexalEndpointUrls,
  IDEXAL_ENV,
  type RuntimeIdexalEndpointEnv,
} from "@idexal/shared";

interface RendererImportMetaEnv {
  VITE_IDEXAL_BASE_URL?: string;
  VITE_IDEXAL_ENDPOINT_ORIGIN?: string;
}

function readRendererImportMetaEnv(): RendererImportMetaEnv {
  return ((import.meta as ImportMeta & { env?: RendererImportMetaEnv }).env ??
    {}) as RendererImportMetaEnv;
}

function createRendererIdexalEndpointEnv(
  env: RendererImportMetaEnv = readRendererImportMetaEnv(),
): RuntimeIdexalEndpointEnv {
  return {
    IDEXAL_ENV,
    // UI 侧的 zcode-plan 占位 provider 以前只看 IDEXAL_ENV，
    // 没有消费 Vite 注入的 base url，导致自定义测试域名时 renderer 和 host/service 可能不一致。
    IDEXAL_BASE_URL: env.VITE_IDEXAL_BASE_URL,
    IDEXAL_ENDPOINT_ORIGIN: env.VITE_IDEXAL_ENDPOINT_ORIGIN,
  };
}

export const RENDERER_IDEXAL_ENDPOINT_URLS = buildRuntimeIdexalEndpointUrls(
  createRendererIdexalEndpointEnv(),
);
