/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              IDEXA CLI PLUGIN REGISTRY v1.0                    ║
 * ║    Discover, search, and install community plugins             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PluginManifest, RegistryPlugin, RegistrySearchResult, RegistrySource, PluginCategory, DEFAULT_REGISTRY_SOURCES } from './sdk'

const CACHE_DIR = path.join(os.homedir(), '.idexa', 'plugins', '.registry-cache')
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

// ── Built-in Plugin Catalog ───────────────────────────────────
// These are first-party plugins that ship with the CLI

const BUILTIN_PLUGINS: RegistryPlugin[] = [
  {
    name: 'idexa-lint-pro',
    version: '1.2.0',
    description: 'Advanced linting with ESLint, Prettier, and custom rule support',
    author: 'Idexal',
    downloads: 45200,
    rating: 4.8,
    categories: ['linting', 'formatting'],
    keywords: ['eslint', 'prettier', 'lint', 'format'],
    icon: '🔍',
    homepage: 'https://github.com/idexal/idexa-lint-pro',
    updatedAt: '2026-08-20T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-test-runner',
    version: '2.0.0',
    description: 'Run tests with coverage, parallel execution, and smart watch mode',
    author: 'Idexal',
    downloads: 38700,
    rating: 4.7,
    categories: ['testing'],
    keywords: ['test', 'jest', 'vitest', 'coverage'],
    icon: '🧪',
    homepage: 'https://github.com/idexal/idexa-test-runner',
    updatedAt: '2026-08-18T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-docker-sync',
    version: '1.1.0',
    description: 'Docker Compose management, container monitoring, and log streaming',
    author: 'Idexal',
    downloads: 22100,
    rating: 4.5,
    categories: ['docker', 'deployment'],
    keywords: ['docker', 'compose', 'container', 'deploy'],
    icon: '🐳',
    homepage: 'https://github.com/idexal/idexa-docker-sync',
    updatedAt: '2026-08-15T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-git-workflow',
    version: '1.3.0',
    description: 'Git workflow automation — branch management, PR creation, and release tagging',
    author: 'Idexal',
    downloads: 31400,
    rating: 4.6,
    categories: ['git', 'productivity'],
    keywords: ['git', 'github', 'workflow', 'pr', 'release'],
    icon: '🌿',
    homepage: 'https://github.com/idexal/idexa-git-workflow',
    updatedAt: '2026-08-22T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-security-scan',
    version: '1.0.0',
    description: 'Security vulnerability scanning, dependency audit, and OWASP checks',
    author: 'Idexal',
    downloads: 18900,
    rating: 4.4,
    categories: ['security'],
    keywords: ['security', 'vulnerability', 'owasp', 'audit'],
    icon: '🛡️',
    homepage: 'https://github.com/idexal/idexa-security-scan',
    updatedAt: '2026-08-10T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-db-tools',
    version: '1.2.0',
    description: 'Database management — migrations, seeds, backup/restore, and query builder',
    author: 'Idexal',
    downloads: 25600,
    rating: 4.5,
    categories: ['database'],
    keywords: ['database', 'sql', 'migration', 'seed'],
    icon: '🗄️',
    homepage: 'https://github.com/idexal/idexa-db-tools',
    updatedAt: '2026-08-19T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-perf-monitor',
    version: '1.0.0',
    description: 'Performance profiling, bundle analysis, and Lighthouse audits',
    author: 'Idexal',
    downloads: 15200,
    rating: 4.3,
    categories: ['performance', 'monitoring'],
    keywords: ['performance', 'profiling', 'lighthouse', 'bundle'],
    icon: '📈',
    homepage: 'https://github.com/idexal/idexa-perf-monitor',
    updatedAt: '2026-08-12T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-doc-gen',
    version: '1.1.0',
    description: 'Auto-generate API documentation, JSDoc/TSDoc extraction, and README templates',
    author: 'Idexal',
    downloads: 12800,
    rating: 4.2,
    categories: ['documentation'],
    keywords: ['docs', 'jsdoc', 'tsdoc', 'readme'],
    icon: '📚',
    homepage: 'https://github.com/idexal/idexa-doc-gen',
    updatedAt: '2026-08-14T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-ai-extra-models',
    version: '1.0.0',
    description: 'Additional AI model providers — Google Gemini, Mistral, Cohere, and local models',
    author: 'Community',
    downloads: 28300,
    rating: 4.6,
    categories: ['ai'],
    keywords: ['ai', 'gemini', 'mistral', 'llm'],
    icon: '🤖',
    homepage: 'https://github.com/community/idexa-ai-extra-models',
    updatedAt: '2026-08-21T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-ssh-tools',
    version: '1.0.0',
    description: 'SSH tunnel management, remote file sync, and port forwarding',
    author: 'Community',
    downloads: 9400,
    rating: 4.1,
    categories: ['utilities'],
    keywords: ['ssh', 'tunnel', 'remote', 'sync'],
    icon: '🔐',
    homepage: 'https://github.com/community/idexa-ssh-tools',
    updatedAt: '2026-08-11T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-env-manager',
    version: '1.0.0',
    description: 'Environment variable management across .env files with encryption support',
    author: 'Community',
    downloads: 11200,
    rating: 4.3,
    categories: ['utilities', 'security'],
    keywords: ['env', 'environment', 'secrets', 'encryption'],
    icon: '🔧',
    homepage: 'https://github.com/community/idexa-env-manager',
    updatedAt: '2026-08-16T10:00:00Z',
    license: 'MIT',
  },
  {
    name: 'idexa-ci-pipeline',
    version: '1.0.0',
    description: 'GitHub Actions, GitLab CI, and CircleCI pipeline management and debugging',
    author: 'Community',
    downloads: 8700,
    rating: 4.0,
    categories: ['deployment', 'monitoring'],
    keywords: ['ci', 'cd', 'github-actions', 'gitlab-ci'],
    icon: '🔄',
    homepage: 'https://github.com/community/idexa-ci-pipeline',
    updatedAt: '2026-08-13T10:00:00Z',
    license: 'MIT',
  },
]

// ── Registry Client ───────────────────────────────────────────

export class PluginRegistry {
  private sources: RegistrySource[]
  private cache: Map<string, { data: any; timestamp: number }> = new Map()

  constructor(sources?: RegistrySource[]) {
    this.sources = sources || DEFAULT_REGISTRY_SOURCES
    this.ensureCacheDir()
  }

  // ── Search ───────────────────────────────────────────────

  async search(query: string, options?: {
    category?: PluginCategory
    sortBy?: 'downloads' | 'rating' | 'updated' | 'name'
    page?: number
    pageSize?: number
  }): Promise<RegistrySearchResult> {
    const { category, sortBy = 'downloads', page = 1, pageSize = 20 } = options || {}

    let plugins = [...BUILTIN_PLUGINS]

    // Filter by query
    if (query) {
      const q = query.toLowerCase()
      plugins = plugins.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.keywords.some(k => k.includes(q))
      )
    }

    // Filter by category
    if (category) {
      plugins = plugins.filter(p => p.categories.includes(category))
    }

    // Sort
    plugins.sort((a, b) => {
      switch (sortBy) {
        case 'downloads': return b.downloads - a.downloads
        case 'rating': return b.rating - a.rating
        case 'updated': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })

    const total = plugins.length
    const start = (page - 1) * pageSize
    const paginated = plugins.slice(start, start + pageSize)

    return { plugins: paginated, total, page, pageSize }
  }

  // ── Get Plugin Info ──────────────────────────────────────

  async getPlugin(name: string): Promise<RegistryPlugin | null> {
    return BUILTIN_PLUGINS.find(p => p.name === name) || null
  }

  // ── List All ─────────────────────────────────────────────

  async listAll(options?: {
    category?: PluginCategory
    sortBy?: 'downloads' | 'rating' | 'updated' | 'name'
  }): Promise<RegistryPlugin[]> {
    const { category, sortBy = 'downloads' } = options || {}
    let plugins = [...BUILTIN_PLUGINS]

    if (category) {
      plugins = plugins.filter(p => p.categories.includes(category))
    }

    plugins.sort((a, b) => {
      switch (sortBy) {
        case 'downloads': return b.downloads - a.downloads
        case 'rating': return b.rating - a.rating
        case 'updated': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })

    return plugins
  }

  // ── Categories ───────────────────────────────────────────

  getCategories(): Array<{ name: PluginCategory; count: number }> {
    const counts: Record<string, number> = {}
    for (const p of BUILTIN_PLUGINS) {
      for (const cat of p.categories) {
        counts[cat] = (counts[cat] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name: name as PluginCategory, count }))
      .sort((a, b) => b.count - a.count)
  }

  // ── Download (simulated for local plugins) ───────────────

  async download(plugin: RegistryPlugin): Promise<string> {
    // For built-in plugins, create a simulated plugin directory
    const tempDir = path.join(os.tmpdir(), `idexa-plugin-${plugin.name}`)
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
    fs.mkdirSync(tempDir, { recursive: true })

    // Write manifest
    const manifest: PluginManifest = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      license: plugin.license,
      homepage: plugin.homepage,
      categories: plugin.categories,
      keywords: plugin.keywords,
      icon: plugin.icon,
      main: 'index.js',
    }
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    // Write a stub index.js
    const stubCode = `// Auto-generated stub for ${plugin.name}
module.exports = {
  manifest: require('./manifest.json'),
  register(ctx) {
    ctx.logger.info('Plugin ${plugin.name} loaded (stub)');
  }
};`
    fs.writeFileSync(path.join(tempDir, 'index.js'), stubCode)

    return tempDir
  }

  // ── Internal ─────────────────────────────────────────────

  private ensureCacheDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
  }
}
