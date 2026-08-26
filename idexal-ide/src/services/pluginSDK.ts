/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              IDEXAL PLUGIN DEVELOPER SDK v1.0                   ║
 * ║         Typed API for third-party extension development         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * This SDK provides the public API surface for building extensions
 * that add custom panels, commands, themes, language support, and
 * AI agents to the Idexal IDE.
 *
 * Usage:
 *   import { defineExtension, registerCommand, registerPanel } from '@idexal/sdk'
 *
 *   export default defineExtension({
 *     manifest: { id: 'my-ext', name: 'My Extension', ... },
 *     activate(ctx) {
 *       registerCommand(ctx, { id: 'my-cmd', ... })
 *       registerPanel(ctx, { id: 'my-panel', ... })
 *     },
 *   })
 */

// ── Types ──────────────────────────────────────────────

export interface ExtensionManifest {
  /** Unique extension identifier (e.g. 'my-company.my-extension') */
  id: string
  /** Display name */
  name: string
  /** Semver version */
  version: string
  /** Short description (max 200 chars) */
  description: string
  /** Extension author name or organization */
  author: string
  /** Extension homepage URL */
  homepage?: string
  /** Repository URL */
  repository?: string
  /** License identifier (e.g. 'MIT') */
  license?: string
  /** Minimum Idexal version required */
  engines?: { idexal: string }
  /** Extension icon (emoji or URL) */
  icon?: string
  /** Tags for marketplace search */
  tags?: string[]
  /** What the extension contributes */
  contributes?: ExtensionContributions
  /** Activation events — when the extension should be loaded */
  activationEvents?: ActivationEvent[]
}

export type ActivationEvent =
  | { event: 'onCommand'; command: string }
  | { event: 'onPanel'; panelId: string }
  | { event: 'onLanguage'; language: string }
  | { event: 'onFile'; pattern: string }
  | { event: 'onStartup' }

export interface ExtensionContributions {
  /** Register new commands */
  commands?: CommandContribution[]
  /** Register custom panels */
  panels?: PanelContribution[]
  /** Register themes */
  themes?: ThemeContribution[]
  /** Register languages */
  languages?: LanguageContribution[]
  /** Register keybindings */
  keybindings?: KeybindingContribution[]
  /** Register code snippets */
  snippets?: SnippetContribution[]
  /** Register AI agents */
  agents?: AgentContribution[]
  /** Register sidebar items */
  sidebarItems?: SidebarContribution[]
  /** Register status bar items */
  statusBarItems?: StatusBarContribution[]
  /** Register settings */
  settings?: SettingContribution[]
}

export interface CommandContribution {
  /** Command ID (unique within extension) */
  command: string
  /** Display title */
  title: string
  /** Command category for grouping */
  category?: string
  /** Icon name or URL */
  icon?: string
  /** Enablement condition */
  when?: string
}

export interface PanelContribution {
  /** Panel ID (unique within extension) */
  id: string
  /** Panel display title */
  title: string
  /** Icon name or emoji */
  icon: string
  /** Keyboard shortcut (e.g. 'Ctrl+Shift+P') */
  shortcut?: string
  /** Panel location: 'right' | 'left' | 'bottom' */
  location?: 'right' | 'left' | 'bottom'
}

export interface ThemeContribution {
  id: string
  label: string
  type: 'dark' | 'light'
  colors: Record<string, string>
  tokenColors?: any[]
}

export interface LanguageContribution {
  id: string
  extensions: string[]
  aliases: string[]
  configuration?: string
}

export interface KeybindingContribution {
  command: string
  key: string
  mac?: string
  when?: string
}

export interface SnippetContribution {
  language: string
  snippets: { prefix: string; body: string; description: string }[]
}

export interface AgentContribution {
  id: string
  name: string
  icon: string
  description: string
  systemPrompt: string
  capabilities: string[]
}

export interface SidebarContribution {
  id: string
  title: string
  icon: string
  position?: 'top' | 'bottom'
}

export interface StatusBarContribution {
  id: string
  text: string
  icon?: string
  position?: 'left' | 'right'
  priority?: number
  command?: string
}

export interface SettingContribution {
  key: string
  type: 'string' | 'number' | 'boolean' | 'enum'
  default: any
  description: string
  enum?: any[]
}

// ── Extension Context (provided to activate) ───────────

export interface ExtensionContext {
  /** Extension manifest */
  manifest: ExtensionManifest
  /** Storage path for this extension */
  storagePath: string
  /** Get extension-specific settings */
  getSetting<T = any>(key: string): T | undefined
  /** Set extension-specific settings */
  setSetting(key: string, value: any): void

  /** Register a command */
  registerCommand(cmd: RegisteredCommand): Disposable
  /** Register a panel */
  registerPanel(panel: RegisteredPanel): Disposable
  /** Register a theme */
  registerTheme(theme: ThemeContribution): Disposable
  /** Register a language */
  registerLanguage(lang: LanguageContribution): Disposable
  /** Register a keybinding */
  registerKeybinding(keybinding: KeybindingContribution): Disposable
  /** Register an AI agent */
  registerAgent(agent: AgentContribution): Disposable
  /** Register a status bar item */
  registerStatusBar(item: StatusBarContribution): Disposable

  /** Show an information notification */
  showInformationMessage(message: string): void
  /** Show a warning notification */
  showWarningMessage(message: string): void
  /** Show an error notification */
  showErrorMessage(message: string): void

  /** Get the workspace root path */
  getWorkspaceRoot(): string | null
  /** Read a file from the workspace */
  readFile(path: string): Promise<string>
  /** Write a file to the workspace */
  writeFile(path: string, content: string): Promise<void>
  /** List files in a directory */
  readDirectory(path: string): Promise<{ name: string; type: 'file' | 'directory' }[]>

  /** Open a file in the editor */
  openFile(path: string): void
  /** Open a URL in the browser */
  openExternal(url: string): void
  /** Execute a command */
  executeCommand(command: string, ...args: any[]): Promise<any>

  /** Create a webview panel */
  createWebviewPanel(options: WebviewPanelOptions): WebviewPanel
}

export interface RegisteredCommand {
  id: string
  label: string
  category?: string
  callback: (...args: any[]) => any
}

export interface RegisteredPanel {
  id: string
  title: string
  icon: string
  component: React.ComponentType<any>
  shortcut?: string
}

export interface WebviewPanelOptions {
  title: string
  icon?: string
  viewType: string
  showOptions?: { area?: 'right' | 'left' | 'bottom' }
}

export interface WebviewPanel {
  webview: Webview
  reveal(): void
  dispose(): void
  onDidDispose: (listener: () => void) => Disposable
}

export interface Webview {
  html: string
  postMessage(message: any): void
  onDidReceiveMessage: (listener: (message: any) => void) => Disposable
}

export interface Disposable {
  dispose(): void
}

// ── Extension Definition Helper ─────────────────────────

export interface ExtensionDefinition {
  manifest: ExtensionManifest
  activate: (context: ExtensionContext) => Promise<void> | void
  deactivate?: () => Promise<void> | void
}

/**
 * Define an extension with type safety.
 *
 * @example
 * ```ts
 * import { defineExtension } from '@idexal/sdk'
 *
 * export default defineExtension({
 *   manifest: {
 *     id: 'my-company.my-extension',
 *     name: 'My Extension',
 *     version: '1.0.0',
 *     description: 'Does cool things',
 *     author: 'My Company',
 *   },
 *   activate(ctx) {
 *     ctx.registerCommand({
 *       id: 'my-extension.hello',
 *       label: 'Say Hello',
 *       callback: () => ctx.showInformationMessage('Hello!'),
 *     })
 *   },
 * })
 * ```
 */
export function defineExtension(def: ExtensionDefinition): ExtensionDefinition {
  return def
}

// ── Marketplace Types ──────────────────────────────────

export interface MarketplaceExtension {
  id: string
  name: string
  description: string
  author: string
  version: string
  downloads: number
  rating: number
  ratingCount: number
  icon: string
  category: string
  tags: string[]
  installed: boolean
  enabled: boolean
  featured: boolean
  verified: boolean
  lastUpdated: string
  homepage?: string
  repository?: string
  license?: string
}

export interface MarketplaceSearchResult {
  extensions: MarketplaceExtension[]
  total: number
  page: number
  pageSize: number
}

export interface MarketplaceCategory {
  id: string
  name: string
  icon: string
  count: number
}
