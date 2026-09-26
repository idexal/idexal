// 由各 bundler 通过 define 注入，避免运行时 JSON import 的跨 bundler 兼容问题。
// 非构建环境（如 e2e 测试的 mocha）下 define 不存在，
// 用 typeof 检查 + fallback 避免 ReferenceError。
declare const __IDEXAL_VERSION__: string;
declare const __IDEXAL_COMMIT__: string;
declare const __IDEXAL_BUILD_TIME__: string;

export const IDEXAL_VERSION: string =
  typeof __IDEXAL_VERSION__ !== "undefined" ? __IDEXAL_VERSION__ : "0.0.0-dev";
export const IDEXAL_COMMIT: string =
  typeof __IDEXAL_COMMIT__ !== "undefined" ? __IDEXAL_COMMIT__ : "unknown";
export const IDEXAL_BUILD_TIME: string =
  typeof __IDEXAL_BUILD_TIME__ !== "undefined" ? __IDEXAL_BUILD_TIME__ : "unknown";
