/* oxlint-disable eslint(max-lines) -- Idexal task 投影类型当前集中在单文件维护，新增 workspace 事件先保持就近声明。 */
// ── 旧协议兼容面（过渡期）──────────────────────────────
// 剩余 29 个导出：workspace 预热/workspace 事件、turn steer 结果、session binding/import、
// trace/input/query id 工厂函数、IdexalError、IdexalTaskCreateResult 等。
// 消费者：services 旧栈（idexalAgentService/idexalTaskServiceAdapter/idexalTaskService）、
// UI 旧 store/投影。明星承重类型（IdexalTaskMeta/IdexalStreamEvent/IdexalTaskSnapshot 等）
// 已迁 idexal-task-types-core.ts（幸存面）。本文件与旧 task service 组同生命周期。
import { createUuid } from "./uuid.js";
import type {
  TaskRealtimeReason,
  TraceId,
  InputId,
  QueryId,
  IdexalTaskGoal,
  IdexalProvider,
  IdexalConfigOption,
  IdexalSlashCommand,
  IdexalTaskMeta,
  IdexalTaskRuntimeCommand,
  IdexalTaskRuntimeCommandStatus,
  IdexalTaskSnapshotBodyField,
  IdexalTaskSnapshotToolField,
  IdexalTaskSnapshotFileContentField,
  IdexalPersistedToolCall,
} from "./idexal-task-types-core.js";

/** 生成 traceId；保留旧函数名兼容已有调用，格式对齐 agent 的 UUID trace。 */
export function generateTraceId(_taskId: string): TraceId {
  return createUuid();
}

/** 创建 Idexal session 级观测 traceId；后续 prompt 只继承，不重新生成。 */
export function createSessionTraceId(): TraceId {
  return createUuid();
}

export function createInputId(): InputId {
  return createUuid();
}

export function createQueryId(): QueryId {
  return createUuid();
}

/** cron 定时任务生成的 session 默认归入的系统分组固定 id。 */
export const CRON_DEFAULT_GROUP_ID = "idexal-default-group-cron";

/** 闲时任务已派发会话默认归入的系统分组固定 id（与 cron 分组同构）。 */
export const OFF_PEAK_DEFAULT_GROUP_ID = "idexal-default-group-off-peak";

type CronTaskIdentity = Pick<IdexalTaskMeta, "cronAutomationId"> & {
  automationId?: string;
};

/** 判断一个 task/session 是否由定时任务触发产生。 */
export function isCronTask(task: CronTaskIdentity): boolean {
  // 持久化 task meta 使用 cronAutomationId；但运行态派发/旧链路里字段名是 automationId。
  // UI 只看前者会让新创建或刚恢复的定时任务暂时没有 icon。
  return Boolean(task.cronAutomationId || task.automationId);
}

/** 判断一个 task/幻影行是否属于闲时任务（只看持久 meta 标记，UI 不反查 off-peak store）。 */
export function isOffPeakTask(task: Pick<IdexalTaskMeta, "offPeakTaskId">): boolean {
  return Boolean(task.offPeakTaskId);
}

// ---- Idexal Provider ----
export type IdexalTaskTarget = IdexalTaskGoal;
// ---- Idexal task 模式 ----
// ---- Idexal 运行时状态 ----

/** workspace 级 Idexal 初始化状态 */
export type IdexalWorkspaceInitStatus = "idle" | "initializing" | "ready" | "failed";

/** 预热 workspace 时返回的结果 */
export interface IdexalWorkspacePrepareResult {
  workspacePath: string;
  preparedSessionId: string;
  version?: string;
  provider: IdexalProvider;
  /** session/new 返回的初始 configOptions，预热阶段就推到 UI 让用户提前选择模型 */
  configOptions?: IdexalConfigOption[];
  /** 预热 session 已经广播出来的 slash commands，草稿态也可以直接拿来展示 */
  slashCommands?: IdexalSlashCommand[];
}

// ---- Task 元数据 ----

/** createTask 的返回结果；在持久化元信息之外，补充首屏渲染需要的临时初始化数据。 */
export interface IdexalTaskCreateResult extends IdexalTaskMeta {
  /** createTask 时就能拿到的首批 slash commands，避免 UI 订阅建立前丢掉初始化命令。 */
  initialSlashCommands?: IdexalSlashCommand[];
}

/** 外部原生 session 导入的来源 provider；与 agent runtime 的 IdexalProvider 解耦，当前仅 Claude Code。 */
export type IdexalImportSessionSourceProvider = "claude";

/** 外部原生 session 的导入候选。 */
export interface IdexalImportableSessionCandidate {
  provider: IdexalImportSessionSourceProvider;
  sessionId: string;
  workspacePath: string;
  sourcePath: string;
  updatedAt: number;
  createdAt?: number;
  previewTitle?: string;
}

export interface IdexalImportedSessionResultItem {
  provider: IdexalImportSessionSourceProvider;
  sessionId: string;
  taskId: string;
  workspacePath: string;
}

export interface IdexalImportedSessionSkippedItem {
  provider: IdexalImportSessionSourceProvider;
  sessionId: string;
  reason: string;
  workspacePath?: string;
}

export interface IdexalImportSessionsResult {
  imported: IdexalImportedSessionResultItem[];
  skipped: IdexalImportedSessionSkippedItem[];
  failed: IdexalImportedSessionSkippedItem[];
}

// ---- Idexal 配置与命令类型 ----
// ---- Idexal 流式事件（Host → Renderer） ----
// ---- 新增流式事件类型 ----

export interface IdexalEnqueueTaskCommandResult {
  accepted: true;
  command: IdexalTaskRuntimeCommand;
}

export interface IdexalCancelTaskCommandResult {
  canceled: boolean;
  commandId: string;
  status?: IdexalTaskRuntimeCommandStatus;
  reason?: "not_found" | "already_running";
}

// ---- Workspace 级别事件（预热阶段、task 创建前的异步通知） ----

/**
 * Workspace 级别事件，用于在 task 创建前把 Idexal Agent 异步推送的
 * 通知（如 slash commands、configOptions）实时传递到 UI。
 *
 * 与 IdexalStreamEvent 的区别：IdexalStreamEvent 绑定到具体 taskId，
 * IdexalWorkspaceEvent 绑定到 workspacePath，覆盖 task 创建前的空档期。
 */
export type IdexalWorkspaceEvent =
  | IdexalWorkspaceSlashCommandsUpdate
  | IdexalWorkspaceConfigOptionsUpdate
  | IdexalWorkspaceTaskListChanged
  | IdexalWorkspaceSessionMessageSendRequested;

export interface IdexalWorkspaceSlashCommandsUpdate {
  type: "workspace_slash_commands_update";
  workspacePath: string;
  /**
   * 远程 workspace 的 / 命令属于身份隔离状态，不能只靠 workspacePath 分发。
   * 同一路径可能来自不同 SSH/WSL/Docker session，带上 workspaceIdentity 后 service/UI 才能按 workspaceKey 收敛。
   */
  workspaceIdentity?: string;
  commands: IdexalSlashCommand[];
}

export interface IdexalWorkspaceConfigOptionsUpdate {
  type: "workspace_config_options_update";
  workspacePath: string;
  /**
   * 预热配置同样是 workspace 级身份状态，远程场景必须随事件传递 workspaceIdentity。
   */
  workspaceIdentity?: string;
  configOptions: IdexalConfigOption[];
}

export interface IdexalWorkspaceTaskListChanged {
  type: "workspace_task_list_changed";
  workspacePath: string;
  workspaceIdentity?: string;
  taskId?: string;
  reason: "auto_archive" | "realtime_sync" | TaskRealtimeReason;
  taskMeta?: IdexalTaskMeta;
  /** Host 已确认该终态应制造后台未读；普通 status/resume/snapshot 收敛不得携带。 */
  unreadSignal?: "background_terminal";
}

export interface IdexalWorkspaceSessionMessageSendRequested {
  type: "workspace_session_message_send_requested";
  workspacePath: string;
  workspaceIdentity?: string;
  request: {
    content: string;
    createdAt: string;
    fromSessionId: string;
    messageId: string;
    requestId: string;
    toSessionId: string;
  };
}

// ---- 错误 ----

export interface IdexalError {
  code: string;
  message: string;
  traceId?: TraceId;
  taskId?: string;
}

// ---- 持久化格式 ----

export interface IdexalTaskSnapshotBody {
  refId: string;
  field: IdexalTaskSnapshotBodyField;
  content: string;
  hash: string;
  fullBytes: number;
}

export type IdexalTaskSnapshotRefKind = "tool_field" | "file_change_field";

export interface IdexalTaskSnapshotRefContent {
  kind: IdexalTaskSnapshotRefKind;
  refId: string;
  field: IdexalTaskSnapshotToolField | IdexalTaskSnapshotFileContentField;
  content: unknown;
  hash: string;
  fullBytes: number;
}

export interface IdexalTaskSnapshotToolCallsSlice {
  taskId: string;
  messageIndex: number;
  totalTools: number;
  startToolIndex: number;
  endToolIndexExclusive: number;
  tools: IdexalPersistedToolCall[];
}
