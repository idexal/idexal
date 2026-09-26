export const IDEXAL_BUILTIN_PROVIDER_CONFIG_FILE_ENV = "IDEXAL_BUILTIN_PROVIDER_CONFIG_FILE";
export const IDEXAL_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV =
  "IDEXAL_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE";
export const IDEXAL_PERSONAL_PROVIDER_CONFIG_FILE_ENV = "IDEXAL_PERSONAL_PROVIDER_CONFIG_FILE";
export const PERSONAL_PROVIDER_CONFIG_FILE_NAME = "provider_config.json";

export interface NodeProviderRuntimePaths {
  readonly idexalBuiltinFilePath: string;
  readonly personalFilePath: string;
}

export function createNodeProviderRuntimePathEnv(
  paths: NodeProviderRuntimePaths,
): Record<string, string> {
  return {
    [IDEXAL_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: paths.idexalBuiltinFilePath,
    [IDEXAL_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: paths.personalFilePath,
  };
}

export function resolveNodeProviderRuntimePaths(
  env: Readonly<Record<string, string | undefined>>,
): NodeProviderRuntimePaths | null {
  const idexalBuiltinFilePath = env[IDEXAL_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
  const personalFilePath = env[IDEXAL_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
  if (!idexalBuiltinFilePath && !personalFilePath) return null;
  if (!idexalBuiltinFilePath || !personalFilePath) {
    throw new Error("Idexal Built-in 与 Personal Provider Config 路径必须同时提供");
  }
  return Object.freeze({ idexalBuiltinFilePath, personalFilePath });
}
