/**
 * Extension Scaffold Generator
 * Generates starter templates for new Idexal IDE extensions.
 */

import type { ExtensionManifest, ExtensionContributions } from './pluginSDK'

export interface ScaffoldOptions {
  name: string
  description: string
  author: string
  kind: 'panel' | 'command' | 'theme' | 'language' | 'agent' | 'full'
  outputDir?: string
}

// ── Template generators ────────────────────────────────

function generateManifest(opts: ScaffoldOptions): string {
  const id = opts.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const contributions: ExtensionContributions = {}

  if (opts.kind === 'panel' || opts.kind === 'full') {
    contributions.panels = [{
      id: `${id}-panel`,
      title: `${opts.name} Panel`,
      icon: '📦',
      location: 'right',
    }]
  }

  if (opts.kind === 'command' || opts.kind === 'full') {
    contributions.commands = [{
      command: `${id}.run`,
      title: `${opts.name}: Run`,
      category: opts.name,
    }]
  }

  if (opts.kind === 'theme' || opts.kind === 'full') {
    contributions.themes = [{
      id: `${id}-theme`,
      label: `${opts.name} Theme`,
      type: 'dark',
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5',
      },
    }]
  }

  if (opts.kind === 'agent' || opts.kind === 'full') {
    contributions.agents = [{
      id: `${id}-agent`,
      name: `${opts.name} Agent`,
      icon: '🤖',
      description: `AI agent from ${opts.name} extension`,
      systemPrompt: `You are the ${opts.name} Agent.`,
      capabilities: ['code', 'review'],
    }]
  }

  const manifest: ExtensionManifest = {
    id,
    name: opts.name,
    version: '0.1.0',
    description: opts.description,
    author: opts.author,
    icon: '📦',
    tags: [opts.kind],
    contributes: Object.keys(contributions).length > 0 ? contributions : undefined,
    engines: { idexal: '>=1.0.0' },
  }

  return JSON.stringify(manifest, null, 2)
}

function generateExtensionEntry(opts: ScaffoldOptions): string {
  const id = opts.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  if (opts.kind === 'panel') {
    return `import { defineExtension } from '@idexal/sdk'
import React from 'react'

// ── Custom Panel Component ──────────────────────────
function MyPanel() {
  return (
    <div style={{ padding: 16, color: '#c9d1d9' }}>
      <h2>${opts.name}</h2>
      <p>Your custom panel content goes here.</p>
    </div>
  )
}

// ── Extension Definition ────────────────────────────
export default defineExtension({
  manifest: require('./manifest.json'),

  activate(ctx) {
    // Register the custom panel
    ctx.registerPanel({
      id: '${id}-panel',
      title: '${opts.name}',
      icon: '📦',
      component: MyPanel,
    })

    // Register a command to open the panel
    ctx.registerCommand({
      id: '${id}.open',
      label: 'Open ${opts.name}',
      category: '${opts.name}',
      callback: () => ctx.executeCommand('workbench.action.openPanel', '${id}-panel'),
    })

    console.log(\`[extension] ${opts.name} activated\`)
  },

  deactivate() {
    console.log(\`[extension] ${opts.name} deactivated\`)
  },
})
`
  }

  if (opts.kind === 'command') {
    return `import { defineExtension } from '@idexal/sdk'

export default defineExtension({
  manifest: require('./manifest.json'),

  activate(ctx) {
    // Register commands
    ctx.registerCommand({
      id: '${id}.run',
      label: 'Run ${opts.name}',
      category: '${opts.name}',
      callback: async () => {
        const root = ctx.getWorkspaceRoot()
        ctx.showInformationMessage(\`${opts.name}: Running in \${root || 'no workspace'}\`)
      },
    })

    ctx.registerCommand({
      id: '${id}.hello',
      label: '${opts.name}: Say Hello',
      category: '${opts.name}',
      callback: () => {
        ctx.showInformationMessage('Hello from ${opts.name}!')
      },
    })

    console.log(\`[extension] ${opts.name} activated\`)
  },
})
`
  }

  if (opts.kind === 'theme') {
    return `import { defineExtension } from '@idexal/sdk'

export default defineExtension({
  manifest: require('./manifest.json'),

  activate(ctx) {
    ctx.registerTheme({
      id: '${id}-theme',
      label: '${opts.name} Theme',
      type: 'dark',
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5',
        'editorLineNumber.foreground': '#3b4261',
        'editorCursor.foreground': '#c0caf5',
        'editor.selectionBackground': '#283457',
        'sideBar.background': '#1a1b26',
        'statusBar.background': '#16161e',
      },
      tokenColors: [
        { scope: 'comment', settings: { foreground: '#565f89', fontStyle: 'italic' } },
        { scope: 'keyword', settings: { foreground: '#bb9af7' } },
        { scope: 'string', settings: { foreground: '#9ece6a' } },
        { scope: 'number', settings: { foreground: '#ff9e64' } },
      ],
    })

    console.log(\`[extension] ${opts.name} theme registered\`)
  },
})
`
  }

  // Full extension
  return `import { defineExtension } from '@idexal/sdk'
import React from 'react'

function DashboardPanel() {
  return (
    <div style={{ padding: 16, color: '#c9d1d9' }}>
      <h2>📊 ${opts.name} Dashboard</h2>
      <p>Extension dashboard with custom content.</p>
    </div>
  )
}

export default defineExtension({
  manifest: require('./manifest.json'),

  activate(ctx) {
    // Panel
    ctx.registerPanel({
      id: '${id}-panel',
      title: '${opts.name}',
      icon: '📊',
      component: DashboardPanel,
    })

    // Commands
    ctx.registerCommand({
      id: '${id}.open',
      label: 'Open ${opts.name}',
      category: '${opts.name}',
      callback: () => ctx.executeCommand('workbench.action.openPanel', '${id}-panel'),
    })

    // Status bar
    ctx.registerStatusBar({
      id: '${id}-status',
      text: '$(icon) ${opts.name}',
      position: 'right',
      command: '${id}.open',
    })

    console.log(\`[extension] ${opts.name} activated\`)
  },
})
`
}

function generatePackageJson(opts: ScaffoldOptions): string {
  const id = opts.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  return JSON.stringify({
    name: `idexal-ext-${id}`,
    version: '0.1.0',
    description: opts.description,
    main: 'index.ts',
    idexal: { extension: true },
    scripts: {
      build: 'tsc',
      test: 'vitest',
    },
    devDependencies: {
      '@types/react': '^18.0.0',
      typescript: '^5.0.0',
    },
    dependencies: {
      '@idexal/sdk': '^1.0.0',
      react: '^18.0.0',
    },
  }, null, 2)
}

function generateReadme(opts: ScaffoldOptions): string {
  return `# ${opts.name}

${opts.description}

## Installation

1. Open Idexal IDE
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "${opts.name}"
4. Click Install

## Development

\`\`\`bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test
\`\`\`

## API Reference

This extension uses the Idexal Plugin SDK. See the [SDK documentation](https://idexal.com/docs/extensions) for details.

## License

MIT
`
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'node',
      jsx: 'react-jsx',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: 'dist',
      declaration: true,
    },
    include: ['src/**/*'],
  }, null, 2)
}

// ── Public API ─────────────────────────────────────────

export interface ScaffoldResult {
  files: { path: string; content: string }[]
}

/**
 * Generate extension scaffold files.
 * Returns an array of files that can be written to disk.
 */
export function generateScaffold(opts: ScaffoldOptions): ScaffoldResult {
  const id = opts.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  const files = [
    { path: 'manifest.json', content: generateManifest(opts) },
    { path: 'src/index.ts', content: generateExtensionEntry(opts) },
    { path: 'package.json', content: generatePackageJson(opts) },
    { path: 'README.md', content: generateReadme(opts) },
    { path: 'tsconfig.json', content: generateTsConfig() },
  ]

  return { files }
}

/**
 * Get a list of available extension kinds with descriptions.
 */
export function getExtensionKinds(): { id: ScaffoldOptions['kind']; label: string; description: string }[] {
  return [
    { id: 'panel', label: 'Custom Panel', description: 'Add a custom panel to the IDE' },
    { id: 'command', label: 'Commands', description: 'Register new commands and keybindings' },
    { id: 'theme', label: 'Theme', description: 'Create a custom color theme' },
    { id: 'language', label: 'Language Support', description: 'Add language highlighting and snippets' },
    { id: 'agent', label: 'AI Agent', description: 'Create a custom AI agent' },
    { id: 'full', label: 'Full Extension', description: 'Panel + commands + status bar + more' },
  ]
}
