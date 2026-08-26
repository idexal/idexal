/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              IDEXA CLI PLUGIN MANAGER v1.0                     ║
 * ║    Load, enable, disable, and manage plugins                   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Command } from 'commander'
import {
  PluginManifest,
  PluginDefinition,
  PluginInstance,
  PluginContext,
  PluginHooks,
  PluginEvent,
  PluginEventType,
  PluginError,
  PluginNotFoundError,
  PluginVersionError,
  PluginDependencyError,
  PluginLogger,
} from './sdk'

const PLUGINS_DIR = path.join(os.homedir(), '.idexa', 'plugins')
const STATE_FILE = path.join(PLUGINS_DIR, '.state.json')
const EVENTS_FILE = path.join(PLUGINS_DIR, '.events.json')

interface PluginState {
  enabled: Record<string, boolean>
  installed: Record<string, {
    version: string
    installPath: string
    installedAt: number
  }>
}

// ── Plugin Manager ────────────────────────────────────────────

export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map()
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map()
  private eventLog: PluginEvent[] = []
  private program: Command
  private state: PluginState = { enabled: {}, installed: {} }

  constructor(program: Command) {
    this.program = program
    this.ensureDirectories()
    this.loadState()
    this.loadEventLog()
  }

  // ── Lifecycle ─────────────────────────────────────────────

  /** Load all enabled plugins */
  async loadAll(): Promise<{ loaded: number; errors: number }> {
    let loaded = 0
    let errors = 0

    for (const [name, info] of Object.entries(this.state.installed)) {
      if (!this.state.enabled[name]) continue

      try {
        await this.loadPlugin(name)
        loaded++
      } catch (err) {
        errors++
        const instance = this.plugins.get(name)
        if (instance) {
          instance.error = (err as Error).message
        }
        this.emitEvent('plugin:error', name, { error: (err as Error).message })
      }
    }

    return { loaded, errors }
  }

  /** Load a single plugin by name */
  async loadPlugin(name: string): Promise<PluginInstance> {
    const installed = this.state.installed[name]
    if (!installed) throw new PluginNotFoundError(name)

    const manifestPath = path.join(installed.installPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      throw new PluginError(name, 'manifest.json not found', 'MANIFEST_MISSING')
    }

    const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    // Version check
    if (manifest.minVersion) {
      const currentVersion = require('../../package.json').version
      if (!this.satisfiesVersion(currentVersion, manifest.minVersion)) {
        throw new PluginVersionError(name, manifest.minVersion, currentVersion)
      }
    }

    // Dependency check
    if (manifest.dependencies) {
      for (const [dep, _version] of Object.entries(manifest.dependencies)) {
        if (!this.state.installed[dep]) {
          throw new PluginDependencyError(name, dep)
        }
      }
    }

    // Load the plugin module
    const entryPoint = path.join(installed.installPath, manifest.main || 'index.js')
    let definition: PluginDefinition

    try {
      const mod = require(entryPoint)
      definition = mod.default || mod
    } catch (err) {
      throw new PluginError(name, `Failed to load module: ${(err as Error).message}`, 'MODULE_LOAD_FAILED')
    }

    // Create instance
    const instance: PluginInstance = {
      definition,
      enabled: true,
      loaded: true,
      installPath: installed.installPath,
      loadedAt: Date.now(),
    }

    this.plugins.set(name, instance)

    // Create context and run hooks
    const ctx = this.createContext(name, installed.installPath)

    if (definition.hooks?.onLoad) {
      await definition.hooks.onLoad(ctx)
    }

    if (definition.register) {
      await definition.register(ctx)
    }

    if (definition.hooks?.onActivate) {
      await definition.hooks.onActivate(ctx)
    }

    this.emitEvent('plugin:loaded', name)
    return instance
  }

  /** Unload a plugin */
  async unloadPlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name)
    if (!instance) throw new PluginNotFoundError(name)

    const ctx = this.createContext(name, instance.installPath)

    if (instance.definition.hooks?.onDeactivate) {
      await instance.definition.hooks.onDeactivate(ctx)
    }

    if (instance.definition.hooks?.onUnload) {
      await instance.definition.hooks.onUnload(ctx)
    }

    instance.loaded = false
    this.plugins.delete(name)
    this.emitEvent('plugin:unloaded', name)
  }

  // ── Enable / Disable ─────────────────────────────────────

  async enable(name: string): Promise<void> {
    if (!this.state.installed[name]) throw new PluginNotFoundError(name)
    this.state.enabled[name] = true
    this.saveState()

    if (!this.plugins.has(name)) {
      await this.loadPlugin(name)
    }

    this.emitEvent('plugin:enabled', name)
  }

  async disable(name: string): Promise<void> {
    if (!this.state.installed[name]) throw new PluginNotFoundError(name)

    if (this.plugins.has(name)) {
      await this.unloadPlugin(name)
    }

    this.state.enabled[name] = false
    this.saveState()
    this.emitEvent('plugin:disabled', name)
  }

  // ── Install / Uninstall ───────────────────────────────────

  async install(manifest: PluginManifest, sourcePath: string): Promise<void> {
    const name = manifest.name
    const installPath = path.join(PLUGINS_DIR, name)

    // Copy plugin files to install directory
    if (fs.existsSync(installPath)) {
      fs.rmSync(installPath, { recursive: true })
    }
    fs.cpSync(sourcePath, installPath, { recursive: true })

    // Write manifest
    fs.writeFileSync(
      path.join(installPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    // Update state
    this.state.installed[name] = {
      version: manifest.version,
      installPath,
      installedAt: Date.now(),
    }
    this.state.enabled[name] = true
    this.saveState()

    // Try to load immediately
    try {
      await this.loadPlugin(name)
    } catch {
      // Plugin installed but failed to load — that's ok, it's disabled
      this.state.enabled[name] = false
      this.saveState()
    }

    this.emitEvent('plugin:installed', name, { version: manifest.version })
  }

  async uninstall(name: string): Promise<void> {
    if (!this.state.installed[name]) throw new PluginNotFoundError(name)

    // Unload first
    if (this.plugins.has(name)) {
      await this.unloadPlugin(name)
    }

    // Remove files
    const installPath = this.state.installed[name].installPath
    if (fs.existsSync(installPath)) {
      fs.rmSync(installPath, { recursive: true })
    }

    // Update state
    delete this.state.installed[name]
    delete this.state.enabled[name]
    this.saveState()

    this.emitEvent('plugin:uninstalled', name)
  }

  // ── Queries ───────────────────────────────────────────────

  getInstalled(): Array<{ name: string; version: string; enabled: boolean; error?: string }> {
    return Object.entries(this.state.installed).map(([name, info]) => ({
      name,
      version: info.version,
      enabled: this.state.enabled[name] || false,
      error: this.plugins.get(name)?.error,
    }))
  }

  getLoaded(): string[] {
    return Array.from(this.plugins.entries())
      .filter(([_, inst]) => inst.loaded)
      .map(([name]) => name)
  }

  getInstance(name: string): PluginInstance | undefined {
    return this.plugins.get(name)
  }

  isInstalled(name: string): boolean {
    return name in this.state.installed
  }

  isEnabled(name: string): boolean {
    return this.state.enabled[name] || false
  }

  // ── Event System ──────────────────────────────────────────

  emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try { handler(data) } catch { /* swallow plugin event errors */ }
      }
    }
  }

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
    return () => { this.eventHandlers.get(event)?.delete(handler) }
  }

  // ── Internal ──────────────────────────────────────────────

  private createContext(name: string, pluginDir: string): PluginContext {
    const logger = this.createLogger(name)
    return {
      program: this.program,
      pluginDir,
      config: {
        get: <T = any>(key: string): T | undefined => {
          const configPath = path.join(process.cwd(), '.idexa.json')
          if (!fs.existsSync(configPath)) return undefined
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
          return key.split('.').reduce((obj: any, k) => obj?.[k], config) as T
        },
        set: (key: string, value: any) => {
          const configPath = path.join(process.cwd(), '.idexa.json')
          let config: any = {}
          if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
          }
          const keys = key.split('.')
          let obj = config
          for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {}
            obj = obj[keys[i]]
          }
          obj[keys[keys.length - 1]] = value
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        },
        has: (key: string): boolean => {
          const configPath = path.join(process.cwd(), '.idexa.json')
          if (!fs.existsSync(configPath)) return false
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
          return key.split('.').reduce((obj: any, k) => obj?.[k], config) !== undefined
        },
      },
      projectRoot: process.cwd(),
      logger,
      emit: (event: string, data?: any) => this.emit(`${name}:${event}`, data),
      on: (event: string, handler: (data: any) => void) => this.on(`${name}:${event}`, handler),
      readFile: async (p: string) => fs.readFileSync(path.join(pluginDir, p), 'utf8'),
      writeFile: async (p: string, content: string) => fs.writeFileSync(path.join(pluginDir, p), content),
      fileExists: async (p: string) => fs.existsSync(path.join(pluginDir, p)),
      exec: async (cmd: string, args: string[] = []) => {
        const { execSync } = require('child_process')
        try {
          const stdout = execSync(`${cmd} ${args.join(' ')}`, { cwd: process.cwd(), encoding: 'utf8' })
          return { stdout, stderr: '', exitCode: 0 }
        } catch (err: any) {
          return { stdout: err.stdout || '', stderr: err.stderr || err.message, exitCode: err.status || 1 }
        }
      },
      prompt: async (question: string, options?: { type?: string; choices?: string[] }) => {
        // Simple stdin prompt for CLI plugins
        const readline = require('readline')
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        return new Promise((resolve) => {
          rl.question(`${question}: `, (answer: string) => {
            rl.close()
            if (options?.type === 'confirm') {
              resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
            } else if (options?.type === 'select' && options.choices) {
              const idx = parseInt(answer) - 1
              resolve(options.choices[idx >= 0 && idx < options.choices.length ? idx : 0])
            } else {
              resolve(answer)
            }
          })
        })
      },
      progress: (message: string) => {
        process.stdout.write(`  ⏳ ${message}`)
        return {
          update: (msg: string) => {
            process.stdout.write(`\r  ⏳ ${msg}    `)
          },
          done: (msg?: string) => {
            console.log(`\r  ✅ ${msg || message}`)
          },
          fail: (msg?: string) => {
            console.log(`\r  ❌ ${msg || message}`)
          },
        }
      },
    }
  }

  private createLogger(name: string): PluginLogger {
    const prefix = `[${name}]`
    return {
      info: (msg: string) => console.log(`  ℹ️  ${prefix} ${msg}`),
      warn: (msg: string) => console.log(`  ⚠️  ${prefix} ${msg}`),
      error: (msg: string) => console.error(`  ❌ ${prefix} ${msg}`),
      debug: (msg: string) => {
        if (process.env.IDEXA_VERBOSE) console.log(`  🔍 ${prefix} ${msg}`)
      },
      success: (msg: string) => console.log(`  ✅ ${prefix} ${msg}`),
    }
  }

  private emitEvent(type: PluginEventType, plugin?: string, data?: any): void {
    const event: PluginEvent = { type, plugin, data, timestamp: Date.now() }
    this.eventLog.push(event)
    if (this.eventLog.length > 1000) this.eventLog = this.eventLog.slice(-500)
    this.saveEventLog()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    }
  }

  private loadState(): void {
    if (fs.existsSync(STATE_FILE)) {
      try {
        this.state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
      } catch {
        this.state = { enabled: {}, installed: {} }
      }
    }
  }

  private saveState(): void {
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2))
  }

  private loadEventLog(): void {
    if (fs.existsSync(EVENTS_FILE)) {
      try {
        this.eventLog = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'))
      } catch {
        this.eventLog = []
      }
    }
  }

  private saveEventLog(): void {
    try {
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(this.eventLog.slice(-200), null, 2))
    } catch { /* ignore */ }
  }

  private satisfiesVersion(current: string, required: string): boolean {
    const [cMaj, cMin] = current.split('.').map(Number)
    const [rMaj, rMin] = required.split('.').map(Number)
    if (cMaj > rMaj) return true
    if (cMaj === rMaj && cMin >= rMin) return true
    return false
  }
}
