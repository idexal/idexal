import {
  createCodingPlanApiKeyResolver,
  createSharedIdexalCredentialStore,
  createCliOAuthClient,
  createCliOAuthPollToken,
  openUrlInBrowser,
  SHARED_IDEXAL_CREDENTIAL_KEYS,
  type BrowserOpenResult,
  type SharedIdexalCredentialStore,
  type CliOAuthClient,
  type CliOAuthInitData,
  type CliOAuthPollData,
  type CliOAuthUser,
} from "@idexal/adapters";
import { createConfig } from "@idexal/adapters/config";
import { createNodeHttpClientAdapter } from "@idexal/adapters/http";
import type { EnvRecord } from "@idexal/adapters/model";
import { buildIdexalEndpointUrls, resolveRuntimeIdexalEndpointOrigin } from "@idexal/shared";
import {
  NodeModelSelectionConfigRepository,
  NodePersonalProviderConfigRepository,
  PERSONAL_PROVIDER_CONFIG_FILE_NAME,
  IDEXAL_PERSONAL_PROVIDER_CONFIG_FILE_ENV,
} from "@idexal/provider-node";
import { readLegacyCliPersonalProviderConfig } from "./app/legacy-cli-personal-provider-config-importer.js";
import { dirname, join } from "node:path";
import {
  createStandaloneAccountIdentityFromSecret,
  hasStandaloneCodingPlanAccess,
  readStandaloneCodingPlanProviders,
  resolveStandaloneCodingPlanProvider,
  standaloneAccountIdentityCredentialKey,
  standaloneAccountProviderCredentialKey,
} from "./app/standalone-account-provider-runtime.js";
import { throwIfAborted, waitWithAbort } from "./auth-login-abort.js";
import { setTimeout as delay } from "node:timers/promises";
import { pollUntilReady } from "./auth-login-polling.js";

const DEFAULT_LOGIN_TIMEOUT_MS = 5 * 60 * 1_000;

export type CodingPlanProviderId = "bigmodel" | "zai";

export interface LoginIdexalCliOptions {
  providerId?: CodingPlanProviderId;
  abortSignal?: AbortSignal;
  apiKeyResolver?: ReturnType<typeof createCodingPlanApiKeyResolver>;
  baseUrl?: string;
  credentialStore?: SharedIdexalCredentialStore;
  env?: EnvRecord;
  httpClient?: Parameters<typeof createCliOAuthClient>[0]["httpClient"];
  noBrowser?: boolean;
  now?: () => number;
  onAuthorizeUrl?: (data: CliOAuthInitData) => void | Promise<void>;
  onBrowserOpen?: (result: BrowserOpenResult) => void | Promise<void>;
  onPollStatus?: (data: CliOAuthPollData) => void | Promise<void>;
  openBrowser?: (url: string) => Promise<BrowserOpenResult>;
  pollToken?: string;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  personalProviderConfigPath?: string;
}

export interface LoginIdexalCliResult {
  browser?: BrowserOpenResult;
  configPath: string;
  credentialsPath: string;
  model: string;
  providerId: CodingPlanProviderId;
  user: CliOAuthUser;
}

export type LoginBigmodelCodingPlanOptions = Omit<LoginIdexalCliOptions, "providerId">;
export type LoginBigmodelCodingPlanResult = LoginIdexalCliResult & { providerId: "bigmodel" };

export interface ConfigureCodingPlanApiKeyOptions {
  apiKey: string;
  credentialStore?: SharedIdexalCredentialStore;
  env?: EnvRecord;
  personalProviderConfigPath?: string;
  providerId: CodingPlanProviderId;
}

export interface ConfigureCodingPlanApiKeyResult {
  configPath: string;
  model: string;
  providerId: CodingPlanProviderId;
}

export interface LogoutIdexalCliOptions {
  credentialStore?: SharedIdexalCredentialStore;
  env?: EnvRecord;
}

export interface LogoutIdexalCliResult {
  credentialsPath: string;
}

export async function hasConfiguredStandaloneCodingPlan(
  options: {
    credentialStore?: SharedIdexalCredentialStore;
    env?: EnvRecord;
  } = {},
): Promise<boolean> {
  const credentialStore =
    options.credentialStore ?? createSharedIdexalCredentialStore({ env: options.env });
  return hasStandaloneCodingPlanAccess(credentialStore, options.env ?? process.env);
}

export class IdexalCliLoginError extends Error {
  readonly code:
    | "auth_failed"
    | "auth_timeout"
    | "config_update_failed"
    | "credential_write_failed";

  constructor(
    code: IdexalCliLoginError["code"],
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, options);
    this.name = "IdexalCliLoginError";
    this.code = code;
  }
}

export async function loginIdexalCli(
  options: LoginIdexalCliOptions = {},
): Promise<LoginIdexalCliResult> {
  const env = options.env ?? process.env;
  const providerId = options.providerId ?? "zai";
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? DEFAULT_LOGIN_TIMEOUT_MS;
  const deadlineMs = now() + timeoutMs;
  const timeoutController = new AbortController();
  const signal = options.abortSignal
    ? AbortSignal.any([options.abortSignal, timeoutController.signal])
    : timeoutController.signal;
  const timeoutError = () =>
    new IdexalCliLoginError("auth_timeout", "Authorization timed out. Please retry login.");
  let timer = setTimeout(() => timeoutController.abort(timeoutError()), timeoutMs);
  try {
    throwIfAborted(signal);
    const pollToken = options.pollToken ?? createCliOAuthPollToken();
    const credentialStore = options.credentialStore ?? createSharedIdexalCredentialStore({ env });
    const oauthClient = createOAuthClient(options, env);
    const initData = await waitWithAbort(oauthClient.init({ pollToken }, { signal }), signal);
    const remainingMs = Math.min(deadlineMs, initData.expires_at * 1_000) - now();
    if (remainingMs <= 0) throw timeoutError();
    clearTimeout(timer);
    timer = setTimeout(() => timeoutController.abort(timeoutError()), remainingMs);
    await options.onAuthorizeUrl?.(initData);
    throwIfAborted(signal);
    const browser = options.noBrowser
      ? undefined
      : await waitWithAbort(
          (options.openBrowser ?? openUrlInBrowser)(initData.authorize_url),
          signal,
        );
    if (browser) await options.onBrowserOpen?.(browser);
    const readyData = await pollUntilReady({
      abortSignal: signal,
      initData,
      now,
      oauthClient,
      onPollStatus: options.onPollStatus,
      pollToken,
      sleep: options.sleep ?? ((ms) => delay(ms, undefined, { signal })),
      timeoutMs: Math.max(0, deadlineMs - now()),
      createError: (code) =>
        code === "auth_timeout"
          ? timeoutError()
          : new IdexalCliLoginError(code, "Authorization failed. Please retry login."),
    });
    const apiKey = await waitWithAbort(
      resolveCodingPlanApiKey({
        accessToken: readyData.accessToken,
        env,
        httpClient: options.httpClient,
        family: providerId,
        resolver: options.apiKeyResolver,
        signal,
      }),
      signal,
    );
    // A cancelled/expired attempt must not persist a late ready response or API key.
    throwIfAborted(signal);
    try {
      if (providerId === "zai") {
        await credentialStore.saveZaiLoginCredentials({
          accessToken: readyData.accessToken,
          jwtToken: readyData.token,
          user: readyData.user,
        });
      } else {
        await credentialStore.saveMany({
          [SHARED_IDEXAL_CREDENTIAL_KEYS.activeProvider]: providerId,
          [SHARED_IDEXAL_CREDENTIAL_KEYS.idexalJwtToken]: readyData.token,
          [SHARED_IDEXAL_CREDENTIAL_KEYS.bigmodelAccessToken]: readyData.accessToken,
          ...(readyData.refreshToken
            ? { [SHARED_IDEXAL_CREDENTIAL_KEYS.bigmodelRefreshToken]: readyData.refreshToken }
            : {}),
          [SHARED_IDEXAL_CREDENTIAL_KEYS.bigmodelUserInfo]: JSON.stringify({
            id: readyData.user.user_id,
            username: readyData.user.name || readyData.user.email || readyData.user.user_id,
            displayName: readyData.user.name || readyData.user.email || readyData.user.user_id,
            rawProfile: readyData.user,
          }),
        });
      }
    } catch (error) {
      throw new IdexalCliLoginError(
        "credential_write_failed",
        "Login succeeded but writing credentials failed.",
        { cause: error },
      );
    }
    throwIfAborted(signal);
    let configPatch: StandaloneCodingPlanPersistenceResult;
    try {
      configPatch = await persistStandaloneCodingPlanConnection({
        accountIdentity: readyData.user.user_id,
        apiKey,
        credentialStore,
        env,
        personalProviderConfigPath: options.personalProviderConfigPath,
        providerId,
      });
    } catch (error) {
      throw new IdexalCliLoginError(
        "config_update_failed",
        "Login succeeded but updating Idexal config failed.",
        { cause: error },
      );
    }
    return {
      ...(browser ? { browser } : {}),
      configPath: configPatch.path,
      credentialsPath: credentialStore.filePath,
      model: configPatch.mainModel,
      providerId,
      user: readyData.user,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function loginBigmodelCodingPlan(
  options: LoginBigmodelCodingPlanOptions = {},
): Promise<LoginBigmodelCodingPlanResult> {
  return {
    ...(await loginIdexalCli({ ...options, providerId: "bigmodel" })),
    providerId: "bigmodel",
  };
}

export async function configureCodingPlanApiKey(
  options: ConfigureCodingPlanApiKeyOptions,
): Promise<ConfigureCodingPlanApiKeyResult> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new IdexalCliLoginError("config_update_failed", "API key must not be empty.");
  }
  const credentialStore =
    options.credentialStore ?? createSharedIdexalCredentialStore({ env: options.env });
  const configPatch = await persistStandaloneCodingPlanConnection({
    accountIdentity: createStandaloneAccountIdentityFromSecret(apiKey),
    apiKey,
    credentialStore,
    env: options.env ?? process.env,
    personalProviderConfigPath: options.personalProviderConfigPath,
    providerId: options.providerId,
  });
  return {
    configPath: configPatch.path,
    model: configPatch.mainModel,
    providerId: options.providerId,
  };
}

export async function logoutIdexalCli(
  options: LogoutIdexalCliOptions = {},
): Promise<LogoutIdexalCliResult> {
  const credentialStore =
    options.credentialStore ?? createSharedIdexalCredentialStore({ env: options.env });
  const providerIds = (await readStandaloneCodingPlanProviders(options.env ?? process.env)).map(
    ({ providerId }) => providerId,
  );
  const identityKeys = providerIds.map(standaloneAccountIdentityCredentialKey);
  const identities = await credentialStore.loadMany(identityKeys);
  const dynamicApiKeyKeys = providerIds.flatMap((providerId) => {
    const identity = identities[standaloneAccountIdentityCredentialKey(providerId)]?.trim();
    return identity
      ? [
          standaloneAccountProviderCredentialKey({
            providerId,
            accountIdentity: identity,
          }),
        ]
      : [];
  });
  const keys = [
    ...Object.values(SHARED_IDEXAL_CREDENTIAL_KEYS),
    ...identityKeys,
    ...dynamicApiKeyKeys,
  ];
  const current = await credentialStore.loadMany(keys);
  await credentialStore.deleteIfValues(
    Object.fromEntries(
      Object.entries(current).flatMap(([key, value]) => (value === null ? [] : [[key, value]])),
    ),
  );
  return {
    credentialsPath: credentialStore.filePath,
  };
}

interface StandaloneCodingPlanPersistenceResult {
  readonly mainModel: string;
  readonly path: string;
}

async function persistStandaloneCodingPlanConnection(input: {
  readonly accountIdentity: string;
  readonly apiKey: string;
  readonly credentialStore: SharedIdexalCredentialStore;
  readonly env: EnvRecord;
  readonly personalProviderConfigPath?: string;
  readonly providerId: CodingPlanProviderId;
}): Promise<StandaloneCodingPlanPersistenceResult> {
  const configuredProvider = await resolveStandaloneCodingPlanProvider(input.providerId, input.env);
  const providerId = configuredProvider.providerId;
  const modelId = configuredProvider.modelId;
  const credentialKey = standaloneAccountProviderCredentialKey({
    providerId,
    accountIdentity: input.accountIdentity,
  });
  await input.credentialStore.saveMany({
    [standaloneAccountIdentityCredentialKey(providerId)]: input.accountIdentity,
    [credentialKey]: input.apiKey,
  });
  const path =
    input.personalProviderConfigPath ??
    input.env[IDEXAL_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim() ??
    join(dirname(input.credentialStore.filePath), PERSONAL_PROVIDER_CONFIG_FILE_NAME);
  // 登录与运行时共享文件和事务；首次写入仍先保留旧用户 Provider，不能仅写默认值。
  const personalRepository = new NodePersonalProviderConfigRepository({
    filePath: path,
    importLegacy: () => readLegacyCliPersonalProviderConfig({}),
    pollingIntervalMs: false,
  });
  const repository = new NodeModelSelectionConfigRepository({ personalRepository });
  try {
    await repository.saveConfiguredDefault({ providerId, modelId });
  } finally {
    repository.dispose();
    personalRepository.dispose();
  }
  return {
    mainModel: `${providerId}/${modelId}`,
    path,
  };
}

function createOAuthClient(options: LoginIdexalCliOptions, env: EnvRecord): CliOAuthClient {
  return createCliOAuthClient({
    baseUrl:
      options.baseUrl ?? buildIdexalEndpointUrls(resolveCliIdexalEndpointOrigin(env)).apiBaseUrl,
    providerId: options.providerId ?? "zai",
    httpClient: options.httpClient ?? createDefaultHttpClient(env),
  });
}

function resolveCliIdexalEndpointOrigin(env: EnvRecord): string {
  return resolveRuntimeIdexalEndpointOrigin(env);
}

function createDefaultHttpClient(env: EnvRecord) {
  const config = createConfig({ env });
  return createNodeHttpClientAdapter({
    env,
    proxyUrl: config.config.network.httpProxy,
    noProxy: config.config.network.noProxy,
    caCertFile: config.config.network.caCertFile,
    timeoutMs: config.config.network.timeout,
  });
}

async function resolveCodingPlanApiKey(input: {
  accessToken: string;
  env: EnvRecord;
  httpClient?: Parameters<typeof createCodingPlanApiKeyResolver>[0]["httpClient"];
  family: CodingPlanProviderId;
  resolver?: ReturnType<typeof createCodingPlanApiKeyResolver>;
  signal?: AbortSignal;
}): Promise<string> {
  const resolver =
    input.resolver ??
    createCodingPlanApiKeyResolver({
      httpClient: input.httpClient ?? createDefaultHttpClient(input.env),
    });
  return resolver.resolve(
    {
      accessToken: input.accessToken,
      family: input.family,
    },
    { signal: input.signal },
  );
}
