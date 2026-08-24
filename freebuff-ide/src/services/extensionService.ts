/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                 EXTENSION SERVICE v1.0                          ║
 * ║            Plugin System for Idexal IDE                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - Extension manifest parsing
 * - Lifecycle management (activate, deactivate)
 * - Contribution points: themes, commands, keybindings, languages
 * - Extension settings
 * - Hot-reload support
 */

export type ExtensionKind = 'theme' | 'language' | 'keybinding' | 'command' | 'agent' | 'snippets'

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  kind: ExtensionKind[]
  main?: string
  contributes?: ExtensionContributions
  dependencies?: string[]
  engines?: { idexal: string }
}

export interface ExtensionContributions {
  themes?: ThemeContribution[]
  languages?: LanguageContribution[]
  commands?: CommandContribution[]
  keybindings?: KeybindingContribution[]
  snippets?: SnippetContribution[]
  agents?: AgentContribution[]
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

export interface CommandContribution {
  command: string
  title: string
  category?: string
  icon?: string
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

export interface Extension {
  manifest: ExtensionManifest
  enabled: boolean
  active: boolean
  path?: string
  error?: string
  settings: Record<string, any>
}

// ── Built-in Extensions ──────────────────────────────────────

const BUILT_IN_EXTENSIONS: Extension[] = [
  {
    manifest: {
      id: 'idexal-dark-theme',
      name: 'Idexal Dark',
      version: '1.0.0',
      description: 'Default dark theme for Idexal IDE',
      author: 'Idexal Team',
      kind: ['theme'],
      contributes: {
        themes: [{
          id: 'idexal-dark',
          label: 'Idexal Dark',
          type: 'dark',
          colors: {
            'editor.background': '#0d1117',
            'editor.foreground': '#c9d1d9',
            'editorLineNumber.foreground': '#484f58',
            'editorCursor.foreground': '#58a6ff',
            'editor.selectionBackground': '#264f78',
            'editor.lineHighlightBackground': '#161b22',
            'sideBar.background': '#0d1117',
            'sideBar.foreground': '#c9d1d9',
            'statusBar.background': '#010409',
            'titleBar.activeBackground': '#010409',
          },
        }],
      },
    },
    enabled: true,
    active: true,
    settings: {},
  },
  {
    manifest: {
      id: 'idexal-typescript',
      name: 'TypeScript Support',
      version: '1.0.0',
      description: 'TypeScript and JavaScript language support',
      author: 'Idexal Team',
      kind: ['language'],
      contributes: {
        languages: [
          { id: 'typescript', extensions: ['.ts', '.tsx'], aliases: ['TypeScript', 'typescript'] },
          { id: 'javascript', extensions: ['.js', '.jsx'], aliases: ['JavaScript', 'javascript'] },
        ],
      },
    },
    enabled: true,
    active: true,
    settings: {},
  },
  {
    manifest: {
      id: 'idexal-rust',
      name: 'Rust Support',
      version: '1.0.0',
      description: 'Rust language support with snippets',
      author: 'Idexal Team',
      kind: ['language', 'snippets'],
      contributes: {
        languages: [
          { id: 'rust', extensions: ['.rs'], aliases: ['Rust', 'rust'] },
        ],
        snippets: [{
          language: 'rust',
          snippets: [
            { prefix: 'fn', body: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n  ${0}\n}', description: 'Function definition' },
            { prefix: 'struct', body: 'struct ${1:Name} {\n  ${0}\n}', description: 'Struct definition' },
            { prefix: 'impl', body: 'impl ${1:Type} {\n  ${0}\n}', description: 'Implementation block' },
            { prefix: 'test', body: '#[cfg(test)]\nmod tests {\n  use super::*;\n\n  #[test]\n  fn ${1:test_name}() {\n    ${0}\n  }\n}', description: 'Test module' },
          ],
        }],
      },
    },
    enabled: true,
    active: true,
    settings: {},
  },
  {
    manifest: {
      id: 'idexal-git-lens',
      name: 'Git Lens',
      version: '1.0.0',
      description: 'Enhanced Git integration with blame and history',
      author: 'Idexal Team',
      kind: ['command'],
      contributes: {
        commands: [
          { command: 'gitLens.blame', title: 'Git: Show Blame', category: 'Git Lens' },
          { command: 'gitLens.history', title: 'Git: File History', category: 'Git Lens' },
          { command: 'gitLens.compare', title: 'Git: Compare Branches', category: 'Git Lens' },
        ],
        keybindings: [
          { command: 'gitLens.blame', key: 'ctrl+shift+b', when: 'editorTextFocus' },
        ],
      },
    },
    enabled: true,
    active: true,
    settings: {},
  },
  {
    manifest: {
      id: 'idexal-smart-agent',
      name: 'Smart Agent',
      version: '1.0.0',
      description: 'AI agent with specialized knowledge for React, TypeScript, and Rust',
      author: 'Idexal Team',
      kind: ['agent'],
      contributes: {
        agents: [{
          id: 'smart',
          name: 'Smart Agent',
          icon: '🧠',
          description: 'Multi-domain AI agent with deep knowledge',
          systemPrompt: `You are the Smart Agent — a versatile AI assistant with deep expertise across multiple domains.

Core capabilities:
- **React/TypeScript**: Component architecture, hooks, state management, performance
- **Rust**: Systems programming, memory safety, async, FFI
- **DevOps**: Docker, CI/CD, cloud infrastructure
- **Architecture**: System design, patterns, scalability

When responding:
1. Analyze the full context
2. Provide the most efficient solution
3. Explain trade-offs when relevant
4. Include runnable code examples
5. Suggest follow-up improvements`,
          capabilities: ['code', 'review', 'debug', 'architect', 'test', 'devops'],
        }],
      },
    },
    enabled: true,
    active: true,
    settings: {},
  },
]

// ══════════════════════════════════════════════════════════════
// EXTENSION SERVICE
// ══════════════════════════════════════════════════════════════

class ExtensionService {
  private extensions: Map<string, Extension> = new Map()
  private listeners: Set<() => void> = new Set()

  constructor() {
    for (const ext of BUILT_IN_EXTENSIONS) {
      this.extensions.set(ext.manifest.id, ext)
    }
  }

  // ── Query ──────────────────────────────────────────────────

  getAll(): Extension[] {
    return Array.from(this.extensions.values())
  }

  getEnabled(): Extension[] {
    return this.getAll().filter(e => e.enabled)
  }

  getActive(): Extension[] {
    return this.getAll().filter(e => e.active)
  }

  getById(id: string): Extension | undefined {
    return this.extensions.get(id)
  }

  getByKind(kind: ExtensionKind): Extension[] {
    return this.getEnabled().filter(e => e.manifest.kind.includes(kind))
  }

  // ── Lifecycle ──────────────────────────────────────────────

  enable(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext) return false
    ext.enabled = true
    ext.active = true
    this.notify()
    return true
  }

  disable(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext) return false
    ext.enabled = false
    ext.active = false
    this.notify()
    return true
  }

  toggle(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext) return false
    if (ext.enabled) this.disable(id)
    else this.enable(id)
    return true
  }

  // ── Install (mock) ─────────────────────────────────────────

  install(manifest: ExtensionManifest): Extension {
    const ext: Extension = {
      manifest,
      enabled: true,
      active: true,
      settings: {},
    }
    this.extensions.set(manifest.id, ext)
    this.notify()
    return ext
  }

  uninstall(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext || id.startsWith('idexal-')) return false // Can't uninstall built-in
    this.extensions.delete(id)
    this.notify()
    return true
  }

  // ── Contribution Queries ───────────────────────────────────

  getThemes(): ThemeContribution[] {
    const themes: ThemeContribution[] = []
    for (const ext of this.getEnabled()) {
      if (ext.manifest.contributes?.themes) {
        themes.push(...ext.manifest.contributes.themes)
      }
    }
    return themes
  }

  getLanguages(): LanguageContribution[] {
    const langs: LanguageContribution[] = []
    for (const ext of this.getEnabled()) {
      if (ext.manifest.contributes?.languages) {
        langs.push(...ext.manifest.contributes.languages)
      }
    }
    return langs
  }

  getCommands(): CommandContribution[] {
    const commands: CommandContribution[] = []
    for (const ext of this.getEnabled()) {
      if (ext.manifest.contributes?.commands) {
        commands.push(...ext.manifest.contributes.commands)
      }
    }
    return commands
  }

  getKeybindings(): KeybindingContribution[] {
    const keybindings: KeybindingContribution[] = []
    for (const ext of this.getEnabled()) {
      if (ext.manifest.contributes?.keybindings) {
        keybindings.push(...ext.manifest.contributes.keybindings)
      }
    }
    return keybindings
  }

  getSnippets(language: string): SnippetContribution['snippets'] {
    const snippets: SnippetContribution['snippets'] = []
    for (const ext of this.getEnabled()) {
      if (ext.manifest.contributes?.snippets) {
        for (const s of ext.manifest.contributes.snippets) {
          if (s.language === language) snippets.push(...s.snippets)
        }
      }
    }
    return snippets
  }

  getAgentExtensions(): AgentContribution[] {
    const agents: AgentContribution[] = []
    for (const ext of this.getEnabled()) {
      if (ext.manifest.contributes?.agents) {
        agents.push(...ext.manifest.contributes.agents)
      }
    }
    return agents
  }

  // ── Settings ───────────────────────────────────────────────

  getSetting(extensionId: string, key: string): any {
    const ext = this.extensions.get(extensionId)
    return ext?.settings[key]
  }

  setSetting(extensionId: string, key: string, value: any) {
    const ext = this.extensions.get(extensionId)
    if (ext) {
      ext.settings[key] = value
      this.notify()
    }
  }

  // ── Listeners ──────────────────────────────────────────────

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }
}

export const extensionService = new ExtensionService()
export default extensionService
