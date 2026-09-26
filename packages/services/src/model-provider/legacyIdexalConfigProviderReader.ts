/* oxlint-disable eslint(max-lines) -- 已发布旧 Idexal config.json 的多版 Provider 结构读取集中在同一边界。 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  BUILTIN_MODEL_PROVIDER_IDS,
  resolveBigModelApiOrigin,
  resolveRuntimeIdexalEnv,
} from "@idexal/shared";
import {
  createModelProviderModelConfig,
  getDefaultModelSupportedFormatsFromApiFormat,
  getDefaultModelSupportedFormatsFromEndpoints,
  getDefaultModelProviderEndpointPathForKind,
  getModelProviderModelIds,
  isModelProviderModelConfig,
  legacyModelProviderListSchema,
  mapModelProviderSupportedFormatToKind,
  migrateLegacyModelProviderConfig,
  MODEL_PROVIDER_NEW_MODEL_CONTEXT_WINDOW,
  modelProviderApiFormatSchema,
  modelProviderCatalogSourceIdSchema,
  modelProviderEndpointsSchema,
  modelProviderKindSchema,
  modelProviderReasoningSpecSchema,
  modelProviderSourceSchema,
  modelProviderSystemDisabledReasonSchema,
  normalizeModelProviderBaseUrlForKind,
  normalizeModelProviderConfiguredBaseUrl,
  resolveModelProviderDefaultKind,
  resolveModelProviderContextWindow,
  resolveModelProviderKindApiFormat,
  resolveModelProviderApiFormat,
  resolveModelProviderRuntimeBaseUrl,
  stripLegacyClaudeProviderMappings,
  stripModelProviderReasoningPatches,
  type ModelProviderApiFormat,
  type ModelProviderCatalogSourceId,
  type ModelProviderConfig,
  type ModelProviderEndpoints,
  type ModelProviderKind,
  type ModelProviderModelConfig,
  type ModelProviderModality,
  type ModelProviderReasoningSpec,
  type ModelProviderSource,
  type ModelProviderSystemDisabledReason,
  type ProviderModelMappings,
} from "./legacyModelProviderSerialized.js";
import { getAppConfigDir } from "../paths.js";

const LEGACY_PRESET_GLM_PROVIDER_IDS = new Set<string>([
  "zai-api",
  BUILTIN_MODEL_PROVIDER_IDS.zaiIndividualCodingPlan,
  BUILTIN_MODEL_PROVIDER_IDS.zaiStartPlan,
  "bigmodel-api",
  BUILTIN_MODEL_PROVIDER_IDS.bigmodelIndividualCodingPlan,
  BUILTIN_MODEL_PROVIDER_IDS.bigmodelStartPlan,
]);

function isLegacyPresetGlmProviderId(providerId: string): boolean {
  return LEGACY_PRESET_GLM_PROVIDER_IDS.has(providerId);
}

const BIGMODEL_CODING_PLAN_ANTHROPIC_BASE_URL = "https://open.bigmodel.cn/api/anthropic";

function normalizeBigModelCodingPlanAnthropicBaseUrlForEnv(
  baseUrl: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string {
  const fallbackBaseUrl =
    resolveRuntimeIdexalEnv(env) === "production"
      ? BIGMODEL_CODING_PLAN_ANTHROPIC_BASE_URL
      : `${resolveBigModelApiOrigin(env)}/api/anthropic`;
  const normalizedBaseUrl = normalizeModelProviderBaseUrlForKind(
    baseUrl ?? fallbackBaseUrl,
    "anthropic",
  );
  if (resolveRuntimeIdexalEnv(env) === "production") {
    return normalizedBaseUrl || fallbackBaseUrl;
  }

  try {
    const parsed = new URL(normalizedBaseUrl || fallbackBaseUrl);
    const productionParsed = new URL(BIGMODEL_CODING_PLAN_ANTHROPIC_BASE_URL);
    // 旧配置可能保存生产域名；测试环境的 Team Plan Key 无法调用生产网关。
    return parsed.origin === productionParsed.origin
      ? fallbackBaseUrl
      : normalizedBaseUrl || fallbackBaseUrl;
  } catch {
    return fallbackBaseUrl;
  }
}

function getIdexalConfigFilePath(): string {
  return join(getAppConfigDir(), "config.json");
}

const LEGACY_FALLBACK_CONTEXT_WINDOW = MODEL_PROVIDER_NEW_MODEL_CONTEXT_WINDOW;
const RETIRED_ZAPI_PROVIDER_ID = "builtin:zapi";

type JsonObject = Record<string, unknown>;

interface IdexalConfigFile {
  $schema?: string;
  provider?: Record<string, IdexalOpenCodeProviderConfig>;
  [key: string]: unknown;
}

interface IdexalOpenCodeProviderConfig {
  api?: string;
  name?: string;
  env?: string[];
  id?: string;
  kind?: ModelProviderKind;
  npm?: string;
  whitelist?: string[];
  blacklist?: string[];
  options?: JsonObject;
  enabled?: boolean;
  systemDisabledReason?: ModelProviderSystemDisabledReason;
  endpoints?: ModelProviderEndpoints;
  apiFormat?: ModelProviderApiFormat;
  source?: ModelProviderSource;
  catalogSourceId?: ModelProviderCatalogSourceId;
  catalogProviderId?: string;
  modelsDevProviderId?: string;
  apiKeyRequired?: boolean;
  headers?: Record<string, string>;
  logoUrl?: string;
  apiKeyUrl?: string;
  defaultKind?: ModelProviderKind;
  providerMappings?: ProviderModelMappings;
  createdAt?: number;
  updatedAt?: number;
  models?: Record<string, IdexalOpenCodeModelConfig>;
  idexal?: IdexalProviderConfigExtension;
  [key: string]: unknown;
}

interface IdexalOpenCodeModelConfig {
  id?: string;
  name?: string;
  family?: string;
  release_date?: string;
  attachment?: boolean;
  reasoning?: boolean | IdexalReasoningConfigExtension;
  temperature?: boolean;
  tool_call?: boolean;
  interleaved?: unknown;
  cost?: JsonObject;
  limit?: {
    context?: number;
    input?: number;
    output?: number;
  };
  contextWindow?: number;
  maxOutputTokens?: number;
  modalities?: {
    input?: ModelProviderModality[];
    output?: ModelProviderModality[];
  };
  experimental?: boolean;
  status?: string;
  provider?: {
    npm?: string;
    api?: string;
  };
  options?: JsonObject;
  headers?: Record<string, string>;
  variants?: Record<string, JsonObject>;
  kinds?: ModelProviderKind[];
  defaultKind?: ModelProviderKind;
  modelIdByKind?: Partial<Record<ModelProviderKind, string>>;
  disabledReason?: string;
  supportsTools?: boolean;
  supportsStructuredOutput?: boolean;
  reasoningSpec?: ModelProviderReasoningSpec;
  hasMaxOutputTokens?: boolean;
  priority?: number;
  modified?: boolean;
  deleted?: boolean;
  idexal?: IdexalModelConfigExtension;
  [key: string]: unknown;
}

interface IdexalReasoningConfigExtension {
  enabled?: boolean;
  variants?: string[];
  defaultVariant?: string;
  aliases?: Record<string, string>;
}

interface IdexalProviderConfigExtension {
  enabled?: boolean;
  systemDisabledReason?: ModelProviderSystemDisabledReason;
  endpoints?: ModelProviderEndpoints;
  apiFormat?: ModelProviderApiFormat;
  source?: ModelProviderSource;
  catalogSourceId?: ModelProviderCatalogSourceId;
  catalogProviderId?: string;
  modelsDevProviderId?: string;
  apiKeyRequired?: boolean;
  headers?: Record<string, string>;
  logoUrl?: string;
  apiKeyUrl?: string;
  defaultKind?: ModelProviderKind;
  providerMappings?: ProviderModelMappings;
  createdAt?: number;
  updatedAt?: number;
  deletedModels?: string[];
}

interface IdexalModelConfigExtension {
  kinds?: ModelProviderKind[];
  defaultKind?: ModelProviderKind;
  modelIdByKind?: Partial<Record<ModelProviderKind, string>>;
  disabledReason?: string;
  supportsTools?: boolean;
  supportsStructuredOutput?: boolean;
  reasoning?: ModelProviderReasoningSpec;
  hasMaxOutputTokens?: boolean;
  priority?: number;
  modified?: boolean;
  deleted?: boolean;
}

const jsonObjectSchema = z.record(z.string(), z.unknown());
const idexalModelProviderModalitySchema = z.enum(["text", "image", "video", "audio", "pdf"]);
const idexalProviderModelMappingsSchema = z.record(z.string(), z.unknown());

const idexalReasoningConfigExtensionSchema = z
  .object({
    enabled: z.boolean().optional(),
    variants: z.array(z.string().min(1)).optional(),
    defaultVariant: z.string().min(1).optional(),
    aliases: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const idexalModelConfigExtensionSchema = z
  .object({
    kinds: z.array(modelProviderKindSchema).optional(),
    defaultKind: modelProviderKindSchema.optional(),
    modelIdByKind: z.partialRecord(modelProviderKindSchema, z.string().min(1)).optional(),
    disabledReason: z.string().optional(),
    supportsTools: z.boolean().optional(),
    supportsStructuredOutput: z.boolean().optional(),
    reasoning: modelProviderReasoningSpecSchema.optional(),
    hasMaxOutputTokens: z.boolean().optional(),
    priority: z.number().finite().optional(),
    modified: z.boolean().optional(),
    deleted: z.boolean().optional(),
  })
  .passthrough();

const idexalOpenCodeModelConfigSchema: z.ZodType<IdexalOpenCodeModelConfig> = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    reasoning: z.union([z.boolean(), idexalReasoningConfigExtensionSchema]).optional(),
    limit: z
      .object({
        context: z.number().positive().optional(),
        input: z.number().positive().optional(),
        output: z.number().positive().optional(),
      })
      .optional(),
    contextWindow: z.number().positive().optional(),
    maxOutputTokens: z.number().positive().optional(),
    modalities: z
      .object({
        input: z.array(idexalModelProviderModalitySchema).optional(),
        output: z.array(idexalModelProviderModalitySchema).optional(),
      })
      .optional(),
    options: jsonObjectSchema.optional(),
    headers: z.record(z.string(), z.string()).optional(),
    variants: z.record(z.string(), jsonObjectSchema).optional(),
    kinds: z.array(modelProviderKindSchema).optional(),
    defaultKind: modelProviderKindSchema.optional(),
    modelIdByKind: z.partialRecord(modelProviderKindSchema, z.string().min(1)).optional(),
    disabledReason: z.string().optional(),
    supportsTools: z.boolean().optional(),
    supportsStructuredOutput: z.boolean().optional(),
    reasoningSpec: modelProviderReasoningSpecSchema.optional(),
    hasMaxOutputTokens: z.boolean().optional(),
    priority: z.number().finite().optional(),
    modified: z.boolean().optional(),
    deleted: z.boolean().optional(),
    idexal: idexalModelConfigExtensionSchema.optional(),
  })
  .passthrough();

const idexalProviderConfigExtensionSchema = z
  .object({
    enabled: z.boolean().optional(),
    systemDisabledReason: modelProviderSystemDisabledReasonSchema.optional(),
    endpoints: modelProviderEndpointsSchema.optional(),
    apiFormat: modelProviderApiFormatSchema.optional(),
    source: modelProviderSourceSchema.optional(),
    catalogSourceId: modelProviderCatalogSourceIdSchema.optional(),
    catalogProviderId: z.string().optional(),
    modelsDevProviderId: z.string().optional(),
    apiKeyRequired: z.boolean().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    logoUrl: z.string().optional(),
    apiKeyUrl: z.string().optional(),
    defaultKind: modelProviderKindSchema.optional(),
    providerMappings: idexalProviderModelMappingsSchema.optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    deletedModels: z.array(z.string().min(1)).optional(),
  })
  .passthrough();

const idexalOpenCodeProviderConfigSchema: z.ZodType<IdexalOpenCodeProviderConfig> = z
  .object({
    api: z.string().optional(),
    name: z.string().optional(),
    env: z.array(z.string()).optional(),
    id: z.string().optional(),
    kind: modelProviderKindSchema.optional(),
    npm: z.string().optional(),
    whitelist: z.array(z.string()).optional(),
    blacklist: z.array(z.string()).optional(),
    options: jsonObjectSchema.optional(),
    enabled: z.boolean().optional(),
    systemDisabledReason: modelProviderSystemDisabledReasonSchema.optional(),
    endpoints: modelProviderEndpointsSchema.optional(),
    apiFormat: modelProviderApiFormatSchema.optional(),
    source: modelProviderSourceSchema.optional(),
    catalogSourceId: modelProviderCatalogSourceIdSchema.optional(),
    catalogProviderId: z.string().optional(),
    modelsDevProviderId: z.string().optional(),
    apiKeyRequired: z.boolean().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    logoUrl: z.string().optional(),
    apiKeyUrl: z.string().optional(),
    defaultKind: modelProviderKindSchema.optional(),
    providerMappings: idexalProviderModelMappingsSchema.optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    models: z.record(z.string(), idexalOpenCodeModelConfigSchema).optional(),
    idexal: idexalProviderConfigExtensionSchema.optional(),
  })
  .passthrough();

const idexalConfigFileSchema = z
  .object({
    $schema: z.string().optional(),
    provider: z.record(z.string(), idexalOpenCodeProviderConfigSchema).optional(),
  })
  .passthrough();

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    const normalizedKey = key.trim();
    const normalizedValue = readString(item);
    return normalizedKey && normalizedValue ? [[normalizedKey, normalizedValue] as const] : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function inferModelProviderKindFromOpenCodeProvider(
  provider: IdexalOpenCodeProviderConfig,
): ModelProviderKind {
  if (provider.kind) {
    return provider.kind;
  }
  const npm = provider.npm?.toLowerCase() ?? "";
  if (npm.includes("anthropic")) {
    return "anthropic";
  }
  if (npm.includes("openai-compatible")) {
    return "openai-compatible";
  }
  if (npm.includes("openai")) {
    return "openai";
  }
  return "openai-compatible";
}

function hasOpenCodeProviderRuntimeFields(provider: IdexalOpenCodeProviderConfig): boolean {
  // config.json 的权威运行态字段是 kind/options.baseURL。
  // 旧 endpoints/apiFormat/defaultKind/idexal 可能是历史迁移残留，若继续优先读取会覆盖新配置。
  return Boolean(
    provider.kind ||
    readString(provider.options?.baseURL) ||
    readString(provider.api) ||
    provider.npm?.trim(),
  );
}

function resolveOpenCodeProviderDefaultKind(
  provider: IdexalOpenCodeProviderConfig,
): ModelProviderKind {
  if (provider.kind) {
    return provider.kind;
  }
  if (readString(provider.options?.baseURL) || readString(provider.api) || provider.npm?.trim()) {
    return inferModelProviderKindFromOpenCodeProvider(provider);
  }
  return (
    provider.defaultKind ??
    provider.idexal?.defaultKind ??
    inferModelProviderKindFromOpenCodeProvider(provider)
  );
}

function resolvePresetProviderKindFromRuntimeBaseUrl(
  providerId: string,
  baseURL: string | undefined,
): ModelProviderKind | undefined {
  if (!baseURL || !isLegacyPresetGlmProviderId(providerId)) {
    return undefined;
  }

  // 历史 config.json 可能保存成 kind=anthropic 但 baseURL 指向
  // /coding/paas/v4。ZAI/BigModel 这组内置 provider 的运行协议必须和已知
  // runtime URL 对齐，否则 agent 会用 Anthropic adapter 请求 OpenAI Chat endpoint。
  const normalized = baseURL.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const path = resolveRuntimeBaseUrlPath(normalized);

  if (isBigModelCodingPlanLegacyOpenAiRuntime(providerId, normalized)) {
    // BigModel Coding Plan 的默认 runtime 已统一回 Anthropic。
    // 历史落盘的 /coding/paas/v4 不能继续把该内置 provider 推断成 OpenAI-compatible。
    return "anthropic";
  }
  if (path.includes("/coding/paas/v4")) {
    return "openai-compatible";
  }
  if (path.includes("/api/anthropic") || path.includes("/zcode-plan/anthropic")) {
    return "anthropic";
  }
  return undefined;
}

function resolveRuntimeBaseUrlPath(baseURL: string): string {
  try {
    return new URL(baseURL).pathname.toLowerCase();
  } catch {
    // 非 URL 的历史值继续按原始字符串做保守匹配。
    return baseURL.toLowerCase();
  }
}

function isBigModelCodingPlanLegacyOpenAiRuntime(
  providerId: string,
  baseURL: string | undefined,
): boolean {
  if (providerId !== BUILTIN_MODEL_PROVIDER_IDS.bigmodelIndividualCodingPlan) {
    return false;
  }
  const normalized = baseURL?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }
  return resolveRuntimeBaseUrlPath(normalized).includes("/coding/paas/v4");
}

function resolveOpenCodeProviderEndpoints(
  provider: IdexalOpenCodeProviderConfig,
  defaultKind: ModelProviderKind,
  providerId: string,
): ModelProviderEndpoints {
  const baseURL = readString(provider.options?.baseURL) ?? readString(provider.api);
  if (baseURL) {
    if (isBigModelCodingPlanLegacyOpenAiRuntime(providerId, baseURL)) {
      // 旧版本把 BigModel Coding Plan 保存到 OpenAI Chat 的 coding endpoint。
      // 现在该内置 provider 默认使用 Anthropic endpoint，读取时需要把 baseURL 一并迁移。
      return {
        baseURL: normalizeBigModelCodingPlanAnthropicBaseUrlForEnv(undefined),
        paths: {
          anthropic: "/v1/messages",
        },
      };
    }
    if (providerId === BUILTIN_MODEL_PROVIDER_IDS.bigmodelIndividualCodingPlan) {
      return {
        baseURL: normalizeBigModelCodingPlanAnthropicBaseUrlForEnv(baseURL),
        paths: {
          anthropic: "/v1/messages",
        },
      };
    }
    // config.json 新结构的 options.baseURL 是用户配置的 runtime baseURL。
    // 读取时不能按 kind 删除 /v1、/responses 等路径段，否则设置页失焦/刷新会改写用户输入。
    const normalizedBaseURL = normalizeModelProviderConfiguredBaseUrl(baseURL);
    return {
      baseURL: normalizedBaseURL,
      paths: {
        [defaultKind]: getDefaultModelProviderEndpointPathForKind(defaultKind),
      },
    };
  }
  return provider.endpoints ?? provider.idexal?.endpoints ?? {};
}

function stripIdexalPrefixedProviderMappings(
  providerMappings: ProviderModelMappings | undefined,
): ProviderModelMappings | undefined {
  if (!providerMappings) {
    return undefined;
  }
  const entries = Object.entries(providerMappings ?? {}).filter(
    ([key]) => !key.toLowerCase().startsWith("idexal"),
  );
  return Object.fromEntries(entries);
}

function openCodeReasoningToModelReasoning(
  model: IdexalOpenCodeModelConfig,
  options: { preferOpenCodeFields: boolean },
): ModelProviderReasoningSpec | undefined {
  if (!options.preferOpenCodeFields && model.reasoningSpec) {
    return stripModelProviderReasoningPatches(model.reasoningSpec);
  }
  if (!options.preferOpenCodeFields && model.idexal?.reasoning) {
    return stripModelProviderReasoningPatches(model.idexal.reasoning);
  }
  const reasoning = model.reasoning;
  if (reasoning === undefined || reasoning === false) {
    return undefined;
  }
  const reasoningConfig = typeof reasoning === "object" ? reasoning : undefined;
  if (reasoningConfig?.enabled === false) {
    return undefined;
  }
  const variantKeys = reasoningConfig?.variants ?? [];
  if (variantKeys.length === 0) {
    return undefined;
  }
  return {
    ...(reasoningConfig?.defaultVariant ? { defaultLevel: reasoningConfig.defaultVariant } : {}),
    levels: Object.fromEntries(variantKeys.map((level) => [level, {}])),
  };
}

function openCodeModelToModelProviderModel(
  modelId: string,
  model: IdexalOpenCodeModelConfig,
  providerDefaultKind: ModelProviderKind,
  options: { preferOpenCodeFields: boolean },
): ModelProviderModelConfig {
  const idexal = options.preferOpenCodeFields ? undefined : model.idexal;
  const idexalExtensions = model.idexal;
  const contextWindow =
    readPositiveNumber(model.limit?.context) ?? readPositiveNumber(model.contextWindow);
  const maxOutputTokens =
    readPositiveNumber(model.limit?.output) ??
    readPositiveNumber(model.options?.max_tokens) ??
    readPositiveNumber(model.maxOutputTokens);
  // 早期 provider 配置可能只在 options.max_tokens 或顶层 maxOutputTokens 保存输出值。
  // 读取时按 limit > options > 顶层兼容，写回仍收敛到标准 limit 结构。
  const hasMaxOutputTokens =
    (!options.preferOpenCodeFields ? model.hasMaxOutputTokens : undefined) ??
    idexal?.hasMaxOutputTokens ??
    maxOutputTokens !== undefined;
  const kinds =
    !options.preferOpenCodeFields && model.kinds?.length
      ? model.kinds
      : idexal?.kinds?.length
        ? idexal.kinds
        : [providerDefaultKind];
  return createModelProviderModelConfig({
    id: model.id?.trim() || modelId,
    name: model.name,
    kinds,
    defaultKind:
      (!options.preferOpenCodeFields ? model.defaultKind : undefined) ??
      idexal?.defaultKind ??
      providerDefaultKind,
    contextWindow,
    maxOutputTokens: hasMaxOutputTokens ? maxOutputTokens : undefined,
    modalities: {
      input: model.modalities?.input,
      output: model.modalities?.output,
    },
    reasoning: openCodeReasoningToModelReasoning(model, options),
    priority: readFiniteNumber(model.priority) ?? readFiniteNumber(idexalExtensions?.priority),
    disabledReason: model.disabledReason ?? idexal?.disabledReason,
    supportsTools: model.supportsTools ?? idexal?.supportsTools,
    supportsStructuredOutput: model.supportsStructuredOutput ?? idexal?.supportsStructuredOutput,
    modified: model.modified ?? idexalExtensions?.modified,
    deleted: model.deleted ?? idexalExtensions?.deleted,
  });
}

function normalizeDeletedModelIds(modelIds: readonly string[] | undefined): string[] {
  const deletedModels: string[] = [];
  const seen = new Set<string>();
  for (const rawModelId of modelIds ?? []) {
    const modelId = rawModelId.trim();
    const key = modelId.toLowerCase();
    if (!modelId || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deletedModels.push(modelId);
  }
  return deletedModels;
}

function createDeletedModelTombstone(
  modelId: string,
  providerDefaultKind: ModelProviderKind,
): ModelProviderModelConfig {
  return createModelProviderModelConfig({
    id: modelId,
    kinds: [providerDefaultKind],
    contextWindow: LEGACY_FALLBACK_CONTEXT_WINDOW,
    modalities: { input: ["text"], output: ["text"] },
    modified: true,
    deleted: true,
  });
}

function openCodeProviderToModelProviderConfig(
  providerId: string,
  provider: IdexalOpenCodeProviderConfig,
): ModelProviderConfig {
  const idexal = provider.idexal;
  const preferOpenCodeFields = hasOpenCodeProviderRuntimeFields(provider);
  const configuredDefaultKind = resolveOpenCodeProviderDefaultKind(provider);
  const options = provider.options ?? {};
  const configuredRuntimeBaseURL = readString(options.baseURL) ?? readString(provider.api);
  const defaultKind =
    resolvePresetProviderKindFromRuntimeBaseUrl(providerId, configuredRuntimeBaseURL) ??
    configuredDefaultKind;
  const endpoints = resolveOpenCodeProviderEndpoints(provider, defaultKind, providerId);
  const apiKey = readString(options.apiKey) ?? "";
  const now = Date.now();
  const models = Object.entries(provider.models ?? {}).map(([modelId, model]) =>
    openCodeModelToModelProviderModel(modelId, model, defaultKind, {
      preferOpenCodeFields,
    }),
  );
  const modelKeys = new Set(models.map((model) => model.id.trim().toLowerCase()).filter(Boolean));
  for (const deletedModelId of normalizeDeletedModelIds(idexal?.deletedModels)) {
    const key = deletedModelId.toLowerCase();
    if (modelKeys.has(key)) {
      continue;
    }
    models.push(createDeletedModelTombstone(deletedModelId, defaultKind));
    modelKeys.add(key);
  }
  const apiKeyRequired =
    provider.apiKeyRequired ?? idexal?.apiKeyRequired ?? readBoolean(options.apiKeyRequired);
  const providerMappings = preferOpenCodeFields
    ? undefined
    : stripIdexalPrefixedProviderMappings(provider.providerMappings ?? idexal?.providerMappings);
  return normalizeProviderForStore({
    id: provider.id?.trim() || providerId,
    name: provider.name?.trim() || providerId,
    ...(provider.enabled !== undefined
      ? { enabled: provider.enabled }
      : idexal?.enabled !== undefined
        ? { enabled: idexal.enabled }
        : {}),
    ...((provider.systemDisabledReason ?? idexal?.systemDisabledReason)
      ? {
          systemDisabledReason: provider.systemDisabledReason ?? idexal?.systemDisabledReason,
        }
      : {}),
    endpoints,
    apiFormat: preferOpenCodeFields
      ? resolveModelProviderKindApiFormat(defaultKind)
      : (provider.apiFormat ?? idexal?.apiFormat ?? resolveModelProviderKindApiFormat(defaultKind)),
    ...((provider.source ?? idexal?.source)
      ? { source: provider.source ?? idexal?.source }
      : { source: "custom" }),
    ...((provider.catalogSourceId ?? idexal?.catalogSourceId)
      ? { catalogSourceId: provider.catalogSourceId ?? idexal?.catalogSourceId }
      : {}),
    ...((provider.catalogProviderId ?? idexal?.catalogProviderId)
      ? {
          catalogProviderId: provider.catalogProviderId ?? idexal?.catalogProviderId,
        }
      : {}),
    ...((provider.modelsDevProviderId ?? idexal?.modelsDevProviderId)
      ? {
          modelsDevProviderId: provider.modelsDevProviderId ?? idexal?.modelsDevProviderId,
        }
      : {}),
    ...(apiKeyRequired !== undefined ? { apiKeyRequired } : {}),
    ...((provider.headers ?? idexal?.headers ?? readStringRecord(options.headers))
      ? {
          headers: provider.headers ?? idexal?.headers ?? readStringRecord(options.headers),
        }
      : {}),
    ...((provider.logoUrl ?? idexal?.logoUrl)
      ? { logoUrl: provider.logoUrl ?? idexal?.logoUrl }
      : {}),
    apiKey,
    ...((provider.apiKeyUrl ?? idexal?.apiKeyUrl)
      ? { apiKeyUrl: provider.apiKeyUrl ?? idexal?.apiKeyUrl }
      : {}),
    defaultKind,
    models,
    ...(providerMappings ? { providerMappings } : {}),
    createdAt:
      (!preferOpenCodeFields ? (provider.createdAt ?? idexal?.createdAt) : undefined) ?? now,
    updatedAt:
      (!preferOpenCodeFields ? (provider.updatedAt ?? idexal?.updatedAt) : undefined) ?? now,
  });
}

async function readRawIdexalConfigFile(): Promise<IdexalConfigFile | null> {
  const filePath = getIdexalConfigFilePath();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // 旧读取器把所有失败当作文件不存在，Importer 会因此永久提交空 Personal 配置。
    // 只有 ENOENT 允许初始化空配置；其余错误交给 Repository 保留磁盘并报告失败。
    if (code === "ENOENT") return null;
    throw new Error(`旧 Provider 配置读取失败 stage=io path=${filePath} code=${code ?? "unknown"}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    // JSON/Zod 原始错误可能包含 API Key 等输入值；不能写入日志或通过 cause 向外传递。
    throw new Error(`旧 Provider 配置解析失败 stage=json path=${filePath}`);
  }
  const parsed = idexalConfigFileSchema.safeParse(json);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.map(String).join(".").slice(0, 256) ?? "";
    throw new Error(`旧 Provider 配置校验失败 stage=schema path=${filePath} field=${field}`);
  }
  return parsed.data;
}

async function readIdexalConfigProviders(): Promise<ModelProviderConfig[] | null> {
  const config = await readRawIdexalConfigFile();
  if (!config?.provider) {
    return null;
  }
  const providers = Object.entries(config.provider).map(([providerId, provider]) =>
    openCodeProviderToModelProviderConfig(providerId, provider),
  );
  return applyProviderStoreMigrations(providers);
}

function normalizeModelKindsFromProvider(
  provider: Pick<
    ModelProviderConfig,
    "apiFormat" | "defaultKind" | "endpoints" | "modelSupportedFormats"
  >,
  modelId: string,
): ModelProviderKind[] {
  const formats =
    provider.modelSupportedFormats?.[modelId] ??
    (provider.apiFormat
      ? getDefaultModelSupportedFormatsFromApiFormat(provider.apiFormat)
      : getDefaultModelSupportedFormatsFromEndpoints(provider.endpoints));
  const kinds = formats.flatMap((format) => {
    const kind = mapModelProviderSupportedFormatToKind(format);
    return kind ? [kind] : [];
  });
  if (kinds.length > 0) {
    return [...new Set(kinds)];
  }

  const defaultKind = resolveModelProviderDefaultKind(provider);
  return defaultKind ? [defaultKind] : [];
}

function normalizeModelProviderModelConfigEntry(
  model: ModelProviderModelConfig,
): ModelProviderModelConfig | null {
  const id = model.id.trim();
  if (!id) {
    return null;
  }

  return {
    ...model,
    id,
    name: model.name?.trim() || undefined,
    contextWindow: resolveModelProviderContextWindow(model.contextWindow),
    kinds: [...new Set(model.kinds)],
    modalities: {
      input: [...new Set(model.modalities.input)],
      output: [...new Set(model.modalities.output)],
    },
  };
}

function normalizeProviderModels(provider: ModelProviderConfig): ModelProviderModelConfig[] {
  const hasModelConfigs = provider.models.some(isModelProviderModelConfig);
  if (hasModelConfigs) {
    // 预置同步会产生“官方字符串模型 + 用户自定义对象模型”的混合列表。
    // 混合列表不能整表走 legacy 迁移：对象里的 contextWindow/reasoning 等 metadata 会丢失。
    const seen = new Set<string>();
    return provider.models.flatMap((rawModel) => {
      const rawModelId = isModelProviderModelConfig(rawModel) ? rawModel.id : rawModel;
      const modelId = rawModelId.trim();
      if (!modelId) {
        return [];
      }

      const normalizedModel = isModelProviderModelConfig(rawModel)
        ? normalizeModelProviderModelConfigEntry(rawModel)
        : createModelProviderModelConfig({
            id: modelId,
            name: provider.modelDisplayNames?.[modelId],
            kinds: normalizeModelKindsFromProvider(provider, modelId),
            defaultKind: resolveModelProviderDefaultKind(provider),
          });
      if (!normalizedModel || seen.has(normalizedModel.id)) {
        return [];
      }

      seen.add(normalizedModel.id);
      return [normalizedModel];
    });
  }

  const migrated = legacyModelProviderListSchema.safeParse([provider]);
  if (migrated.success) {
    return migrateLegacyModelProviderConfig(migrated.data[0]!).models.filter(
      isModelProviderModelConfig,
    );
  }

  const seen = new Set<string>();
  return getModelProviderModelIds(provider).flatMap((modelId) => {
    if (seen.has(modelId)) {
      return [];
    }
    seen.add(modelId);
    return [
      createModelProviderModelConfig({
        id: modelId,
        name: provider.modelDisplayNames?.[modelId],
        kinds: normalizeModelKindsFromProvider(provider, modelId),
        defaultKind: resolveModelProviderDefaultKind(provider),
      }),
    ];
  });
}

function hasCanonicalEndpoints(endpoints: ModelProviderEndpoints): boolean {
  return Boolean(endpoints.baseURL?.trim() || endpoints.paths);
}

function resolveProviderDefaultKindForStore(provider: ModelProviderConfig): ModelProviderKind {
  if (provider.defaultKind || provider.apiFormat || hasCanonicalEndpoints(provider.endpoints)) {
    return resolveModelProviderDefaultKind(provider);
  }

  // 旧 v2 store 可能仍只带 endpoints.anthropic/openai。
  // 新运行态 helper 不再读取旧字段，这里必须在迁移边界先推导 defaultKind 再落 runtime endpoint。
  if (provider.endpoints.anthropic?.trim()) {
    return "anthropic";
  }
  if (provider.endpoints.openai?.trim()) {
    return "openai-compatible";
  }
  return resolveModelProviderDefaultKind(provider);
}

function normalizeProviderForStore(provider: ModelProviderConfig): ModelProviderConfig {
  const defaultKind = resolveProviderDefaultKindForStore(provider);
  const normalizedEndpoints = normalizeEndpoints(provider.endpoints, defaultKind);
  const apiFormat = resolveModelProviderApiFormat({
    apiFormat: provider.apiFormat,
    defaultKind,
    endpoints: normalizedEndpoints,
  });
  const normalizedModels = normalizeProviderModels({
    ...provider,
    apiFormat,
    defaultKind,
    endpoints: normalizedEndpoints,
    modelSupportedFormats: provider.modelSupportedFormats,
  });

  return {
    ...provider,
    apiFormat,
    defaultKind,
    endpoints: normalizedEndpoints,
    models: normalizedModels,
    modelDisplayNames: undefined,
    modelSupportedFormats: undefined,
    providerMappings: stripIdexalPrefixedProviderMappings(
      stripLegacyClaudeProviderMappings(provider.providerMappings),
    ),
  };
}

function applyProviderStoreMigrations(providers: ModelProviderConfig[]): ModelProviderConfig[] {
  // default-* 预置模板不随产品分发：空 API Key 表示用户从未启用该供应商。
  // 在迁移边界清掉这些旧预置项，避免刷新后继续占用设置页和模型菜单。
  let next = providers.filter(
    (provider) =>
      provider.id !== RETIRED_ZAPI_PROVIDER_ID &&
      !(provider.id.startsWith("default-") && provider.apiKey.trim().length === 0),
  );

  // 迁移边界只规范化旧文件里真实存在的值。模型 Properties、Option Specs 与
  // reasoning mapping 由 Idexal Built-in/Personal ModelConfigRules 在 Registry 中解析；
  // 旧 Store 不能再按 Model ID 从另一份 Catalog 补值并把补值持久化回用户文件。
  return next.map(normalizeProviderForStore);
}

/** 只读取已发布旧 config.json；更早期的独立 Provider Store 已退出所有迁移链路。 */
export async function readLegacyIdexalConfigProviders(): Promise<ModelProviderConfig[]> {
  const configProviders = await readIdexalConfigProviders();
  return configProviders ? filterDeletedProviderModelsForRead(configProviders) : [];
}

function filterDeletedProviderModelsForRead(
  providers: ModelProviderConfig[],
): ModelProviderConfig[] {
  return providers.map((provider) => ({
    ...provider,
    models: provider.models.filter(
      (model) => !isModelProviderModelConfig(model) || model.deleted !== true,
    ),
  }));
}

function resolveLegacyRuntimeBaseUrlForKind(
  endpoints: ModelProviderEndpoints,
  defaultKind: ModelProviderKind,
): string {
  const rawEndpoint =
    defaultKind === "anthropic" ? endpoints.anthropic?.trim() : endpoints.openai?.trim();
  if (rawEndpoint) {
    return normalizeModelProviderBaseUrlForKind(rawEndpoint, defaultKind);
  }
  const fallbackEndpoint = endpoints.anthropic?.trim() || endpoints.openai?.trim() || "";
  return fallbackEndpoint
    ? normalizeModelProviderBaseUrlForKind(fallbackEndpoint, defaultKind)
    : "";
}

function resolveRuntimeBaseUrlForStore(
  endpoints: ModelProviderEndpoints,
  defaultKind: ModelProviderKind,
): string {
  const runtimeBaseURL = resolveModelProviderRuntimeBaseUrl(
    {
      apiFormat: resolveModelProviderKindApiFormat(defaultKind),
      defaultKind,
      endpoints,
    },
    defaultKind,
  );
  if (runtimeBaseURL) {
    return runtimeBaseURL;
  }

  const baseURL = endpoints.baseURL?.trim();
  if (baseURL) {
    return normalizeModelProviderBaseUrlForKind(baseURL, defaultKind);
  }

  // 旧 store 可能还只有 endpoints.anthropic/openai。
  // OpenCode runtime config 只能保存当前 kind 的 baseURL，这里按 defaultKind 取一条旧入口。
  return resolveLegacyRuntimeBaseUrlForKind(endpoints, defaultKind);
}

function normalizeEndpoints(
  endpoints: ModelProviderEndpoints,
  defaultKind: ModelProviderKind,
): ModelProviderEndpoints {
  const runtimeBaseURL = resolveRuntimeBaseUrlForStore(endpoints, defaultKind);
  if (!runtimeBaseURL) {
    return {};
  }
  return {
    baseURL: runtimeBaseURL,
    paths: {
      [defaultKind]: getDefaultModelProviderEndpointPathForKind(defaultKind),
    },
  };
}
