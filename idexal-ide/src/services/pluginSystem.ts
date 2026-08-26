// ══════════════════════════════════════════════════════════════════════
// Plugin System — Extensible architecture for Idexal IDE
//
// Plugins can:
// - Add new commands to the command palette
// - Register custom panels
// - Hook into file events
// - Provide language support
// - Add status bar items
// ══════════════════════════════════════════════════════════════════════

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  main: string
  capabilities: PluginCapability[]
}

export type PluginCapability =
  | 'commands'
  | 'panels'
  | 'file-events'
  | 'language-support'
  | 'status-bar'
  | 'keybindings'

export interface PluginCommand {
  id: string
  label: string
  category?: string
  callback: (...args: any[]) => void
}

export interface PluginPanel {
  id: string
  title: string
  icon: string
  component: React.ComponentType<any>
}

export interface Plugin {
  manifest: PluginManifest
  commands: PluginCommand[]
  panels: PluginPanel[]
  activate: (context: PluginContext) => Promise<void>
  deactivate?: () => Promise<void>
}

export interface PluginContext {
  commands: {
    register: (command: PluginCommand) => void
    execute: (id: string, ...args: any[]) => void
  }
  panels: {
    register: (panel: PluginPanel) => void
  }
  workspace: {
    rootPath: string | null
    files: string[]
  }
  ai: {
    sendMessage: (message: string) => Promise<string>
  }
  notifications: {
    info: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
  }
}

// ── Plugin Manager ────────────────────────────────────────────────────

class PluginManager {
  private plugins = new Map<string, Plugin>()
  private enabled = new Set<string>()
  private context: PluginContext | null = null

  setContext(context: PluginContext) {
    this.context = context
  }

  async loadPlugin(manifest: PluginManifest): Promise<boolean> {
    try {
      // In production, this would dynamically import the plugin module
      // For now, we validate the manifest
      if (!manifest.id || !manifest.name || !manifest.version) {
        console.error(`[plugin] invalid manifest for ${manifest.id}`)
        return false
      }

      console.log(`[plugin] loaded: ${manifest.name} v${manifest.version}`)
      return true
    } catch (err) {
      console.error(`[plugin] failed to load ${manifest.id}:`, err)
      return false
    }
  }

  async activatePlugin(plugin: Plugin): Promise<void> {
    if (!this.context) {
      console.error('[plugin] no context set')
      return
    }

    try {
      await plugin.activate(this.context)
      this.plugins.set(plugin.manifest.id, plugin)
      this.enabled.add(plugin.manifest.id)
      console.log(`[plugin] activated: ${plugin.manifest.name}`)
    } catch (err) {
      console.error(`[plugin] failed to activate ${plugin.manifest.id}:`, err)
    }
  }

  async deactivatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (plugin?.deactivate) {
      await plugin.deactivate()
    }
    this.plugins.delete(id)
    this.enabled.delete(id)
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => this.enabled.has(p.manifest.id))
  }

  getAllCommands(): PluginCommand[] {
    const commands: PluginCommand[] = []
    for (const plugin of this.getEnabledPlugins()) {
      commands.push(...plugin.commands)
    }
    return commands
  }

  getAllPanels(): PluginPanel[] {
    const panels: PluginPanel[] = []
    for (const plugin of this.getEnabledPlugins()) {
      panels.push(...plugin.panels)
    }
    return panels
  }
}

// Singleton
let _manager: PluginManager | null = null

export function getPluginManager(): PluginManager {
  if (!_manager) _manager = new PluginManager()
  return _manager
}

// ── Built-in plugins ──────────────────────────────────────────────────

export const builtinPlugins: Plugin[] = [
  {
    manifest: {
      id: 'idexal.git',
      name: 'Git Integration',
      version: '1.0.0',
      description: 'Git version control integration',
      author: 'Idexal',
      main: 'git-plugin',
      capabilities: ['commands', 'panels'],
    },
    commands: [
      { id: 'git.status', label: 'Git: Show Status', category: 'Git', callback: () => {} },
      { id: 'git.commit', label: 'Git: Commit', category: 'Git', callback: () => {} },
      { id: 'git.push', label: 'Git: Push', category: 'Git', callback: () => {} },
      { id: 'git.pull', label: 'Git: Pull', category: 'Git', callback: () => {} },
    ],
    panels: [],
    activate: async () => {},
  },
  {
    manifest: {
      id: 'idexal.ai',
      name: 'AI Assistant',
      version: '1.0.0',
      description: 'AI-powered code assistance',
      author: 'Idexal',
      main: 'ai-plugin',
      capabilities: ['commands', 'panels'],
    },
    commands: [
      { id: 'ai.chat', label: 'AI: Open Chat', category: 'AI', callback: () => {} },
      { id: 'ai.explain', label: 'AI: Explain Selection', category: 'AI', callback: () => {} },
      { id: 'ai.refactor', label: 'AI: Refactor Selection', category: 'AI', callback: () => {} },
      { id: 'ai.test', label: 'AI: Generate Tests', category: 'AI', callback: () => {} },
    ],
    panels: [],
    activate: async () => {},
  },
]
