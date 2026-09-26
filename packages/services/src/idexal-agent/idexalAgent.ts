import type { BackgroundBashOutputResult, SessionDebugSnapshot } from "@idexal/shared";
/* eslint-disable max-lines -- Idexal agent service 接口集中声明 protocol/session/workspace 方法，拆分会增加 service descriptor 迁移成本。 */
import type { Event, IDisposable } from "@idexal/rpc";
import { ServiceChannels } from "@idexal/shared";
import type { AppUsageRange, AppUsageSnapshot, IdexalTaskTokenUsageResult } from "@idexal/shared";
import type { IdexalAutomation, IdexalAutomationRun } from "@idexal/shared";
import type {
  IdexalStorageStartupState,
  IdexalDeliveryKind,
  IdexalAgentMcpServer,
  IdexalBackgroundTurnAttribution,
  TraceId,
  IdexalSessionCompactResult,
  IdexalSessionGoalAction,
  IdexalSessionGoalResult,
  IdexalMessageWithParts,
  ModelSelection,
  IdexalSessionImportHistory,
  IdexalPermissionRequestParams,
  AgentLaneResourceSample,
  IdexalMcpTelemetryEvent,
  IdexalMcpResourceSample,
  IdexalToolExecResource,
  IdexalProcessChildProcess,
  IdexalMcpListResult,
  IdexalPluginsListResult,
  IdexalPluginsOverviewResult,
  IdexalPluginsMarketplaceMutationResult,
  IdexalPluginsInstallResult,
  IdexalPluginsReferenceCatalogResult,
  IdexalSkillsReferenceCatalogResult,
  IdexalWorkflowsDeleteResult,
  IdexalWorkflowsGetResult,
  IdexalWorkflowsListResult,
  IdexalWorkflowsMoveResult,
  IdexalWorkflowsRunsResult,
  IdexalWorkflowsUpdateMetaResult,
  IdexalPluginsUninstallResult,
  IdexalPluginsRestoreBuiltinResult,
  IdexalPluginsConfigureResult,
  IdexalPluginsDescribeResult,
  IdexalPluginsValidateResult,
  IdexalPluginsSetEnabledResult,
  IdexalPluginsCancelOperationResult,
  IdexalPluginOperationProgressNotification,
  IdexalProviderTestModelConnectivityParams,
  IdexalProviderTestModelConnectivityResult,
  IdexalUserInputRequestParams,
  IdexalUserInputResponse,
  IdexalSessionEvent,
  IdexalSessionInfo,
  IdexalSessionMode,
  IdexalSessionPersistence,
  IdexalSessionSendResult,
  IdexalSessionRequestRuntimePreferencesParams,
  IdexalSessionRuntimePreferencesResult,
  IdexalSessionStateSnapshot,
  IdexalSessionSubagentsResult,
  IdexalStateUpdatedNotification,
  IdexalTaskClientMode,
  IdexalBrowserAmbientContext,
  IdexalWorkspacePresentation,
  IdexalWorkspaceGenerateTextResult,
  IdexalWorkspaceGenerateTextParams,
  IdexalWorkspaceHookTrustGrantResult,
  IdexalAutomationBotDeliveryTarget,
} from "@idexal/shared";
import type {
  ClientHello,
  CommandAck,
  CommandEnvelope,
  CommandKey,
  CommandsQueryResult,
  ConversationTopicWireCandidate,
  ConversationTelemetryFact,
  CuaPermissionObservation,
  ConversationRowTarget,
  HelloMessage,
  SessionsIndexTopicWireCandidate,
  V4AttachmentBeginResult,
  V4AttachmentChunkResult,
  V4AttachmentCommitResult,
  V4AttachmentPreviewSourceResult,
  V4AttachmentReadResult,
  V4ConversationAttachmentReadResult,
  V4ConversationAttachmentStatResult,
  V4ConnectionFlowState,
  V4ConversationFileChangesResult,
  V4ConversationFileRewindPreviewResult,
  V4ConversationPlansResult,
  V4ConversationWorkflowRunEventsResult,
  V4ConversationWorkflowRunArtifactDataResult,
  V4ConversationWorkflowRunArtifactReadResult,
  V4ConversationWorkflowRunArtifactsResult,
  V4ConversationWorkflowRunNodeResultResult,
  V4ConversationWorkflowRunWorkspaceResult,
  V4ConversationWorkflowRunsResult,
  V4ConversationRowsRangeResult,
  V4ConversationResyncResult,
  V4ConversationSubscribeResult,
  V4SessionsIndexSubscribeResult,
  V4WorkspaceConfigSubscribeResult,
  WorkspaceConfigTopicWireCandidate,
} from "@idexal/shared/idexal-protocol-v4";
import { createServiceDescriptor } from "../descriptors.js";

export * from "./idexalAgentPluginParams.js";
export * from "./idexalAgentWorkflowParams.js";
import type {
  IdexalAgentAddPluginMarketplaceParams,
  IdexalAgentAutomationIdParams,
  IdexalAgentCancelPluginOperationParams,
  IdexalAgentConfigurePluginParams,
  IdexalAgentResetPluginConfigParams,
  IdexalAgentCreateAutomationParams,
  IdexalAgentDeleteAutomationRunParams,
  IdexalAgentDescribePluginParams,
  IdexalAgentInstallPluginParams,
  IdexalAgentListMcpServerStatusesParams,
  IdexalAgentPluginViewParams,
  IdexalAgentPluginReferenceCatalogParams,
  IdexalAgentSkillReferenceCatalogParams,
  IdexalAgentResolveSuggestedPluginReferenceParams,
  IdexalAgentRemovePluginMarketplaceParams,
  IdexalAgentRestoreBuiltinPluginParams,
  IdexalAgentSetPluginEnabledParams,
  IdexalAgentSetAutomationEnabledParams,
  IdexalAgentUninstallPluginParams,
  IdexalAgentUpdatePluginMarketplaceParams,
  IdexalAgentUpdatePluginParams,
  IdexalAgentUpdateAutomationParams,
  IdexalAgentValidatePluginParams,
  IdexalAgentWorkspaceTarget,
} from "./idexalAgentPluginParams.js";
import type {
  IdexalAgentDeleteSavedWorkflowParams,
  IdexalAgentGetSavedWorkflowParams,
  IdexalAgentListSavedWorkflowRunsParams,
  IdexalAgentListSavedWorkflowsParams,
  IdexalAgentMoveSavedWorkflowParams,
  IdexalAgentUpdateSavedWorkflowMetaParams,
} from "./idexalAgentWorkflowParams.js";

export interface IdexalAgentSessionTarget extends IdexalAgentWorkspaceTarget {
  sessionId: string;
}

export interface IdexalAgentResumeSessionParams extends IdexalAgentSessionTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: IdexalAgentMcpServer[];
  // 冷恢复会重建 runtime，工具面隔离必须和 create 保持同一安全边界（CUA 只放行 zcode-cua 工具、
  // 禁 Bash 等）。否则 resume 后模型可见工具面/执行权限会比创建时更宽。
  toolAllowlist?: string[];
  toolDenylist?: string[];
}

export interface IdexalAgentInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface IdexalAgentRunAutomationNowResult {
  status: "queued" | "duplicate";
}

export interface IdexalAgentWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export const IDEXAL_AGENT_RUNTIME_UNAVAILABLE_CODE = "IDEXAL_AGENT_RUNTIME_UNAVAILABLE";

export type IdexalAgentRuntimePolicy = "start-if-needed" | "existing-only";

export interface IdexalAgentRuntimeLifecycleEvent extends IdexalAgentWorkspaceTarget {
  workspaceKey: string;
  runtimeIdentity: IdexalAgentWorkspaceRuntimeIdentity;
  state: "available" | "unavailable";
}

export type IdexalAgentCuaPermissionObservation = CuaPermissionObservation &
  IdexalAgentWorkspaceTarget;

export interface IdexalAgentCreateSessionParams extends IdexalAgentWorkspaceTarget {
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: IdexalSessionMode;
  model?: ModelSelection;
  persistence?: IdexalSessionPersistence;
  thoughtLevel?: string;
  /** automation 执行会话关闭模型二次命名，保持首条用户 query 作为稳定标题。 */
  titleGenerationEnabled?: boolean;
  mcpServers?: IdexalAgentMcpServer[];
  toolAllowlist?: string[];
  toolDenylist?: string[];
  importedHistory?: IdexalSessionImportHistory;
}

export interface IdexalAgentListSessionsParams extends IdexalAgentWorkspaceTarget {
  sessionIds?: string[];
  runtimePolicy?: IdexalAgentRuntimePolicy;
  includeArchived?: boolean;
  limit?: number;
}

export interface IdexalAgentListSessionSubagentsParams extends IdexalAgentSessionTarget {
  endedCursor?: string;
  endedLimit?: number;
  /** 远程 workspace 的宿主连接身份；只用于选择现有 Host，不进入 CLI wire query。 */
  remoteSessionId?: string;
}

export interface IdexalAgentAppUsageParams {
  range: AppUsageRange;
  timeZone?: string;
}

export interface IdexalAgentTaskTokenUsageParams extends IdexalAgentSessionTarget {}

export interface IdexalAgentReadSessionParams extends IdexalAgentSessionTarget {
  deliveryKind?: IdexalDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
  /** 被动索引/观察者只能读取现有 runtime，禁止为了读快照拉起 session。 */
  runtimePolicy?: IdexalAgentRuntimePolicy;
}

export interface IdexalAgentReadSessionMessagesParams extends IdexalAgentSessionTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface IdexalAgentReadSessionEventsParams extends IdexalAgentSessionTarget {
  afterSeq?: number;
  limit?: number;
}

export type IdexalAgentReadWorkspacePresentationParams = IdexalAgentWorkspaceTarget;

export interface IdexalAgentGrantWorkspaceHookTrustParams extends IdexalAgentWorkspaceTarget {
  bundleDigest: string;
  hookDeclarationDigest: string;
}

export interface IdexalAgentSendPromptParamsBase extends IdexalAgentSessionTarget {
  modelSelection?: ModelSelection;
  modelExecution?: import("@idexal/shared/idexal-protocol-v4").CommandPayloadMap["sendText"]["modelExecution"];
  inputId?: string;
  queryId?: string;
  messageId?: string;
  sessionTraceId?: TraceId;
  content: string;
  attachments?: Record<string, unknown>[];
  /** provider-only 的当前 IAB 状态；UI/session persistence 仍使用 content 原文。 */
  browserAmbientContext?: IdexalBrowserAmbientContext;
  clientMode?: IdexalTaskClientMode;
  expectedRevision?: number;
  expectedProviderRevision?: string;
  runtimeProviderHeaders?: Record<string, string>;
  toolDenylist?: string[];
  /** Bot 来源 turn 的稳定回推地址；只在当前 turn 内供 CronCreate 读取。 */
  botDeliveryTarget?: IdexalAutomationBotDeliveryTarget;
}

export type IdexalAgentSendPromptParams = IdexalAgentSendPromptParamsBase &
  IdexalBackgroundTurnAttribution;

export interface IdexalAgentCompactParams extends IdexalAgentSessionTarget {
  inputId?: string;
  instructions?: string;
  expectedRevision?: number;
}

export interface IdexalAgentGoalParams extends IdexalAgentSessionTarget {
  inputId?: string;
  action: IdexalSessionGoalAction;
  objective?: string;
  expectedRevision?: number;
}

export interface IdexalAgentSetModelParams extends IdexalAgentSessionTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface IdexalAgentSetThoughtLevelParams extends IdexalAgentSessionTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface IdexalAgentSetModeParams extends IdexalAgentSessionTarget {
  mode: IdexalSessionMode;
  expectedRevision?: number;
}

export interface IdexalAgentGenerateWorkspaceTextParams extends IdexalAgentWorkspaceTarget {
  selection: IdexalWorkspaceGenerateTextParams["selection"];
  prompt?: string;
  messages?: IdexalWorkspaceGenerateTextParams["messages"];
  tools?: IdexalWorkspaceGenerateTextParams["tools"];
  querySource: string;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  /**
   * 协议层 RPC 超时。thinking 模型的长请求会超过协议 client 默认的
   * 3 分钟；调用方必须把自身 deadline 透传到这里，否则默认超时先触发、
   * 还会被 onRequestTimeout 误判 stale 杀进程。
   */
  requestTimeoutMs?: number;
}

export interface IdexalAgentTestModelConnectivityParams extends IdexalAgentWorkspaceTarget {
  selection: IdexalProviderTestModelConnectivityParams["selection"];
  signal?: AbortSignal;
}

export interface IdexalAgentSessionRuntimePreferencesRequest extends IdexalSessionRequestRuntimePreferencesParams {
  requestId: string;
}

export interface IdexalAgentRespondSessionRuntimePreferencesParams {
  requestId: string;
  resolution:
    | { status: "resolved"; preferences: IdexalSessionRuntimePreferencesResult }
    | { status: "failed"; message: string };
}

export interface IdexalAgentSessionSubscribeParams extends IdexalAgentSessionTarget {
  deliveryKind: IdexalDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

// ── v4 conversation 通道（竖切）──
// host 只做转发：subscribe/unsubscribe/command 透传给 CLI v4 gateway，
// v4/conversation/frame 通知按 workspace fan-out 给 renderer。

export interface IdexalAgentConversationSubscribeParams extends IdexalAgentSessionTarget {
  /** 水位不变量：仅当客户端真持有该时刻一致状态才允许带。 */
  base?: { logEpoch: string; seq: number };
  visibility?: "foreground" | "background";
}

export interface IdexalAgentConversationUnsubscribeParams extends IdexalAgentWorkspaceTarget {
  subscriptionId: string;
  runtimePolicy?: IdexalAgentRuntimePolicy;
}

export interface IdexalAgentConversationResyncParams extends IdexalAgentWorkspaceTarget {
  subscriptionId: string;
  base: { logEpoch: string; seq: number } | null;
  forceSnapshot?: boolean;
  runtimePolicy?: IdexalAgentRuntimePolicy;
}

/** 行分页 query（rows/range）：按游标向上取一窗历史行。 */
export interface IdexalAgentConversationRowsRangeParams extends IdexalAgentSessionTarget {
  /** 取 rowId < beforeRowId 的行；缺省 = 从当前尾部向前。 */
  beforeRowId?: number;
  /** 1..rowsRangeMaxLimit（200）。 */
  limit: number;
}

/** 当前有效分支里的终态 ExitPlanMode 目录。 */
export type IdexalAgentConversationPlansParams = IdexalAgentSessionTarget;

/** workflow run 的事件日志分页（详情页审计面）；cursor = journal sequence。 */
export interface IdexalAgentConversationWorkflowRunEventsParams extends IdexalAgentSessionTarget {
  runId: string;
  afterSequence?: number;
  limit?: number;
}

/** dwf run 的枚举（重启后的发现查询）。 */
export interface IdexalAgentConversationWorkflowRunsParams extends IdexalAgentSessionTarget {
  limit?: number;
}

// ── dwf 用户面产物──
// ⚠ 术语：artifact = 脚本经 `artifact.*` 发布给**用户**看的产出（文件 / markdown / 预置看板），
// 不是 run 的顶层返回值（引擎内部对后者的同名叫法）。

/** 产物清单；UI 冷恢复与中枢详情的 durable 读法。 */
export interface IdexalAgentConversationWorkflowRunArtifactsParams extends IdexalAgentSessionTarget {
  runId: string;
}

/** 预置看板的取数面；cursor = journal sequence（严格大于）。 */
export interface IdexalAgentConversationWorkflowRunArtifactDataParams extends IdexalAgentSessionTarget {
  runId: string;
  artifactId: string;
  afterSequence?: number;
  limit?: number;
}

/** 内容产物的字节，一次一块（≤ 512 KiB，形状逐字照 attachmentRead）。 */
export interface IdexalAgentConversationWorkflowRunArtifactReadParams extends IdexalAgentSessionTarget {
  runId: string;
  artifactId: string;
  version: number;
  offset: number;
  limit: number;
}

// ── dwf 工作区 transcript──
/** 轻行清单：一个 run 的 files.* / git.* / world.run 行，不带正文。 */
export interface IdexalAgentConversationWorkflowRunWorkspaceParams extends IdexalAgentSessionTarget {
  runId: string;
}

/** 一个工作区节点的正文，按 maxBytes 保形有界化（缺省与上限在 CLI 网关侧）。 */
export interface IdexalAgentConversationWorkflowRunNodeResultParams extends IdexalAgentSessionTarget {
  runId: string;
  siteId: string;
  ordinal: number;
  maxBytes?: number;
}

export interface IdexalAgentBackgroundBashOutputParams extends IdexalAgentSessionTarget {
  workId: string;
}

export interface IdexalAgentConversationFileChangesParams extends IdexalAgentSessionTarget {
  target: ConversationRowTarget;
  baseRevision: number;
  baseLogEpoch: string;
}

export interface IdexalAgentConversationFileRewindPreviewParams extends IdexalAgentSessionTarget {
  target: ConversationRowTarget;
  baseRevision: number;
  baseLogEpoch: string;
}

export interface IdexalAgentConversationCommandParams extends IdexalAgentWorkspaceTarget {
  envelope: CommandEnvelope;
  /** 仅 host 内部用于 Browser Use runtime 边界，不进入 v4 wire envelope。 */
  clientMode?: IdexalTaskClientMode;
}

export interface IdexalAgentCommandsQueryParams extends IdexalAgentWorkspaceTarget {
  clock?: true;
  commands: CommandKey[];
}

/** UI 不携带 connectionId；connection scope 以 trusted carrier 注入 wire identity。 */
export interface IdexalAgentAttachmentBeginParams extends IdexalAgentSessionTarget {
  uploadId: string;
  fileName: string;
  mime: string;
  totalBytes: number;
  totalChunks: number;
  checksum: string;
}

export interface IdexalAgentAttachmentChunkParams extends IdexalAgentSessionTarget {
  uploadId: string;
  chunkIndex: number;
  dataBase64: string;
}

export interface IdexalAgentAttachmentTerminalParams extends IdexalAgentSessionTarget {
  uploadId: string;
}

export interface IdexalAgentAttachmentReadParams extends IdexalAgentSessionTarget {
  ref: string;
  target?: ConversationRowTarget;
  attachmentIndex?: number;
  offset: number;
  limit: number;
}

export interface IdexalAgentConversationAttachmentReadParams extends IdexalAgentSessionTarget {
  ref: string;
  target: ConversationRowTarget;
  attachmentIndex: number;
  offset: number;
  limit: number;
}

export interface IdexalAgentConversationAttachmentStatParams extends IdexalAgentSessionTarget {
  ref: string;
  target: ConversationRowTarget;
  attachmentIndex: number;
}

export interface IdexalAgentAttachmentPreviewSourceParams extends IdexalAgentSessionTarget {
  ref: string;
  target?: ConversationRowTarget;
  attachmentIndex?: number;
}

/** host scope 内部 transport 控制面；connectionId 只能经 trusted carrier 注入。 */
export interface IdexalAgentConnectionFlowParams extends IdexalAgentWorkspaceTarget {
  state: V4ConnectionFlowState;
}

/** sessions-index：workspace 级列表订阅（无 sessionId 维度）。 */
export interface IdexalAgentSessionsIndexSubscribeParams extends IdexalAgentWorkspaceTarget {
  base?: { logEpoch: string; seq: number };
  visibility?: "foreground" | "background";
  /**
   * 订阅者作用域后缀：CLI 侧重订阅替换按 (connectionId, topic) 判定，
   * host 进程内多个独立消费者（renderer 侧栏 / task-index syncer）订阅同一 topic 时
   * 必须用不同 connectionId，否则互相替换对方的订阅代际。缺省共享 host 连接 id。
   */
  subscriberScope?: string;
  /**
   * task-list 等被动观察者必须使用 existing-only；runtime 不存在时返回稳定 unavailable，
   * 禁止为了建立列表订阅而启动 Agent。缺省保持显式会话入口的旧行为。
   */
  runtimePolicy?: IdexalAgentRuntimePolicy;
}

/** workspace-config：workspace 级配置目录订阅（config options + slash 目录）。 */
export interface IdexalAgentWorkspaceConfigSubscribeParams extends IdexalAgentWorkspaceTarget {
  base?: { logEpoch: string; seq: number };
  visibility?: "foreground" | "background";
  subscriberScope?: string;
  runtimePolicy?: IdexalAgentRuntimePolicy;
}

export type IdexalAgentServiceEvent =
  | { type: "session.event"; event: IdexalSessionEvent }
  | { type: "state.updated"; notification: IdexalStateUpdatedNotification }
  | { type: "permission.request"; request: IdexalPermissionRequestParams }
  | { type: "userInput.request"; request: IdexalUserInputRequestParams }
  | {
      type: "userInput.response";
      requestId: string;
      response: IdexalUserInputResponse;
    }
  | { type: "snapshot"; snapshot: IdexalSessionStateSnapshot };

export interface IdexalAgentAppRuntimePreferences {
  askUserQuestionAutoResolutionEnabled: boolean;
  modelIoFullRetentionEnabled?: boolean;
}

export interface IdexalAgentLocalRuntimeChildProcesses {
  pid: number;
  provider: string;
  workspacePath: string;
  lane?: string;
  children: IdexalProcessChildProcess[];
}

export interface IdexalAgentStorageStartupSnapshot {
  generation: number;
  state: IdexalStorageStartupState | null;
}

export interface IIdexalAgentService {
  /** 控制面不需要账号或模型，且不发送普通协议请求。 */
  prepareStorage(params: IdexalAgentWorkspaceTarget): Promise<void>;
  getStorageStartupState(
    params: IdexalAgentWorkspaceTarget,
  ): Promise<IdexalAgentStorageStartupSnapshot | null>;
  onDynamicStorageStartupState(
    params: IdexalAgentWorkspaceTarget,
  ): Event<IdexalAgentStorageStartupSnapshot>;
  initialize(params: IdexalAgentWorkspaceTarget): Promise<IdexalAgentInitializeResult>;
  /**
   * 同步 App 全局运行时偏好到所有已活动 workspace；不得为此启动空闲 Agent。
   */
  syncAppRuntimePreferences(preferences: IdexalAgentAppRuntimePreferences): Promise<void>;
  getWorkspaceRuntimeIdentity(
    params: IdexalAgentWorkspaceTarget,
  ): Promise<IdexalAgentWorkspaceRuntimeIdentity>;
  createSession(params: IdexalAgentCreateSessionParams): Promise<IdexalSessionStateSnapshot>;
  resumeSession(params: IdexalAgentResumeSessionParams): Promise<IdexalSessionStateSnapshot>;
  listSessions(params: IdexalAgentListSessionsParams): Promise<IdexalSessionInfo[]>;
  listSessionSubagents(
    params: IdexalAgentListSessionSubagentsParams,
  ): Promise<IdexalSessionSubagentsResult>;
  getAppUsageStats(params: IdexalAgentAppUsageParams): Promise<AppUsageSnapshot>;
  getTaskTokenUsage(params: IdexalAgentTaskTokenUsageParams): Promise<IdexalTaskTokenUsageResult>;
  readSession(params: IdexalAgentReadSessionParams): Promise<IdexalSessionStateSnapshot>;
  readSessionMessages(
    params: IdexalAgentReadSessionMessagesParams,
  ): Promise<IdexalMessageWithParts[]>;
  readSessionDebug(params: IdexalAgentSessionTarget): Promise<SessionDebugSnapshot>;
  readSessionEvents(params: IdexalAgentReadSessionEventsParams): Promise<IdexalSessionEvent[]>;
  readWorkspacePresentation(
    params: IdexalAgentReadWorkspacePresentationParams,
  ): Promise<IdexalWorkspacePresentation>;
  /** 无 task/session 的 Settings 预信任；Agent 会重新发现并校验 canonical snapshot。 */
  grantWorkspaceHookTrust(
    params: IdexalAgentGrantWorkspaceHookTrustParams,
  ): Promise<IdexalWorkspaceHookTrustGrantResult>;
  listMcpServerStatuses(
    params: IdexalAgentListMcpServerStatusesParams,
  ): Promise<IdexalMcpListResult>;
  listPlugins(params: IdexalAgentPluginViewParams): Promise<IdexalPluginsListResult>;
  /**
   * Plugin 对话引用 catalog：session-scoped 只读投影。
   * 走 workspace 级 agent client（session 记录只存在于该进程），不走独立插件管理进程。
   */
  getPluginReferenceCatalog(
    params: IdexalAgentPluginReferenceCatalogParams,
  ): Promise<IdexalPluginsReferenceCatalogResult>;
  /** Composer Skill 引用 catalog；带 sessionId 时读取该 runtime 的冻结快照。 */
  getSkillReferenceCatalog(
    params: IdexalAgentSkillReferenceCatalogParams,
  ): Promise<IdexalSkillsReferenceCatalogResult>;
  // 已保存工作流的 GUI 中枢：workspace 级、无会话，每次调用现扫 `<cwd>/.idexal/workflows/`。
  // 全局档传 `scope: "global"`：带 workspace 就用它当载体，不带则由 services 层自选本机载体运行时。
  listSavedWorkflows(
    params: IdexalAgentListSavedWorkflowsParams,
  ): Promise<IdexalWorkflowsListResult>;
  getSavedWorkflow(params: IdexalAgentGetSavedWorkflowParams): Promise<IdexalWorkflowsGetResult>;
  updateSavedWorkflowMeta(
    params: IdexalAgentUpdateSavedWorkflowMetaParams,
  ): Promise<IdexalWorkflowsUpdateMetaResult>;
  deleteSavedWorkflow(
    params: IdexalAgentDeleteSavedWorkflowParams,
  ): Promise<IdexalWorkflowsDeleteResult>;
  listSavedWorkflowRuns(
    params: IdexalAgentListSavedWorkflowRunsParams,
  ): Promise<IdexalWorkflowsRunsResult>;
  // 在项目档 / 全局档之间移动同名文件：
  // `workspace` 是载体（移到项目传目标项目、移到全局传源项目），`to` 是落点档；不覆盖已存在的目标。
  moveSavedWorkflow(params: IdexalAgentMoveSavedWorkflowParams): Promise<IdexalWorkflowsMoveResult>;
  resolveSuggestedPluginReference(
    params: IdexalAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@idexal/shared").IdexalPluginsResolveSuggestedReferenceResult>;
  /** 推荐项 Plugin 首次本地检查缺失后的 operation-scoped 刷新进度。 */
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<IdexalPluginOperationProgressNotification>;
  getPluginsOverview(params: IdexalAgentPluginViewParams): Promise<IdexalPluginsOverviewResult>;
  /**
   * 资源管理器：枚举本 Host 内全部本地 Agent 进程（含 plugin / mcp-status 泳道），
   * 并向每个存活 runtime 请求 `process/childProcesses`；单个 runtime 失败只让它的 children 为空。
   */
  collectLocalRuntimeChildProcesses(
    signal?: AbortSignal,
  ): Promise<IdexalAgentLocalRuntimeChildProcesses[]>;
  addPluginMarketplace(
    params: IdexalAgentAddPluginMarketplaceParams,
  ): Promise<IdexalPluginsMarketplaceMutationResult>;
  removePluginMarketplace(
    params: IdexalAgentRemovePluginMarketplaceParams,
  ): Promise<IdexalPluginsMarketplaceMutationResult>;
  updatePluginMarketplace(
    params: IdexalAgentUpdatePluginMarketplaceParams,
  ): Promise<IdexalPluginsMarketplaceMutationResult>;
  installPlugin(params: IdexalAgentInstallPluginParams): Promise<IdexalPluginsInstallResult>;
  cancelPluginOperation(
    params: IdexalAgentCancelPluginOperationParams,
  ): Promise<IdexalPluginsCancelOperationResult>;
  uninstallPlugin(params: IdexalAgentUninstallPluginParams): Promise<IdexalPluginsUninstallResult>;
  updatePlugin(params: IdexalAgentUpdatePluginParams): Promise<IdexalPluginsInstallResult>;
  restoreBuiltinPlugin(
    params: IdexalAgentRestoreBuiltinPluginParams,
  ): Promise<IdexalPluginsRestoreBuiltinResult>;
  configurePlugin(params: IdexalAgentConfigurePluginParams): Promise<IdexalPluginsConfigureResult>;
  resetPluginConfig(
    params: IdexalAgentResetPluginConfigParams,
  ): Promise<IdexalPluginsConfigureResult>;
  validatePlugin(params: IdexalAgentValidatePluginParams): Promise<IdexalPluginsValidateResult>;
  describePlugin(params: IdexalAgentDescribePluginParams): Promise<IdexalPluginsDescribeResult>;
  setPluginEnabled(
    params: IdexalAgentSetPluginEnabledParams,
  ): Promise<IdexalPluginsSetEnabledResult>;
  // ---- 定时任务(automation)管理 ----
  listAutomations(params: IdexalAgentWorkspaceTarget): Promise<IdexalAutomation[]>;
  listAllAutomations(): Promise<IdexalAutomation[]>;
  createAutomation(params: IdexalAgentCreateAutomationParams): Promise<IdexalAutomation>;
  updateAutomation(params: IdexalAgentUpdateAutomationParams): Promise<IdexalAutomation | null>;
  deleteAutomation(params: IdexalAgentAutomationIdParams): Promise<void>;
  setAutomationEnabled(params: IdexalAgentSetAutomationEnabledParams): Promise<void>;
  restartAutomation(params: IdexalAgentAutomationIdParams): Promise<void>;
  runAutomationNow(
    params: IdexalAgentAutomationIdParams,
  ): Promise<IdexalAgentRunAutomationNowResult>;
  listAutomationRuns(params: IdexalAgentAutomationIdParams): Promise<IdexalAutomationRun[]>;
  deleteAutomationRun(params: IdexalAgentDeleteAutomationRunParams): Promise<void>;
  generateWorkspaceText(
    params: IdexalAgentGenerateWorkspaceTextParams,
  ): Promise<IdexalWorkspaceGenerateTextResult>;
  testModelConnectivity(
    params: IdexalAgentTestModelConnectivityParams,
  ): Promise<IdexalProviderTestModelConnectivityResult>;
  /**
   * @deprecated：send 主路径已收敛 v4 sendText 命令。仅剩两个消费点——
   * adapter 带附件输入回退（待附件命令面落地后移除）与 idexalSessionService
   * pass-through；新代码禁止回用。
   */
  sendPrompt(params: IdexalAgentSendPromptParams): Promise<IdexalSessionSendResult>;
  compactSession(params: IdexalAgentCompactParams): Promise<IdexalSessionCompactResult>;
  goalSession(params: IdexalAgentGoalParams): Promise<IdexalSessionGoalResult>;
  closeSession(
    params: IdexalAgentSessionTarget & { expectedPersistence?: "deferred" | "immediate" },
  ): Promise<boolean>;
  setModel(params: IdexalAgentSetModelParams): Promise<IdexalSessionStateSnapshot>;
  setThoughtLevel(params: IdexalAgentSetThoughtLevelParams): Promise<IdexalSessionStateSnapshot>;
  setMode(params: IdexalAgentSetModeParams): Promise<IdexalSessionStateSnapshot>;
  respondSessionRuntimePreferences(
    params: IdexalAgentRespondSessionRuntimePreferencesParams,
  ): Promise<void>;
  onDynamicSessionRuntimePreferencesRequest(): Event<IdexalAgentSessionRuntimePreferencesRequest>;
  /**
   * CLI 进程级资源样本，带 services 打的 lane 标签（CLI 自己不知道 lane）。
   * 使用 dynamic event 避免 RPC 服务在无人订阅时缓冲周期事件；
   * 该事件不属于 session/conversation continuous 或 replayable 状态。
   */
  onDynamicProcessResourceSample(): Event<AgentLaneResourceSample>;
  /** MCP 进程生命周期与低频内存事件，仅供可信 Host relay 上报 ARMS。 */
  onDynamicMcpTelemetry(): Event<IdexalMcpTelemetryEvent>;
  /** MCP 进程树资源事实，只供可信 Host 汇总上报。 */
  onDynamicMcpResourceSamples(): Event<IdexalMcpResourceSample[]>;
  /** Bash 完成事实，仅可信 Host 资源旁路订阅。 */
  onDynamicToolExecResource(): Event<IdexalToolExecResource>;
  /**
   * @deprecated 旧协议订阅面（session/subscribe + session/event + state.updated）。
   * task-index syncer 已迁 v4 sessions-index/workspace-config 帧；
   * 仅剩 idexalTaskServiceAdapter.onDynamicTaskEvent（replayable 读路径）消费。
   * 写路径已收敛 v4 命令面；本订阅是读路径投影源。
   */
  onDynamicSessionEvent(params: IdexalAgentSessionSubscribeParams): Event<IdexalAgentServiceEvent>;
  // ── v4 conversation 通道（竖切）──
  /** RPC attachment 建立后先读取 host 可信 hello。 */
  helloConversationV4(): Promise<HelloMessage>;
  /** hello 校验后回送 clientHello；metadata 不能覆盖 connection mode/profile。 */
  initializeConversationV4(clientHello: ClientHello): Promise<void>;
  /** 仅供 trusted host relay/facade；terminal RPC caller 必须被 connection scope 拒绝。 */
  setConnectionFlowStateV4(params: IdexalAgentConnectionFlowParams): Promise<void>;
  subscribeConversationV4(
    params: IdexalAgentConversationSubscribeParams,
  ): Promise<V4ConversationSubscribeResult>;
  resyncConversationV4(
    params: IdexalAgentConversationResyncParams,
  ): Promise<V4ConversationResyncResult>;
  unsubscribeConversationV4(params: IdexalAgentConversationUnsubscribeParams): Promise<void>;
  /** rows/range 行分页 query（loadOlder 游标向上补历史）。 */
  conversationRowsRangeV4(
    params: IdexalAgentConversationRowsRangeParams,
  ): Promise<V4ConversationRowsRangeResult>;
  conversationPlansV4(
    params: IdexalAgentConversationPlansParams,
  ): Promise<V4ConversationPlansResult>;
  /** workflow run 事件日志分页；与 plans 同族（只读、无状态、超时重发安全）。 */
  conversationWorkflowRunEventsV4(
    params: IdexalAgentConversationWorkflowRunEventsParams,
  ): Promise<V4ConversationWorkflowRunEventsResult>;
  /** workflow run 枚举；journal-backed 的重启后发现面。 */
  conversationWorkflowRunsV4(
    params: IdexalAgentConversationWorkflowRunsParams,
  ): Promise<V4ConversationWorkflowRunsResult>;
  /** workflow run 的用户面产物清单；与 plans 同族（只读、无状态、超时重发安全）。 */
  conversationWorkflowRunArtifactsV4(
    params: IdexalAgentConversationWorkflowRunArtifactsParams,
  ): Promise<V4ConversationWorkflowRunArtifactsResult>;
  /** 预置看板的条目分页；hook 以 itemCount 变化为信号增量拉取。 */
  conversationWorkflowRunArtifactDataV4(
    params: IdexalAgentConversationWorkflowRunArtifactDataParams,
  ): Promise<V4ConversationWorkflowRunArtifactDataResult>;
  /** 内容产物的字节，一次一块；授权在 CLI 侧（journal 行才是取字节的依据）。 */
  conversationWorkflowRunArtifactReadV4(
    params: IdexalAgentConversationWorkflowRunArtifactReadParams,
  ): Promise<V4ConversationWorkflowRunArtifactReadResult>;
  /** dwf 工作区 transcript 的清单。 */
  conversationWorkflowRunWorkspaceV4(
    params: IdexalAgentConversationWorkflowRunWorkspaceParams,
  ): Promise<V4ConversationWorkflowRunWorkspaceResult>;
  /** 一个工作区节点的有界正文。 */
  conversationWorkflowRunNodeResultV4(
    params: IdexalAgentConversationWorkflowRunNodeResultParams,
  ): Promise<V4ConversationWorkflowRunNodeResultResult>;
  backgroundBashOutputV4(
    params: IdexalAgentBackgroundBashOutputParams,
  ): Promise<BackgroundBashOutputResult>;
  conversationFileChangesV4(
    params: IdexalAgentConversationFileChangesParams,
  ): Promise<V4ConversationFileChangesResult>;
  conversationFileRewindPreviewV4(
    params: IdexalAgentConversationFileRewindPreviewParams,
  ): Promise<V4ConversationFileRewindPreviewResult>;
  sendConversationCommandV4(params: IdexalAgentConversationCommandParams): Promise<CommandAck>;
  queryConversationCommandsV4(params: IdexalAgentCommandsQueryParams): Promise<CommandsQueryResult>;
  attachmentBeginV4(params: IdexalAgentAttachmentBeginParams): Promise<V4AttachmentBeginResult>;
  attachmentChunkV4(params: IdexalAgentAttachmentChunkParams): Promise<V4AttachmentChunkResult>;
  attachmentCommitV4(
    params: IdexalAgentAttachmentTerminalParams,
  ): Promise<V4AttachmentCommitResult>;
  attachmentAbortV4(params: IdexalAgentAttachmentTerminalParams): Promise<void>;
  /** Desktop local 已发送视频 source query；远端与 Web 返回 chunked。 */
  attachmentPreviewSourceV4(
    params: IdexalAgentAttachmentPreviewSourceParams,
  ): Promise<V4AttachmentPreviewSourceResult>;
  /** 已发送 image/video 只读分块查询；connection scope 注入可信 workspace 连接。 */
  attachmentReadV4(params: IdexalAgentAttachmentReadParams): Promise<V4AttachmentReadResult>;
  /** Share 读取 userInput 附件，允许 text/plain 等非媒体类型。 */
  conversationAttachmentReadV4(
    params: IdexalAgentConversationAttachmentReadParams,
  ): Promise<V4ConversationAttachmentReadResult>;
  /** Share 选择阶段只读 userInput 附件元数据，不读取完整内容。 */
  conversationAttachmentStatV4(
    params: IdexalAgentConversationAttachmentStatParams,
  ): Promise<V4ConversationAttachmentStatResult>;
  /** workspace 级下行帧流（v4/conversation/frame），renderer 侧按 topic 自行路由。 */
  onDynamicConversationFrame(
    params: IdexalAgentWorkspaceTarget,
  ): Event<ConversationTopicWireCandidate>;
  /** workspace 级 live telemetry 事实；connection facade 仅向可信 desktop-continuous 下游暴露。 */
  onDynamicLocalTtftFacts(
    params: IdexalAgentWorkspaceTarget,
  ): Event<import("@idexal/shared").LocalTtftFacts>;
  onDynamicConversationTelemetryFact(
    params: IdexalAgentWorkspaceTarget,
  ): Event<ConversationTelemetryFact>;
  /** 当前窗口全部本地 live task 的 CUA 权限观察；历史、远程与 replayable 不在此事件面。 */
  onDynamicCuaPermissionObservation(): Event<IdexalAgentCuaPermissionObservation>;
  // ── sessions-index 通道（列表活性）──
  subscribeSessionsIndexV4(
    params: IdexalAgentSessionsIndexSubscribeParams,
  ): Promise<V4SessionsIndexSubscribeResult>;
  resyncSessionsIndexV4(
    params: IdexalAgentConversationResyncParams,
  ): Promise<V4ConversationResyncResult>;
  unsubscribeSessionsIndexV4(params: IdexalAgentConversationUnsubscribeParams): Promise<void>;
  /** workspace 级 sessions-index 下行帧流（与 conversation 同一通知，按 topic 前缀分流）。 */
  onDynamicSessionsIndexFrame(
    params: IdexalAgentWorkspaceTarget,
  ): Event<SessionsIndexTopicWireCandidate>;
  // ── workspace-config 通道（配置目录活性；task-index syncer 消费）──
  subscribeWorkspaceConfigV4(
    params: IdexalAgentWorkspaceConfigSubscribeParams,
  ): Promise<V4WorkspaceConfigSubscribeResult>;
  resyncWorkspaceConfigV4(
    params: IdexalAgentConversationResyncParams,
  ): Promise<V4ConversationResyncResult>;
  unsubscribeWorkspaceConfigV4(params: IdexalAgentConversationUnsubscribeParams): Promise<void>;
  /** workspace 级 workspace-config 下行帧流（与 conversation 同一通知，按 topic 前缀分流）。 */
  onDynamicWorkspaceConfigFrame(
    params: IdexalAgentWorkspaceTarget,
  ): Event<WorkspaceConfigTopicWireCandidate>;
  /**
   * （CLI 重连重订）：agent 进程换代通知（超时回收/崩溃后重新拉起）。
   * v4 订阅活在 CLI 进程内存，进程换代即失效；订阅方（task-index syncer 等）
   * 收到后必须对该 workspaceKey 重发 subscribe，否则帧流静默中断。
   */
  onAgentRuntimeRestarted(listener: (event: { workspaceKey: string }) => void): IDisposable;
  /**
   * Agent client 在 service 内完成登记后发布 available，当前 client 关闭后发布 unavailable。
   * 这是被动 observer attach/detach 的唯一生命周期信号，不表达用户使用租约。
   */
  onAgentRuntimeLifecycle?: (
    listener: (event: IdexalAgentRuntimeLifecycleEvent) => void,
  ) => IDisposable;
  /** 当前 desktop-local CUA turn 是否仍在执行，用于 Helper recovery 避免中途回收 Agent。 */
  hasActiveCuaOperationTurn(): boolean;
  disposeWorkspace(params: IdexalAgentWorkspaceTarget): Promise<void>;
  disposeAll(): void;
}

export const IIdexalAgentService = createServiceDescriptor<IIdexalAgentService>(
  ServiceChannels.IdexalAgent,
);
