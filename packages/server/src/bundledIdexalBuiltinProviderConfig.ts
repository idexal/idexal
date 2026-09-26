import { materializeIdexalBuiltinProviderConfig } from "@idexal/services/node";

declare const __IDEXAL_BUILTIN_PROVIDER_CONFIG_JSON__: string | undefined;

interface MaterializeBundledIdexalBuiltinProviderConfigOptions {
  readonly environmentConfigRoot: string;
  readonly content: string;
}

/** 返回构建时嵌入远端 Server 的 Idexal Built-in Provider Config。 */
export function readBundledIdexalBuiltinProviderConfig(): string {
  if (typeof __IDEXAL_BUILTIN_PROVIDER_CONFIG_JSON__ !== "string") {
    throw new Error("当前构建未嵌入 Idexal Built-in Provider Config");
  }
  return __IDEXAL_BUILTIN_PROVIDER_CONFIG_JSON__;
}

/**
 * 将 Idexal Built-in Config 原子物化到所属环境的固定资源副本。
 * 升级前退出旧进程；不保留按内容 hash 增长的历史文件。
 */
export async function materializeBundledIdexalBuiltinProviderConfig(
  options: MaterializeBundledIdexalBuiltinProviderConfigOptions,
): Promise<string> {
  return materializeIdexalBuiltinProviderConfig(options);
}
