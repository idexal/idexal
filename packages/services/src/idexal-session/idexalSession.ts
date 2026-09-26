import { ServiceChannels } from "@idexal/shared";
import type {
  TraceId,
  IdexalAgentMcpServer,
  IdexalDeliveryKind,
  IdexalMessageWithParts,
  ModelSelection,
  IdexalPermissionRequestParams,
  IdexalUserInputRequestParams,
  IdexalUserInputResponse,
  IdexalSessionInfo,
  IdexalSessionImportHistory,
  IdexalSessionEvent,
  IdexalSessionMode,
  IdexalSessionPersistence,
  IdexalSessionStateSnapshot,
  IdexalStateUpdatedNotification,
  IdexalWorkspacePresentation,
} from "@idexal/shared";
import { createServiceDescriptor } from "#src/descriptors.js";

export interface IdexalSessionWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
}

export type IdexalSessionReadWorkspacePresentationParams = IdexalSessionWorkspaceTarget;

export interface IdexalTaskTarget extends IdexalSessionWorkspaceTarget {
  sessionId: string;
}

export interface IdexalSessionCreateParams extends IdexalSessionWorkspaceTarget {
  /** 仅导入事务使用的预分配 ID；普通新会话继续由 Agent 分配。 */
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: IdexalSessionMode;
  model?: ModelSelection;
  persistence?: IdexalSessionPersistence;
  thoughtLevel?: string;
  mcpServers?: IdexalAgentMcpServer[];
  importedHistory?: IdexalSessionImportHistory;
}

export interface IdexalSessionResumeParams extends IdexalTaskTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: IdexalAgentMcpServer[];
  /**
   * 默认广播 resume 得到的历史快照，并让 shadow 订阅请求初始 snapshot。
   * 续聊发送前的 runtime 预恢复会关闭它，避免旧终态快照覆盖本地已开始的新输入运行态。
   */
  broadcastSnapshot?: boolean;
}

export interface IdexalSessionListParams extends IdexalSessionWorkspaceTarget {
  includeArchived?: boolean;
  limit?: number;
}

export interface IdexalSessionReadParams extends IdexalTaskTarget {
  deliveryKind?: IdexalDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
}

export interface IdexalSessionMessagesParams extends IdexalTaskTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface IdexalSessionEventsParams extends IdexalTaskTarget {
  afterSeq?: number;
  limit?: number;
}

export interface IdexalSessionSetModelParams extends IdexalTaskTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface IdexalSessionSetThoughtLevelParams extends IdexalTaskTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface IdexalSessionSetModeParams extends IdexalTaskTarget {
  mode: IdexalSessionMode;
  expectedRevision?: number;
}

export interface IdexalSessionSubscribeParams extends IdexalTaskTarget {
  deliveryKind: IdexalDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

export type IdexalSessionServiceEvent =
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

export interface IdexalSessionInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface IdexalSessionWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export interface IIdexalSessionService {
  initializeWorkspace(params: IdexalSessionWorkspaceTarget): Promise<IdexalSessionInitializeResult>;
  getWorkspaceRuntimeIdentity(
    params: IdexalSessionWorkspaceTarget,
  ): Promise<IdexalSessionWorkspaceRuntimeIdentity>;
  readWorkspacePresentation(
    params: IdexalSessionReadWorkspacePresentationParams,
  ): Promise<IdexalWorkspacePresentation>;
  createSession(params: IdexalSessionCreateParams): Promise<IdexalSessionStateSnapshot>;
  resumeSession(params: IdexalSessionResumeParams): Promise<IdexalSessionStateSnapshot>;
  listSessions(params: IdexalSessionListParams): Promise<IdexalSessionInfo[]>;
  readSession(params: IdexalSessionReadParams): Promise<IdexalSessionStateSnapshot>;
  readSessionMessages(params: IdexalSessionMessagesParams): Promise<IdexalMessageWithParts[]>;
  readSessionEvents(params: IdexalSessionEventsParams): Promise<IdexalSessionEvent[]>;
  promoteDeferredDraftSession(params: IdexalTaskTarget): Promise<void>;
  closeSession(params: IdexalTaskTarget): Promise<void>;
  closeDeferredDraftSession(params: IdexalTaskTarget): Promise<boolean>;
  setModel(params: IdexalSessionSetModelParams): Promise<IdexalSessionStateSnapshot>;
  setThoughtLevel(params: IdexalSessionSetThoughtLevelParams): Promise<IdexalSessionStateSnapshot>;
  setMode(params: IdexalSessionSetModeParams): Promise<IdexalSessionStateSnapshot>;
  // renderer 订阅面走 agentService 的 conversation/sessions-index 帧通道。
}

export const IIdexalSessionService = createServiceDescriptor<IIdexalSessionService>(
  ServiceChannels.IdexalSession,
);
