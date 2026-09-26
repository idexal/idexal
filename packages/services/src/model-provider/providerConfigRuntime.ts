import { join } from "node:path";
import {
  NodeProviderConfigRuntime,
  PERSONAL_PROVIDER_CONFIG_FILE_NAME,
  type PersonalProviderConfigRecoveryEvent,
  type NodeProviderConfigRuntimeOptions,
} from "@idexal/provider-node";
import type { ModelProviderConfig } from "./legacyModelProviderSerialized.js";
import { getAppConfigDir } from "../paths.js";
import { importLegacyPersonalProviderConfig } from "./legacyPersonalProviderConfigImporter.js";

export interface ProviderConfigRuntimeOptions {
  readonly idexalBuiltinFilePath: string;
  readonly idexalBuiltinActiveFilePath?: string;
  readonly idexalBuiltinRemote?: NodeProviderConfigRuntimeOptions["idexalBuiltinRemote"];
  readonly idexalBuiltinEnvironment?: NodeProviderConfigRuntimeOptions["idexalBuiltinEnvironment"];
  readonly onIdexalBuiltinRefreshError?: (error: unknown) => void;
  readonly onPersonalConfigRecovery?: (event: PersonalProviderConfigRecoveryEvent) => void;
  readonly onPersonalConfigPollingError?: (error: unknown) => void;
  readonly personalFilePath?: string;
  readonly personalPollingIntervalMs?: number | false;
  readonly readLegacyProviders?: () => Promise<readonly ModelProviderConfig[]>;
  readonly watch?: boolean;
}

/**
 * Services 装配层：提供 App 配置目录和已发布旧配置的一次性迁移入口。
 * 配置迁移保留 Idexal 用户的供应商数据，文件运行时由 @idexal/provider-node 唯一实现。
 */
export class ProviderConfigRuntime {
  readonly configService: NodeProviderConfigRuntime["configService"];
  readonly #runtime: NodeProviderConfigRuntime;

  constructor(options: ProviderConfigRuntimeOptions) {
    const runtimeOptions: NodeProviderConfigRuntimeOptions = {
      idexalBuiltinFilePath: options.idexalBuiltinFilePath,
      idexalBuiltinActiveFilePath: options.idexalBuiltinActiveFilePath,
      idexalBuiltinRemote: options.idexalBuiltinRemote,
      idexalBuiltinEnvironment: options.idexalBuiltinEnvironment,
      onIdexalBuiltinRefreshError: options.onIdexalBuiltinRefreshError,
      onPersonalConfigRecovery: options.onPersonalConfigRecovery,
      onPersonalConfigPollingError: options.onPersonalConfigPollingError,
      personalFilePath:
        options.personalFilePath ?? join(getAppConfigDir(), PERSONAL_PROVIDER_CONFIG_FILE_NAME),
      personalPollingIntervalMs: options.personalPollingIntervalMs,
      watch: options.watch,
      ...(options.readLegacyProviders
        ? {
            importLegacy: async () =>
              importLegacyPersonalProviderConfig({
                legacyProviders: await options.readLegacyProviders!(),
              }),
          }
        : {}),
    };
    this.#runtime = new NodeProviderConfigRuntime(runtimeOptions);
    this.configService = this.#runtime.configService;
  }

  start(): Promise<void> {
    return this.#runtime.start();
  }

  get personalRepository(): NodeProviderConfigRuntime["personalRepository"] {
    return this.#runtime.personalRepository;
  }

  resolveIdexalBuiltinActiveFilePath(): Promise<string> {
    return this.#runtime.resolveIdexalBuiltinActiveFilePath();
  }

  refreshIdexalBuiltin(options?: { readonly force?: boolean }) {
    return this.#runtime.refreshIdexalBuiltin(options);
  }

  onDidCheckIdexalBuiltin(listener: () => Promise<void>): () => void {
    return this.#runtime.onDidCheckIdexalBuiltin(listener);
  }

  dispose(): void {
    this.#runtime.dispose();
  }
}

export function createProviderConfigRuntime(
  options: ProviderConfigRuntimeOptions,
): ProviderConfigRuntime {
  return new ProviderConfigRuntime(options);
}
