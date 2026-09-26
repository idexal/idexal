import type {
  IdexalAgentMcpServer,
  IdexalAutomationScheduleRule,
  IdexalMcpListMode,
  ModelSelection,
} from "@idexal/shared";

export interface IdexalAgentWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  /** 远程 workspace 的运行时会话身份；只用于隔离/路由，不能替代 workspacePath。 */
  remoteSessionId?: string;
}

export interface IdexalAgentPluginViewParams extends IdexalAgentWorkspaceTarget {
  configScope?: "user" | "workspace";
}

export interface IdexalAgentListMcpServerStatusesParams extends IdexalAgentWorkspaceTarget {
  mcpServers?: IdexalAgentMcpServer[];
  mode?: IdexalMcpListMode;
}

export interface IdexalAgentAddPluginMarketplaceParams extends IdexalAgentWorkspaceTarget {
  dryRun?: boolean;
  operationId?: string;
  source: string;
}

export interface IdexalAgentRemovePluginMarketplaceParams extends IdexalAgentWorkspaceTarget {
  marketplace: string;
}

export interface IdexalAgentUpdatePluginMarketplaceParams extends IdexalAgentWorkspaceTarget {
  marketplace?: string;
  operationId?: string;
}

export interface IdexalAgentInstallPluginParams extends IdexalAgentWorkspaceTarget {
  dryRun?: boolean;
  marketplace: string;
  operationId?: string;
  pluginName: string;
  scope?: "user" | "workspace";
}

export interface IdexalAgentCancelPluginOperationParams {
  operationId: string;
}

export interface IdexalAgentUninstallPluginParams extends IdexalAgentWorkspaceTarget {
  marketplace?: string;
  pluginId?: string;
  pluginName?: string;
  removeCache?: boolean;
}

export interface IdexalAgentUpdatePluginParams extends IdexalAgentWorkspaceTarget {
  pluginId?: string;
  marketplace?: string;
}

export interface IdexalAgentRestoreBuiltinPluginParams extends IdexalAgentWorkspaceTarget {
  pluginId: string;
}

export interface IdexalAgentConfigurePluginParams extends IdexalAgentWorkspaceTarget {
  clearOptionKeys?: string[];
  dryRun?: boolean;
  options: Record<string, unknown>;
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface IdexalAgentResetPluginConfigParams extends IdexalAgentWorkspaceTarget {
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface IdexalAgentValidatePluginParams extends IdexalAgentWorkspaceTarget {
  marketplace?: string;
  pluginName?: string;
  source?: string;
}

export interface IdexalAgentDescribePluginParams extends IdexalAgentWorkspaceTarget {
  marketplace: string;
  pluginName: string;
}

export interface IdexalAgentSetPluginEnabledParams extends IdexalAgentWorkspaceTarget {
  enabled: boolean;
  operationId?: string;
  pluginId: string;
  scope?: "user" | "workspace";
}

// Plugin 对话引用 catalog：
// 带 sessionId → session-owned 冻结 catalog（必须路由到持有该 session 的 workspace client）；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。
export interface IdexalAgentPluginReferenceCatalogParams extends IdexalAgentWorkspaceTarget {
  sessionId?: string;
}

// Composer Skill catalog：与 Plugin 引用相同，以 sessionId 区分 workspace 当前目录和
// resident Session runtime 快照；不参与 Settings 管理目录。
export interface IdexalAgentSkillReferenceCatalogParams extends IdexalAgentWorkspaceTarget {
  sessionId?: string;
}
export interface IdexalAgentResolveSuggestedPluginReferenceParams extends IdexalAgentWorkspaceTarget {
  stableId: string;
  operationId: string;
  clientMode: "desktop-continuous" | "web-remote-replayable";
  deliveryKind: "desktop-continuous" | "web-remote-replayable";
}

// ---- 定时任务(automation)管理参数 ----

export interface IdexalAgentCreateAutomationParams extends IdexalAgentWorkspaceTarget {
  title: string;
  cronExpr: string;
  relativeDelayMinutes?: number;
  prompt: string;
  modelSelection?: ModelSelection;
  mode?: string;
  recurring?: boolean;
  maxRuns?: number;
  endAt?: number;
  scheduleRule?: IdexalAutomationScheduleRule;
}

export interface IdexalAgentUpdateAutomationParams extends IdexalAgentWorkspaceTarget {
  automationId: string;
  title?: string;
  cronExpr?: string;
  prompt?: string;
  modelSelection?: ModelSelection | null;
  mode?: string | null;
  recurring?: boolean;
  maxRuns?: number | null;
  endAt?: number | null;
  scheduleRule?: IdexalAutomationScheduleRule | null;
  scheduleEditedByUser?: boolean;
}

export interface IdexalAgentAutomationIdParams extends IdexalAgentWorkspaceTarget {
  automationId: string;
}

export interface IdexalAgentSetAutomationEnabledParams extends IdexalAgentWorkspaceTarget {
  automationId: string;
  enabled: boolean;
}

export interface IdexalAgentDeleteAutomationRunParams extends IdexalAgentWorkspaceTarget {
  runId: string;
}
