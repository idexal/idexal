// Bootstrap public API surface.

export * from "./app/create-app.js";
export type {
  ListIdexalSessionsOptions,
  PromptInput,
  ResolveLatestSessionOptions,
  ResumeOptions,
  RunIdexalProtocolAgentOptions,
  SendInputOptions,
  SendInputResult,
  SetLocaleResult,
  SteerTurnOptions,
  SubmitPromptOptions,
  UserPromptInput,
  IdexalApp,
  IdexalAppOptions,
  IdexalModelOption,
} from "./app/types.js";
export * from "./auth-login.js";
export {
  inspectIdexalCustomCommand,
  listIdexalCustomCommands,
  loadIdexalCustomCommand,
} from "./custom-commands.js";
export type {
  InspectIdexalCustomCommandOptions,
  ListIdexalCustomCommandsOptions,
  IdexalCustomCommandInspection,
} from "./custom-commands.js";
export { createModelAdapter } from "./model-factory.js";
export type { CreateModelAdapterOptions } from "./model-factory.js";
export { startProcessProviderRegistryRuntime } from "./app/process-provider-registry-runtime.js";
export type { ProcessProviderRegistryRuntimeOptions } from "./app/process-provider-registry-runtime.js";
export {
  addIdexalPluginMarketplace,
  getIdexalPluginsOverview,
  installIdexalMarketplacePlugin,
  listIdexalPlugins,
  removeIdexalPluginMarketplace,
  resolveIdexalPlugins,
  setIdexalPluginEnabled,
  uninstallIdexalMarketplacePlugin,
  updateIdexalMarketplacePlugin,
  updateIdexalPluginMarketplace,
  validateIdexalPluginPath,
} from "./plugins.js";
export type {
  AddIdexalMarketplaceOptions,
  InstallIdexalMarketplacePluginOptions,
  ListIdexalPluginsOptions,
  RemoveIdexalMarketplaceOptions,
  ResolveIdexalPluginsOptions,
  SetIdexalPluginEnabledOptions,
  SetIdexalPluginEnabledResult,
  UninstallIdexalMarketplacePluginOptions,
  UpdateIdexalMarketplaceOptions,
  UpdateIdexalMarketplacePluginOptions,
  ValidateIdexalPluginPathOptions,
  IdexalAvailablePluginData,
  IdexalInstalledPluginData,
  IdexalMarketplaceSummaryData,
  IdexalMarketplaceUpdateData,
  IdexalPluginInstallData,
  IdexalPluginUpdateData,
  IdexalPluginsOverviewData,
} from "./plugins.js";
export { runIdexalProtocolAgent } from "./idexal-protocol-entrypoint.js";
// Exposed for the CLI's --output-format stream-json: it needs the same event
// shape the protocol server emits, rather than inventing a second one.
export { mapSessionEvent } from "./idexal-protocol/session-mapper.js";
export { prepareIdexalTelemetryEnv, shutdownIdexalTelemetry } from "./telemetry-bootstrap.js";
export type { SessionTranscriptMessage, SessionTranscriptPart } from "./session-transcript.js";
export { listIdexalSessions, resolveLatestSession } from "./sessions.js";
export { inspectIdexalSkill, listIdexalSkills } from "./skills.js";
export type {
  InspectIdexalSkillOptions,
  ListIdexalSkillsOptions,
  IdexalSkillInspection,
} from "./skills.js";
// Exposed for the CLI's headless slash routing: it must decide "is this a real
// custom command?" with the *same* reserved-name gate the app facade's
// customCommandPromptResolver applies, or the two disagree and a reserved name
// reaches the model as literal prompt text. See prompt-command.ts.
export { isReservedIdexalSlashCommandName } from "./slash-command-surface.js";
export {
  grantWorkspaceHookTrust,
  inspectWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
} from "./workspace-hook-trust-cli.js";
export type {
  WorkspaceHookTrustCliItem,
  WorkspaceHookTrustCliStatus,
  WorkspaceHookTrustCliTarget,
} from "./workspace-hook-trust-cli.js";
