// 平台能力面收敛：设置页「插件管理」的薄服务接口。
//
// 背景：pluginManagementStore / usePluginUninstall 过去直接注入 IIdexalAgentService，
// UI 层因此散布 13 个 plugins/* 旧协议词的消费点。收敛为独立薄 service 后，UI 只依赖
// 本接口；plugins/* 词表的 host 侧消费点收拢到 pluginManagementService 一处（插件的
// 事实源在 idexal-cli 进程，服务实现仍经 agent 协议往返——plugins 词表的收口归属
// 插件能力面自身的协议演进，不在会话 v4 词表范围内）。
// 注意与既有 IPluginsService（已 retired 的 marketplace pluginStore 通道）区分：
// 那套接口按 pluginName+marketplace 寻址且方法语义过时，不复用避免签名冲突。
import type { Event } from "@idexal/rpc";
import type {
  IdexalPluginOperationProgressNotification,
  IdexalPluginsConfigureResult,
  IdexalPluginsCancelOperationResult,
  IdexalPluginsDescribeResult,
  IdexalPluginsInstallResult,
  IdexalPluginsListResult,
  IdexalPluginsMarketplaceMutationResult,
  IdexalPluginsOverviewResult,
  IdexalPluginsReferenceCatalogResult,
  IdexalPluginsRestoreBuiltinResult,
  IdexalPluginsSetEnabledResult,
  IdexalPluginsUninstallResult,
  IdexalPluginsValidateResult,
} from "@idexal/shared";
import { ServiceChannels } from "@idexal/shared";
import { createServiceDescriptor } from "../descriptors.js";
import type {
  IdexalAgentAddPluginMarketplaceParams,
  IdexalAgentConfigurePluginParams,
  IdexalAgentCancelPluginOperationParams,
  IdexalAgentDescribePluginParams,
  IdexalAgentInstallPluginParams,
  IdexalAgentPluginReferenceCatalogParams,
  IdexalAgentResolveSuggestedPluginReferenceParams,
  IdexalAgentResetPluginConfigParams,
  IdexalAgentPluginViewParams,
  IdexalAgentRemovePluginMarketplaceParams,
  IdexalAgentRestoreBuiltinPluginParams,
  IdexalAgentSetPluginEnabledParams,
  IdexalAgentUninstallPluginParams,
  IdexalAgentUpdatePluginMarketplaceParams,
  IdexalAgentUpdatePluginParams,
  IdexalAgentValidatePluginParams,
} from "../idexal-agent/idexalAgentPluginParams.js";

export interface IPluginManagementService {
  listPlugins(params: IdexalAgentPluginViewParams): Promise<IdexalPluginsListResult>;
  /**
   * Plugin 对话引用 catalog：
   * 带 sessionId → session-owned 冻结 catalog；不带 → workspace 当前 catalog。
   * 实现路由到 workspace 级 agent client，不走插件管理独立进程。
   */
  getPluginReferenceCatalog(
    params: IdexalAgentPluginReferenceCatalogParams,
  ): Promise<IdexalPluginsReferenceCatalogResult>;
  resolveSuggestedPluginReference(
    params: IdexalAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@idexal/shared").IdexalPluginsResolveSuggestedReferenceResult>;
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<IdexalPluginOperationProgressNotification>;
  getPluginsOverview(params: IdexalAgentPluginViewParams): Promise<IdexalPluginsOverviewResult>;
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
}

export const IPluginManagementService = createServiceDescriptor<IPluginManagementService>(
  ServiceChannels.PluginManagement,
);
