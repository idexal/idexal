import {
  ProviderConfigService,
  type ProviderConfigLayerSnapshot,
  type ProviderConfigLayerUpdate,
} from "@idexal/provider";
import { NodeIdexalBuiltinProviderConfigSource } from "./idexal-builtin-provider-config-source.js";
import {
  EndpointScopedIdexalBuiltinSource,
  type EndpointScopedIdexalBuiltinSourceOptions,
} from "./endpoint-scoped-idexal-builtin-source.js";
import {
  IdexalBuiltinRemoteSynchronizer,
  type IdexalBuiltinRemoteSynchronizerOptions,
  type IdexalBuiltinRefreshResult,
} from "./idexal-builtin-remote-synchronizer.js";
import {
  NodePersonalProviderConfigRepository,
  type PersonalProviderConfigRecoveryEvent,
} from "./personal-provider-config-repository.js";

export interface NodeProviderConfigRuntimeOptions {
  readonly idexalBuiltinFilePath: string;
  readonly idexalBuiltinActiveFilePath?: string;
  readonly idexalBuiltinRemote?: Omit<IdexalBuiltinRemoteSynchronizerOptions, "source">;
  readonly idexalBuiltinEnvironment?: Omit<
    EndpointScopedIdexalBuiltinSourceOptions,
    "bundledFilePath"
  >;
  readonly onIdexalBuiltinRefreshError?: (error: unknown) => void;
  readonly onPersonalConfigRecovery?: (event: PersonalProviderConfigRecoveryEvent) => void;
  readonly onPersonalConfigPollingError?: (error: unknown) => void;
  readonly personalFilePath: string;
  readonly personalPollingIntervalMs?: number | false;
  readonly importLegacy?: (
    idexalBuiltin: ProviderConfigLayerSnapshot,
  ) => Promise<ProviderConfigLayerUpdate | null>;
  readonly watch?: boolean;
}

/** 组装一个 Node.js 进程内共享的 Idexal Built-in/Personal Config 运行边界。 */
export class NodeProviderConfigRuntime {
  readonly configService: ProviderConfigService;
  readonly #idexalBuiltinSource:
    | NodeIdexalBuiltinProviderConfigSource
    | EndpointScopedIdexalBuiltinSource;
  readonly #personalRepository: NodePersonalProviderConfigRepository;
  readonly #remoteSynchronizer?: IdexalBuiltinRemoteSynchronizer;
  readonly #onRemoteRefreshError?: (error: unknown) => void;
  #startPromise: Promise<void> | null = null;
  #disposed = false;
  readonly #checkListeners = new Set<() => Promise<void>>();
  #checkTimer: ReturnType<typeof setInterval> | null = null;
  #checkInFlight: Promise<void> | null = null;

  constructor(options: NodeProviderConfigRuntimeOptions) {
    this.#idexalBuiltinSource = options.idexalBuiltinEnvironment
      ? new EndpointScopedIdexalBuiltinSource({
          bundledFilePath: options.idexalBuiltinFilePath,
          ...options.idexalBuiltinEnvironment,
        })
      : new NodeIdexalBuiltinProviderConfigSource({
          bundledFilePath: options.idexalBuiltinFilePath,
          activeFilePath: options.idexalBuiltinActiveFilePath,
          watch: options.watch,
        });
    this.#remoteSynchronizer =
      options.idexalBuiltinRemote &&
      this.#idexalBuiltinSource instanceof NodeIdexalBuiltinProviderConfigSource
        ? new IdexalBuiltinRemoteSynchronizer({
            source: this.#idexalBuiltinSource,
            ...options.idexalBuiltinRemote,
          })
        : undefined;
    this.#onRemoteRefreshError = options.onIdexalBuiltinRefreshError;
    this.#personalRepository = new NodePersonalProviderConfigRepository({
      filePath: options.personalFilePath,
      onRecovery: options.onPersonalConfigRecovery,
      onPollingError: options.onPersonalConfigPollingError,
      pollingIntervalMs: options.personalPollingIntervalMs,
      ...(options.importLegacy
        ? {
            importLegacy: async () => options.importLegacy!(await this.#idexalBuiltinSource.read()),
          }
        : {}),
    });
    this.configService = new ProviderConfigService({
      idexalBuiltinSource: this.#idexalBuiltinSource,
      personalRepository: this.#personalRepository,
    });
  }

  resolveIdexalBuiltinActiveFilePath(): Promise<string> {
    return this.#idexalBuiltinSource instanceof NodeIdexalBuiltinProviderConfigSource
      ? Promise.resolve(this.#idexalBuiltinSource.activeFilePath)
      : this.#idexalBuiltinSource.resolveActiveFilePath();
  }

  get personalRepository(): import("@idexal/provider").PersonalProviderConfigRepository {
    return this.#personalRepository;
  }

  /** Environment 同一周期检查中恢复未对齐依赖，不被下载 TTL 或失败挡住。 */
  onDidCheckIdexalBuiltin(listener: () => Promise<void>): () => void {
    this.#checkListeners.add(listener);
    return () => this.#checkListeners.delete(listener);
  }

  start(): Promise<void> {
    if (this.#disposed) throw new Error("NodeProviderConfigRuntime 已 dispose");
    if (this.#startPromise) return this.#startPromise;
    const startPromise = this.configService.read().then(() => {
      if (this.#disposed) return;
      void this.#checkBackground();
      // Managed Worker 无下载配置也无恢复 owner，不建立周期任务。
      if (
        this.#remoteSynchronizer ||
        this.#idexalBuiltinSource instanceof EndpointScopedIdexalBuiltinSource ||
        this.#checkListeners.size > 0
      ) {
        this.#checkTimer = setInterval(() => {
          void this.#checkBackground();
        }, 60_000);
        this.#checkTimer.unref?.();
      }
    });
    this.#startPromise = startPromise;
    void startPromise.catch(() => {
      if (this.#startPromise === startPromise) this.#startPromise = null;
    });
    return startPromise;
  }

  refreshIdexalBuiltin(options?: {
    readonly force?: boolean;
  }): Promise<IdexalBuiltinRefreshResult> {
    if (this.#disposed) return Promise.resolve("disposed");
    if (this.#idexalBuiltinSource instanceof EndpointScopedIdexalBuiltinSource) {
      return this.#idexalBuiltinSource.refresh(options);
    }
    return this.#remoteSynchronizer?.refresh(options) ?? Promise.resolve("skipped");
  }

  #checkBackground(): Promise<void> {
    if (this.#disposed) return Promise.resolve();
    if (this.#checkInFlight) return this.#checkInFlight;
    const check = Promise.allSettled([
      this.refreshIdexalBuiltin(),
      ...[...this.#checkListeners].map((listener) => Promise.resolve().then(listener)),
    ])
      .then((results) => {
        if (this.#disposed) return;
        for (const result of results)
          if (result.status === "rejected") this.#onRemoteRefreshError?.(result.reason);
      })
      .finally(() => {
        if (this.#checkInFlight === check) this.#checkInFlight = null;
      });
    this.#checkInFlight = check;
    return check;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#checkTimer) clearInterval(this.#checkTimer);
    this.#checkTimer = null;
    this.#checkListeners.clear();
    this.#remoteSynchronizer?.dispose();
    this.configService.dispose();
    this.#personalRepository.dispose();
    this.#idexalBuiltinSource.dispose();
  }
}

export function createNodeProviderConfigRuntime(
  options: NodeProviderConfigRuntimeOptions,
): NodeProviderConfigRuntime {
  return new NodeProviderConfigRuntime(options);
}
