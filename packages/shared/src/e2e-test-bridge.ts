export interface E2ETestBridgeEnvironment {
  VITE_IDEXAL_E2E_STORE_BRIDGE?: string;
  IDEXAL_E2E_RUN_ID?: string;
}

/**
 * Main/preload 的 E2E 能力必须同时命中专用 build flag 和真实 runner run id。
 * IDEXAL_ENV=test 只是产品环境，不能据此扩大 renderer 可读面。
 */
export function shouldEnableE2ETestBridge(env: E2ETestBridgeEnvironment): boolean {
  return env.VITE_IDEXAL_E2E_STORE_BRIDGE === "1" && Boolean(env.IDEXAL_E2E_RUN_ID?.trim());
}
