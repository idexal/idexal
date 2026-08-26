/**
 * Plugin Service - Basic plugin system for extending IDE functionality
 */

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  hooks: PluginHooks
}

export interface PluginHooks {
  onFileOpen?: (filePath: string) => void
  onFileSave?: (filePath: string, content: string) => void
  onCodeAction?: (action: string) => void
  onCommand?: (command: string) => void
}

export interface PluginConfig {
  id: string
  name: string
  version: string
  description: string
  author: string
}

class PluginService {
  private plugins: Map<string, Plugin> = new Map()
  private enabledPlugins: Set<string> = new Set()

  constructor() {
    this.loadPlugins()
  }

  /**
   * Load plugins from localStorage
   */
  private loadPlugins() {
    try {
      const saved = localStorage.getItem('idexal-plugins')
      if (saved) {
        const plugins: Plugin[] = JSON.parse(saved)
        plugins.forEach(p => {
          this.plugins.set(p.id, p)
          if (p.enabled) this.enabledPlugins.add(p.id)
        })
      }
    } catch (e) {
      console.error('Failed to load plugins:', e)
    }
  }

  /**
   * Save plugins to localStorage
   */
  private savePlugins() {
    const plugins = Array.from(this.plugins.values())
    localStorage.setItem('idexal-plugins', JSON.stringify(plugins))
  }

  /**
   * Register a plugin
   */
  register(config: PluginConfig, hooks: PluginHooks = {}): Plugin {
    const plugin: Plugin = {
      ...config,
      enabled: true,
      hooks,
    }

    this.plugins.set(config.id, plugin)
    this.enabledPlugins.add(config.id)
    this.savePlugins()

    return plugin
  }

  /**
   * Unregister a plugin
   */
  unregister(id: string): boolean {
    const deleted = this.plugins.delete(id)
    this.enabledPlugins.delete(id)
    this.savePlugins()
    return deleted
  }

  /**
   * Enable a plugin
   */
  enable(id: string): boolean {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.enabled = true
      this.enabledPlugins.add(id)
      this.savePlugins()
      return true
    }
    return false
  }

  /**
   * Disable a plugin
   */
  disable(id: string): boolean {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.enabled = false
      this.enabledPlugins.delete(id)
      this.savePlugins()
      return true
    }
    return false
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): Plugin[] {
    return this.getAll().filter(p => p.enabled)
  }

  /**
   * Get plugin by ID
   */
  getById(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }

  /**
   * Execute hook for all enabled plugins
   */
  async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<void> {
    const enabled = this.getEnabled()
    for (const plugin of enabled) {
      const hook = plugin.hooks[hookName]
      if (hook) {
        try {
          await (hook as any)(...args)
        } catch (e) {
          console.error(`Plugin ${plugin.id} hook ${hookName} failed:`, e)
        }
      }
    }
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(id: string): boolean {
    return this.plugins.has(id)
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(id: string): boolean {
    return this.enabledPlugins.has(id)
  }
}

export const pluginService = new PluginService()
export default pluginService
