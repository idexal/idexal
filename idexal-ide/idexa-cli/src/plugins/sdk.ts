/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              IDEXA CLI PLUGIN SDK v1.0                         ║
 * ║    Types, interfaces, and hooks for the plugin system          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Command } from 'commander'

// ── Plugin Manifest ───────────────────────────────────────────

export interface PluginManifest {
  /** Unique plugin identifier (e.g., "idexa-lint-checker") */
  name: string
  /** Semver version string */
  version: string
  /** Human-readable description */
  description: string
  /** Plugin author name or org */
  author: string
  /** SPDX license identifier */
  license?: string
  /** Plugin homepage URL */
  homepage?: string
  /** Repository URL */
  repository?: string
  /** Minimum idexa CLI version required */
  minVersion?: string
  /** Plugin categories for registry search */
  categories?: PluginCategory[]
  /** Keywords for search discoverability */
  keywords?: string[]
  /** Plugin icon (emoji or URL) */
  icon?: string
  /** Dependencies on other plugins */
  dependencies?: Record<string, string>
  /** Files to include */
  files?: string[]
  /** Entry point relative to plugin root */
  main?: string
}

export type PluginCategory =
  | 'ai'
  | 'linting'
  | 'formatting'
  | 'testing'
  | 'deployment'
  | 'database'
  | 'security'
  | 'performance'
  | 'productivity'
  | 'git'
  | 'docker'
  | 'monitoring'
  | 'documentation'
  | 'utilities'

// ── Plugin Context ────────────────────────────────────────────

export interface PluginContext {
  /** The Commander program instance for adding commands */
  program: Command
  /** Plugin's own storage directory (~/.idexa/plugins/<name>/) */
  pluginDir: string
  /** Global config accessor */
  config: {
    get<T = any>(key: string): T | undefined
    set(key: string, value: any): void
    has(key: string): boolean
  }
  /** Project root path */
  projectRoot: string
  /** Plugin logger (namespaced to plugin name) */
  logger: PluginLogger
  /** Emit an event to other plugins */
  emit(event: string, data?: any): void
  /** Listen for events from other plugins or the CLI */
  on(event: string, handler: (data: any) => void): () => void
  /** Read a file relative to the plugin directory */
  readFile(path: string): Promise<string>
  /** Write a file relative to the plugin directory */
  writeFile(path: string, content: string): Promise<void>
  /** Check if a file exists */
  fileExists(path: string): Promise<boolean>
  /** Execute a shell command */
  exec(cmd: string, args?: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>
  /** Prompt the user for input */
  prompt(question: string, options?: { type?: 'text' | 'confirm' | 'select'; choices?: string[] }): Promise<any>
  /** Show a progress indicator */
  progress(message: string): { update(msg: string): void; done(msg?: string): void; fail(msg?: string): void }
}

export interface PluginLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
  debug(message: string): void
  success(message: string): void
}

// ── Plugin Hooks ──────────────────────────────────────────────

export interface PluginHooks {
  /** Called when the plugin is first loaded */
  onLoad?(ctx: PluginContext): void | Promise<void>
  /** Called when the plugin is activated (enabled) */
  onActivate?(ctx: PluginContext): void | Promise<void>
  /** Called when the plugin is deactivated (disabled) */
  onDeactivate?(ctx: PluginContext): void | Promise<void>
  /** Called when the plugin is unloaded (removed) */
  onUnload?(ctx: PluginContext): void | Promise<void>
  /** Called before a command executes — can modify args or skip execution */
  beforeCommand?(command: string, args: string[], ctx: PluginContext): { args?: string[]; skip?: boolean } | void | Promise<{ args?: string[]; skip?: boolean } | void>
  /** Called after a command executes */
  afterCommand?(command: string, args: string[], result: any, ctx: PluginContext): void | Promise<void>
  /** Called when the CLI is about to exit */
  onExit?(ctx: PluginContext): void | Promise<void>
}

// ── Plugin Definition ─────────────────────────────────────────

export interface PluginDefinition {
  /** Plugin manifest (metadata) */
  manifest: PluginManifest
  /** Plugin hooks (lifecycle and events) */
  hooks?: PluginHooks
  /** Function to register commands */
  register?(ctx: PluginContext): void | Promise<void>
}

// ── Plugin Instance (runtime state) ───────────────────────────

export interface PluginInstance {
  /** The plugin definition */
  definition: PluginDefinition
  /** Whether the plugin is currently enabled */
  enabled: boolean
  /** Whether the plugin is currently loaded in memory */
  loaded: boolean
  /** Plugin installation directory */
  installPath: string
  /** Error message if the plugin failed to load */
  error?: string
  /** Timestamp when the plugin was last loaded */
  loadedAt?: number
}

// ── Plugin Registry ───────────────────────────────────────────

export interface RegistryPlugin {
  /** Plugin identifier */
  name: string
  /** Latest version */
  version: string
  /** Description */
  description: string
  /** Author */
  author: string
  /** Download count */
  downloads: number
  /** Rating (0-5) */
  rating: number
  /** Categories */
  categories: PluginCategory[]
  /** Keywords */
  keywords: string[]
  /** Icon */
  icon?: string
  /** Homepage */
  homepage?: string
  /** Repository */
  repository?: string
  /** Last updated timestamp */
  updatedAt: string
  /** License */
  license?: string
}

export interface RegistrySearchResult {
  plugins: RegistryPlugin[]
  total: number
  page: number
  pageSize: number
}

export interface RegistrySource {
  /** Registry name */
  name: string
  /** Registry base URL */
  url: string
  /** Whether this is the official registry */
  official: boolean
}

// ── Built-in Plugin Registry ──────────────────────────────────

export const DEFAULT_REGISTRY_SOURCES: RegistrySource[] = [
  {
    name: 'Idexal Official',
    url: 'https://registry.idexal.com/plugins',
    official: true,
  },
  {
    name: 'Community',
    url: 'https://community.idexal.com/plugins',
    official: false,
  },
]

// ── Plugin Events ─────────────────────────────────────────────

export type PluginEventType =
  | 'plugin:installed'
  | 'plugin:uninstalled'
  | 'plugin:enabled'
  | 'plugin:disabled'
  | 'plugin:loaded'
  | 'plugin:unloaded'
  | 'plugin:error'
  | 'command:executed'
  | 'ai:response'
  | 'file:changed'

export interface PluginEvent {
  type: PluginEventType
  plugin?: string
  data?: any
  timestamp: number
}

// ── Error Types ───────────────────────────────────────────────

export class PluginError extends Error {
  constructor(
    public pluginName: string,
    message: string,
    public code: string = 'PLUGIN_ERROR'
  ) {
    super(`[${pluginName}] ${message}`)
    this.name = 'PluginError'
  }
}

export class PluginNotFoundError extends PluginError {
  constructor(name: string) {
    super(name, `Plugin "${name}" not found`, 'PLUGIN_NOT_FOUND')
  }
}

export class PluginVersionError extends PluginError {
  constructor(name: string, required: string, actual: string) {
    super(name, `Requires idexa v${required}, running v${actual}`, 'PLUGIN_VERSION_MISMATCH')
  }
}

export class PluginDependencyError extends PluginError {
  constructor(name: string, dep: string) {
    super(name, `Missing dependency: "${dep}"`, 'PLUGIN_DEPENDENCY_MISSING')
  }
}
