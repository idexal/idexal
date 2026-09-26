import type { TuiReadClipboardImage, TuiWriteClipboardText } from "@idexal/tui";
import type { UiLocale } from "@idexal/i18n";
import type { Logger } from "@idexal/contracts";
import type {
  createManagedCdpBrowserRuntime,
  ManagedCdpBrowserRuntimeOptions,
} from "@idexal/adapters/browser";
import type {
  createModelAdapter,
  createIdexalApp,
  CreateModelAdapterOptions,
  configureCodingPlanApiKey,
  ConfigureCodingPlanApiKeyOptions,
  inspectIdexalSkill,
  inspectWorkspaceHookTrust,
  grantWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
  inspectIdexalCustomCommand,
  InspectIdexalCustomCommandOptions,
  InspectIdexalSkillOptions,
  loginIdexalCli,
  loginBigmodelCodingPlan,
  LoginBigmodelCodingPlanOptions,
  LoginIdexalCliOptions,
  listIdexalCustomCommands,
  ListIdexalCustomCommandsOptions,
  loadIdexalCustomCommand,
  listIdexalSessions,
  listIdexalSkills,
  ListIdexalSessionsOptions,
  ListIdexalSkillsOptions,
  logoutIdexalCli,
  LogoutIdexalCliOptions,
  resolveLatestSession,
  ResolveLatestSessionOptions,
  RunIdexalProtocolAgentOptions,
  prepareIdexalTelemetryEnv,
  startProcessProviderRegistryRuntime,
  shutdownIdexalTelemetry,
  IdexalAppOptions,
} from "@idexal/bootstrap";
import type { CliEnv, DotenvLoadResult, LoadCliDotenvOptions } from "./env.js";
import type { PluginsCommandOverrides } from "./plugins-command.js";
import type { CliShutdownProcess } from "./shutdown.js";
import type { resolveWorkspaceGitBranch } from "./tui-workspace-git.js";

export type BootstrapModule = typeof import("@idexal/bootstrap");

export interface RunDependencies extends PluginsCommandOverrides {
  protocolLifecycle?: RunIdexalProtocolAgentOptions["lifecycle"];
  protocolInput?: NodeJS.ReadableStream;
  createManagedCdpBrowserRuntime?: (
    options?: ManagedCdpBrowserRuntimeOptions,
  ) => ReturnType<typeof createManagedCdpBrowserRuntime>;
  createModelAdapter?: (
    options?: CreateModelAdapterOptions,
  ) => ReturnType<typeof createModelAdapter>;
  createIdexalApp?: (
    options?: IdexalAppOptions,
  ) => Awaited<ReturnType<typeof createIdexalApp>> | ReturnType<typeof createIdexalApp>;
  /**
   * Session-event shaper for --output-format stream-json. Defaults to the
   * bootstrap module's, which is also what the protocol server uses; injectable
   * so a caller that supplies its own `createIdexalApp` (tests, embedders) can
   * still stream, since the bootstrap module is not loaded on that path.
   */
  mapSessionEvent?: BootstrapModule["mapSessionEvent"];
  cwd?: () => string;
  env?: CliEnv;
  inspectSkill?: (options: InspectIdexalSkillOptions) => ReturnType<typeof inspectIdexalSkill>;
  inspectWorkspaceHookTrust?: typeof inspectWorkspaceHookTrust;
  grantWorkspaceHookTrust?: typeof grantWorkspaceHookTrust;
  revokeWorkspaceHookTrustCli?: typeof revokeWorkspaceHookTrustCli;
  inspectCustomCommand?: (
    options: InspectIdexalCustomCommandOptions,
  ) => ReturnType<typeof inspectIdexalCustomCommand>;
  loginIdexalCli?: (options?: LoginIdexalCliOptions) => ReturnType<typeof loginIdexalCli>;
  loginBigmodelCodingPlan?: (
    options?: LoginBigmodelCodingPlanOptions,
  ) => ReturnType<typeof loginBigmodelCodingPlan>;
  configureCodingPlanApiKey?: (
    options: ConfigureCodingPlanApiKeyOptions,
  ) => ReturnType<typeof configureCodingPlanApiKey>;
  loadDotenv?: (options?: LoadCliDotenvOptions) => DotenvLoadResult;
  prepareIdexalTelemetryEnv?: typeof prepareIdexalTelemetryEnv;
  projectConfigPath?: string;
  listSessions?: (options: ListIdexalSessionsOptions) => ReturnType<typeof listIdexalSessions>;
  listCustomCommands?: (
    options: ListIdexalCustomCommandsOptions,
  ) => ReturnType<typeof listIdexalCustomCommands>;
  loadCustomCommand?: (
    options: InspectIdexalCustomCommandOptions,
  ) => ReturnType<typeof loadIdexalCustomCommand>;
  // headless slash 路由要和 app facade 的保留名 gate 用同一个判据；默认取 bootstrap 的，
  // 注入点只为让单测不必拉起整个 bootstrap 模块。见 prompt-command.ts。
  isReservedSlashCommandName?: BootstrapModule["isReservedIdexalSlashCommandName"];
  listSkills?: (options: ListIdexalSkillsOptions) => ReturnType<typeof listIdexalSkills>;
  logger?: Logger;
  readClipboardImage?: TuiReadClipboardImage;
  writeClipboardText?: TuiWriteClipboardText;
  resolveLatestSession?: (
    options: ResolveLatestSessionOptions,
  ) => ReturnType<typeof resolveLatestSession>;
  resolveWorkspaceGitBranch?: typeof resolveWorkspaceGitBranch;
  logoutIdexalCli?: (options?: LogoutIdexalCliOptions) => ReturnType<typeof logoutIdexalCli>;
  runIdexalProtocolAgent?: (options?: RunIdexalProtocolAgentOptions) => Promise<void>;
  runTui?: typeof import("@idexal/tui").runTui;
  skipUserConfig?: boolean;
  userConfigPath?: string;
  exitProcess?: (code: number) => void;
  shutdownCleanupTimeoutMs?: number;
  shutdownProcess?: CliShutdownProcess;
  startProcessProviderRegistryRuntime?: typeof startProcessProviderRegistryRuntime;
  shutdownIdexalTelemetry?: typeof shutdownIdexalTelemetry;
}

export type CliPermissionMode = "build" | "plan" | "edit" | "yolo";
export type CliRuntimeMode = CliPermissionMode | "auto";

export interface CliModeState {
  current?: CliRuntimeMode;
  override?: CliPermissionMode;
}

export interface CliTargetRequest {
  objective: string;
  replaceExisting: boolean;
}

export type ModeCapableApp = Awaited<ReturnType<typeof createIdexalApp>> & {
  getMode?: () => CliRuntimeMode;
  setLocale?: (locale: UiLocale) => Promise<{ locale: "en-US" | "zh-CN" }>;
  setMode?: (mode: CliRuntimeMode) => Promise<{ mode: CliRuntimeMode }>;
};

export interface CliResumeRequest {
  continueSession: boolean;
  resumeSessionId?: string;
}
