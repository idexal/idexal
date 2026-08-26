/**
 * DocumentationPortal — Developer documentation portal with Getting Started,
 * API Reference, CLI Guide, and Architecture sections.
 */

import React, { useState } from 'react'
import {
  FaBook, FaRocket, FaCode, FaTerminal, FaCubes, FaCopy, FaCheck,
  FaChevronRight, FaChevronDown, FaExternalLinkAlt, FaSearch,
  FaPlug, FaPalette, FaRobot, FaFileCode, FaDatabase, FaGitAlt,
  FaShieldAlt, FaBolt, FaUsers, FaLayerGroup,
} from '../Icon'

type Tab = 'getting-started' | 'api' | 'cli' | 'architecture'

// ── Reusable Code Block ───────────────────────────────────

function CodeBlock({ code, language, title }: { code: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-lg border border-ide-border/40 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface/80 border-b border-ide-border/30">
          <span className="text-[10px] text-ide-text-dim font-mono">{title}{language ? ` (${language})` : ''}</span>
          <button onClick={handleCopy} className="p-0.5 hover:bg-ide-surface-alt rounded text-ide-text-dim transition-colors">
            {copied ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
          </button>
        </div>
      )}
      <pre className="px-3 py-2 text-[10px] font-mono text-ide-text-dim overflow-x-auto bg-ide-bg/80 whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

// ── Collapsible Section ───────────────────────────────────

function DocSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-ide-border/30 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-alt/30 transition-colors text-left">
        {open ? <FaChevronDown size={10} className="text-ide-text-dim" /> : <FaChevronRight size={10} className="text-ide-text-dim" />}
        <span className="text-blue-400">{icon}</span>
        <span className="text-xs font-semibold text-ide-text flex-1">{title}</span>
      </button>
      {open && <div className="px-3 pb-3 border-t border-ide-border/20">{children}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  GETTING STARTED TAB
// ══════════════════════════════════════════════════════════

function GettingStartedTab() {
  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <FaRocket size={16} className="text-blue-400" />
          <span className="text-sm font-bold text-blue-300">Getting Started with Idexal</span>
        </div>
        <p className="text-[11px] text-ide-text-dim leading-relaxed">
          Idexal is a high-performance AI-native IDE with an integrated CLI. Build faster with
          multi-model AI, real-time collaboration, and 87+ built-in tools.
        </p>
      </div>

      {/* Installation */}
      <DocSection title="Installation" icon={<FaBolt size={12} />} defaultOpen>
        <div className="space-y-3 pt-3">
          <p className="text-[10px] text-ide-text-dim">Download from <span className="text-blue-400">idexa.com</span> or use the package manager:</p>
          <CodeBlock title="Windows (winget)" language="shell" code={`winget install Idexal.IdexalIDE`} />
          <CodeBlock title="macOS (Homebrew)" language="shell" code={`brew install --cask idexal`} />
          <CodeBlock title="Linux (AppImage)" language="shell" code={`# Download from https://github.com/idexal/idexal-ide/releases
chmod +x Idexal-*.AppImage
./Idexal-*.AppImage`} />
          <CodeBlock title="CLI (npm)" language="shell" code={`npm install -g @idexa/cli

# Verify installation
idexa --version`} />
        </div>
      </DocSection>

      {/* Quick Start */}
      <DocSection title="Quick Start (5 minutes)" icon={<FaRocket size={12} />}>
        <div className="space-y-3 pt-3">
          <div className="space-y-1.5">
            {[
              { step: 1, text: 'Open Idexal IDE and select a folder', code: null },
              { step: 2, text: 'Initialize your project', code: 'idexa init' },
              { step: 3, text: 'Configure your AI provider', code: 'idexa config set apiKey sk-...' },
              { step: 4, text: 'Start coding with AI assistance', code: 'idexa chat' },
              { step: 5, text: 'Open the Command Palette', code: 'Ctrl+K (or Cmd+K on macOS)' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-2 py-1">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-blue-400">{s.step}</span>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-ide-text">{s.text}</span>
                  {s.code && <CodeBlock code={s.code} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DocSection>

      {/* Configuration */}
      <DocSection title="Configuration" icon={<FaPlug size={12} />}>
        <div className="space-y-3 pt-3">
          <p className="text-[10px] text-ide-text-dim">Idexal stores config in <code className="text-blue-400">.idexa.json</code> at your project root.</p>
          <CodeBlock title=".idexa.json" language="json" code={`{
  "name": "my-project",
  "aiProvider": { "type": "openai" },
  "defaultModel": "gpt-4",
  "features": {
    "autoContext": true,
    "gitIntegration": true,
    "streaming": true,
    "codeAnalysis": true
  },
  "context": {
    "include": ["src/**", "lib/**"],
    "exclude": ["node_modules/**", "dist/**"]
  }
}`} />
          <div className="text-[10px] text-ide-text-dim space-y-1">
            <p><strong className="text-ide-text">AI Providers:</strong> OpenAI, Anthropic, Ollama (local), or custom endpoint</p>
            <p><strong className="text-ide-text">Models:</strong> GPT-4, Claude 3, Llama 3, Mistral, or any OpenAI-compatible API</p>
          </div>
        </div>
      </DocSection>

      {/* Keyboard Shortcuts */}
      <DocSection title="Essential Keyboard Shortcuts" icon={<FaTerminal size={12} />}>
        <div className="pt-3 space-y-1">
          {[
            { keys: 'Ctrl+K', desc: 'Command Palette' },
            { keys: 'Ctrl+P', desc: 'Quick Open file' },
            { keys: 'Ctrl+`', desc: 'Toggle Terminal' },
            { keys: 'Ctrl+B', desc: 'Toggle Sidebar' },
            { keys: 'Ctrl+Shift+A', desc: 'Open AI Chat' },
            { keys: 'Ctrl+Shift+G', desc: 'Git Panel' },
            { keys: 'Ctrl+Shift+M', desc: 'Markdown Preview' },
            { keys: 'Ctrl+Shift+K', desc: 'SSH Manager' },
            { keys: 'Ctrl+Shift+D', desc: 'Database Explorer' },
            { keys: 'Ctrl+E', desc: 'Extension Developer' },
            { keys: 'Ctrl+/', desc: 'Keyboard Shortcuts Overlay' },
          ].map(s => (
            <div key={s.keys} className="flex items-center gap-2 py-1 border-b border-ide-border/20 last:border-0">
              <kbd className="px-1.5 py-0.5 bg-ide-surface border border-ide-border rounded text-[9px] font-mono text-ide-text-dim whitespace-nowrap">
                {s.keys}
              </kbd>
              <span className="text-[10px] text-ide-text-dim">{s.desc}</span>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  API REFERENCE TAB
// ══════════════════════════════════════════════════════════

function APIReferenceTab() {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-1">
          <FaCode size={14} className="text-purple-400" />
          <span className="text-xs font-bold text-purple-300">Extension SDK API Reference</span>
        </div>
        <p className="text-[10px] text-ide-text-dim">Full TypeScript API for building Idexal extensions. Import from <code className="text-purple-400">@idexal/sdk</code></p>
      </div>

      {/* ExtensionContext */}
      <DocSection title="ExtensionContext" icon={<FaCubes size={12} />} defaultOpen>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">The context object passed to your extension's <code className="text-blue-400">activate()</code> function.</p>
          <div className="space-y-1">
            {[
              { sig: 'registerCommand(cmd: RegisteredCommand): Disposable', desc: 'Register a command with id, label, and callback', cat: 'Commands' },
              { sig: 'registerPanel(panel: RegisteredPanel): Disposable', desc: 'Register a custom panel with React component', cat: 'Panels' },
              { sig: 'registerTheme(theme: ThemeContribution): Disposable', desc: 'Register a color theme (dark/light)', cat: 'Themes' },
              { sig: 'registerLanguage(lang: LanguageContribution): Disposable', desc: 'Register language support with file extensions', cat: 'Languages' },
              { sig: 'registerAgent(agent: AgentContribution): Disposable', desc: 'Register a custom AI agent', cat: 'AI' },
              { sig: 'registerStatusBar(item: StatusBarContribution): Disposable', desc: 'Add a status bar item', cat: 'UI' },
            ].map((m, i) => (
              <div key={i} className="rounded-lg border border-ide-border/20 p-2 hover:border-purple-500/20 transition-colors">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">{m.cat}</span>
                </div>
                <code className="text-[10px] font-mono text-emerald-400">{m.sig}</code>
                <p className="text-[9px] text-ide-text-dim mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </DocSection>

      {/* File System API */}
      <DocSection title="File System API" icon={<FaFileCode size={12} />}>
        <div className="space-y-2 pt-3">
          <CodeBlock title="Read a file" language="typescript" code={`const content = await ctx.readFile('src/main.ts')
console.log(content)  // "import React from 'react'..."`} />
          <CodeBlock title="Write a file" language="typescript" code={`await ctx.writeFile('output/result.txt', 'Hello from my extension!')`} />
          <CodeBlock title="List directory" language="typescript" code={`const entries = await ctx.readDirectory('src/')
// → [{ name: 'main.ts', type: 'file' },
//    { name: 'utils', type: 'directory' }, ...]`} />
          <CodeBlock title="Open in editor" language="typescript" code={`ctx.openFile('src/components/App.tsx')
// Jumps to file in the editor`}
          />
        </div>
      </DocSection>

      {/* Notification API */}
      <DocSection title="Notification API" icon={<FaBolt size={12} />}>
        <div className="space-y-2 pt-3">
          <CodeBlock language="typescript" code={`// Info notification
ctx.showInformationMessage('Build completed successfully!')

// Warning notification
ctx.showWarningMessage('Disk space is running low')

// Error notification
ctx.showErrorMessage('Failed to connect to database')`} />
        </div>
      </DocSection>

      {/* Webview API */}
      <DocSection title="Webview API" icon={<FaLayerGroup size={12} />}>
        <div className="space-y-2 pt-3">
          <CodeBlock title="Create a webview panel" language="typescript" code={`const panel = ctx.createWebviewPanel({
  title: 'My Webview',
  icon: '🌐',
  viewType: 'myWebview',
  showOptions: { area: 'right' }
})

// Set HTML content
panel.webview.html = \`
  <html>
    <body style="font-family: sans-serif; padding: 20px;">
      <h2>Hello from my extension!</h2>
      <button onclick="vscode.postMessage('click')">
        Click me
      </button>
    </body>
  </html>
\`

// Listen for messages from webview
panel.onDidDispose(() => {
  console.log('Webview closed')
})`} />
        </div>
      </DocSection>

      {/* Settings API */}
      <DocSection title="Settings API" icon={<FaPlug size={12} />}>
        <div className="space-y-2 pt-3">
          <CodeBlock language="typescript" code={`// Get a setting
const apiKey = ctx.getSetting<string>('apiKey')
const maxTokens = ctx.getSetting<number>('maxTokens', 4096)

// Set a setting
ctx.setSetting('theme', 'dark')
ctx.setSetting('autoSave', true)`} />
        </div>
      </DocSection>

      {/* Manifest Schema */}
      <DocSection title="Manifest Schema" icon={<FaFileCode size={12} />}>
        <div className="space-y-2 pt-3">
          <CodeBlock title="manifest.json" language="json" code={`{
  "id": "my-company.my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "description": "Does cool things",
  "author": "My Company",
  "icon": "📦",
  "tags": ["productivity", "ui"],
  "engines": { "idexal": ">=1.0.0" },
  "contributes": {
    "commands": [
      { "command": "my-ext.run", "title": "Run Extension" }
    ],
    "panels": [
      { "id": "my-panel", "title": "My Panel", "icon": "📦" }
    ],
    "themes": [
      { "id": "my-theme", "label": "My Theme", "type": "dark" }
    ]
  },
  "activationEvents": [
    { "event": "onStartup" }
  ]
}`} />
        </div>
      </DocSection>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  CLI GUIDE TAB
// ══════════════════════════════════════════════════════════

function CLIGuideTab() {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-1">
          <FaTerminal size={14} className="text-emerald-400" />
          <span className="text-xs font-bold text-emerald-300">Idexa CLI Reference</span>
        </div>
        <p className="text-[10px] text-ide-text-dim">Full-featured terminal CLI for AI-assisted development. Install with <code className="text-emerald-400">npm install -g @idexa/cli</code></p>
      </div>

      {/* Core Commands */}
      <DocSection title="idexa init" icon={<FaRocket size={12} />} defaultOpen>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Initialize Idexa in your project. Creates <code className="text-blue-400">.idexa.json</code> with project settings.</p>
          <CodeBlock language="shell" code={`# Interactive setup
idexa init

# Force reinitialize
idexa init --force

# Use a template
idexa init --template react-typescript`} />
          <div className="text-[9px] text-ide-text-dim space-y-0.5">
            <p>• Auto-detects project type (React, Vue, Node, Rust, Python, etc.)</p>
            <p>• Prompts for AI provider selection (OpenAI, Anthropic, Ollama, Custom)</p>
            <p>• Updates .gitignore with Idexa entries</p>
          </div>
        </div>
      </DocSection>

      <DocSection title="idexa chat" icon={<FaRobot size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Interactive AI chat with project context. The model has access to your files and can read/write code.</p>
          <CodeBlock language="shell" code={`# Start interactive chat
idexa chat

# Send a single message
idexa chat "Explain the architecture of this project"

# Use a specific model
idexa chat --model claude-3-opus

# JSON output (for scripting)
idexa chat --json "List all TypeScript files"`} />
          <div className="text-[9px] text-ide-text-dim space-y-0.5 mt-1">
            <p><strong className="text-ide-text">Slash commands:</strong></p>
            <p>• <code className="text-emerald-400">/help</code> — Show available commands</p>
            <p>• <code className="text-emerald-400">/clear</code> — Clear conversation history</p>
            <p>• <code className="text-emerald-400">/tools</code> — List available AI tools</p>
            <p>• <code className="text-emerald-400">/compact</code> — Compress context window</p>
          </div>
        </div>
      </DocSection>

      <DocSection title="idexa agent" icon={<FaRobot size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Create and run custom AI agents with specialized roles.</p>
          <CodeBlock language="shell" code={`# List all agents
idexa agent list

# Create a code reviewer agent
idexa agent create reviewer --type review

# Create a test generator
idexa agent create test-gen --type test

# Run an agent
idexa agent run reviewer

# Stop a running agent
idexa agent stop`} />
          <div className="text-[9px] text-ide-text-dim mt-1">
            <p><strong className="text-ide-text">Agent types:</strong> code, review, test, docs, custom</p>
          </div>
        </div>
      </DocSection>

      <DocSection title="idexa config" icon={<FaPlug size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Manage project and global configuration.</p>
          <CodeBlock language="shell" code={`# Get a config value
idexa config get apiKey
idexa config get defaultModel

# Set a config value
idexa config set apiKey sk-abc123...
idexa config set defaultModel gpt-4
idexa config set aiProvider.type anthropic

# List all config
idexa config list

# Reset to defaults
idexa config reset`} />
        </div>
      </DocSection>

      <DocSection title="idexa analyze" icon={<FaSearch size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Analyze codebase structure, dependencies, and quality.</p>
          <CodeBlock language="shell" code={`# Analyze current project
idexa analyze

# Analyze with JSON output
idexa analyze --json

# Analyze specific directory
idexa analyze ./src --depth 3`} />
        </div>
      </DocSection>

      <DocSection title="idexa context" icon={<FaLayerGroup size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Manage project context for AI interactions.</p>
          <CodeBlock language="shell" code={`# Show current context
idexa context show

# Add file to context
idexa context add src/api.ts

# Remove from context
idexa context remove src/old.ts

# Clear context
idexa context clear`} />
        </div>
      </DocSection>

      <DocSection title="idexa history" icon={<FaDatabase size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Browse and search past AI conversations.</p>
          <CodeBlock language="shell" code={`# List recent conversations
idexa history list

# Search history
idexa history search "database migration"

# Export a conversation
idexa history export <id> --format md

# Clear history
idexa history clear`} />
        </div>
      </DocSection>

      <DocSection title="idexa deploy" icon={<FaShieldAlt size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Deploy your project from the CLI.</p>
          <CodeBlock language="shell" code={`# Deploy to configured target
idexa deploy

# Deploy to staging
idexa deploy --env staging

# Deploy with preview
idexa deploy --preview`} />
        </div>
      </DocSection>

      <DocSection title="idexa doctor" icon={<FaBolt size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Diagnose issues with your Idexa installation.</p>
          <CodeBlock language="shell" code={`# Run diagnostics
idexa doctor

# Check specific component
idexa doctor --check api-key
idexa doctor --check project-config`} />
        </div>
      </DocSection>

      <DocSection title="idexa generate" icon={<FaCode size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">AI-powered code generation from the terminal.</p>
          <CodeBlock language="shell" code={`# Generate a React component
idexa generate component UserCard --props "name: string, email: string"

# Generate an API endpoint
idexa generate endpoint /api/users --method POST

# Generate tests for a file
idexa generate tests src/utils/parser.ts

# Generate from natural language
idexa generate "a Express middleware for rate limiting"`} />
        </div>
      </DocSection>

      <DocSection title="idexa mcp" icon={<FaPlug size={12} />}>
        <div className="space-y-2 pt-3">
          <p className="text-[10px] text-ide-text-dim">Connect to MCP (Model Context Protocol) servers for external tools.</p>
          <CodeBlock language="shell" code={`# List connected MCP servers
idexa mcp list

# Add an MCP server
idexa mcp add my-server --url http://localhost:3000

# Remove an MCP server
idexa mcp remove my-server

# Call a tool from an MCP server
idexa mcp call my-server search --arg query="react hooks"`} />
        </div>
      </DocSection>

      {/* Global Options */}
      <DocSection title="Global Options" icon={<FaTerminal size={12} />}>
        <div className="pt-3 space-y-1">
          {[
            { flag: '--json', desc: 'Output in JSON format (for scripting and CI/CD)' },
            { flag: '--verbose', desc: 'Enable verbose logging' },
            { flag: '--no-color', desc: 'Disable colored output' },
            { flag: '--config <path>', desc: 'Use a custom config file' },
            { flag: '--model <name>', desc: 'Override the default AI model' },
            { flag: '--provider <type>', desc: 'Override the AI provider' },
          ].map(o => (
            <div key={o.flag} className="flex items-start gap-2 py-1 border-b border-ide-border/20 last:border-0">
              <code className="text-[10px] font-mono text-emerald-400 whitespace-nowrap">{o.flag}</code>
              <span className="text-[10px] text-ide-text-dim">{o.desc}</span>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ARCHITECTURE TAB
// ══════════════════════════════════════════════════════════

function ArchitectureTab() {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20">
        <div className="flex items-center gap-2 mb-1">
          <FaLayerGroup size={14} className="text-orange-400" />
          <span className="text-xs font-bold text-orange-300">System Architecture</span>
        </div>
        <p className="text-[10px] text-ide-text-dim">How Idexal IDE and CLI are structured internally.</p>
      </div>

      <DocSection title="High-Level Architecture" icon={<FaLayerGroup size={12} />} defaultOpen>
        <div className="pt-3">
          <CodeBlock language="text" code={`┌──────────────────────────────────────────────────────┐
│                   IDEXAL IDE (Electron)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Sidebar  │  │  Editor  │  │   Right Panel    │   │
│  │ Explorer │  │  Monaco  │  │ (AI/Chat/Git/..) │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │                 │              │
│  ┌────┴──────────────┴─────────────────┴─────────┐   │
│  │              Zustand State Store               │   │
│  └────────────────────┬──────────────────────────┘   │
│                       │                              │
│  ┌────────────────────┴──────────────────────────┐   │
│  │          Services Layer                        │   │
│  │  ┌─────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │   │
│  │  │   AI    │ │  Git   │ │  MCP   │ │Collab │ │   │
│  │  │Provider │ │Service │ │ Client │ │(Yjs)  │ │   │
│  │  └─────────┘ └────────┘ └────────┘ └───────┘ │   │
│  └───────────────────────────────────────────────┘   │
│                       │                              │
│  ┌────────────────────┴──────────────────────────┐   │
│  │         Rust Engine (via WASM/IPC)             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │  Parser  │ │  Linter  │ │  Formatter   │   │   │
│  │  │(tree-sit)│ │          │ │              │   │   │
│  │  └──────────┘ └──────────┘ └──────────────┘   │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                  IDEXA CLI (Node.js)                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
│  │ chat │ │ agent│ │ init │ │analyze│ │ generate │  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └────┬─────┘  │
│     └────────┴────────┴────────┴───────────┘         │
│              AI Provider (OpenAI/Anthropic/Local)     │
└──────────────────────────────────────────────────────┘`} />
        </div>
      </DocSection>

      <DocSection title="Tech Stack" icon={<FaCubes size={12} />}>
        <div className="pt-3 space-y-1">
          {[
            { layer: 'Desktop Shell', tech: 'Electron 28 + Chromium', color: 'text-blue-400' },
            { layer: 'UI Framework', tech: 'React 18 + TypeScript + Tailwind CSS', color: 'text-cyan-400' },
            { layer: 'State Management', tech: 'Zustand (lightweight, no boilerplate)', color: 'text-purple-400' },
            { layer: 'Editor', tech: 'Monaco Editor (VS Code\'s editor core)', color: 'text-green-400' },
            { layer: 'Syntax Parsing', tech: 'Tree-sitter via Rust WASM', color: 'text-red-400' },
            { layer: 'AI Integration', tech: 'Multi-provider (OpenAI, Anthropic, Ollama)', color: 'text-pink-400' },
            { layer: 'Collaboration', tech: 'Yjs CRDT + WebSocket', color: 'text-yellow-400' },
            { layer: 'CLI Runtime', tech: 'Node.js + Commander.js + Inquirer', color: 'text-emerald-400' },
            { layer: 'Build System', tech: 'Vite + esbuild (fast HMR)', color: 'text-orange-400' },
            { layer: 'Desktop Install', tech: 'electron-builder (NSIS/DMG/AppImage)', color: 'text-indigo-400' },
          ].map(t => (
            <div key={t.layer} className="flex items-center gap-2 py-1 border-b border-ide-border/20 last:border-0">
              <span className={`text-[10px] font-semibold w-28 ${t.color}`}>{t.layer}</span>
              <span className="text-[10px] text-ide-text-dim">{t.tech}</span>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Project Structure" icon={<FaFileCode size={12} />}>
        <div className="pt-3">
          <CodeBlock language="text" code={`idexal-ide/
├── src/
│   ├── components/          # React UI components
│   │   ├── AI/             # Chat, Agent Dashboard, Code Actions
│   │   ├── Editor/         # Monaco Editor, Breadcrumbs
│   │   ├── Git/            # Git panels, Staging, History
│   │   ├── Layout/         # TitleBar, Sidebar, StatusBar, CommandPalette
│   │   ├── Collaboration/  # CRDT cursors, chat, presence
│   │   ├── Extensions/     # Extension developer tools
│   │   └── Benchmark/      # Performance comparison
│   ├── services/           # Business logic layer
│   │   ├── aiStreamingService.ts    # Multi-model AI streaming
│   │   ├── collaborationService.ts  # Yjs CRDT management
│   │   ├── mcpClient.ts            # MCP server connections
│   │   ├── pluginSDK.ts            # Extension API types
│   │   └── workspaceStatsService.ts # Project analytics
│   ├── stores/             # Zustand state stores
│   ├── panels/             # Panel registry & shortcuts
│   └── extensions/         # Built-in extension samples
├── idexa-cli/              # CLI tool (separate package)
│   └── src/
│       ├── commands/       # CLI command implementations
│       ├── ai/             # AI provider, context, tools
│       └── utils/          # Helpers, history, streaming
├── e2e/                    # Playwright E2E tests
└── rust-engine/            # Rust WASM modules (parser, linter)`} />
        </div>
      </DocSection>

      <DocSection title="Data Flow" icon={<FaBolt size={12} />}>
        <div className="pt-3">
          <CodeBlock language="text" code={`User types in Editor
    ↓
Monaco Editor captures input
    ↓
editorStore.updateContent(path, content)
    ↓
├──→ Tree-sitter parser (Rust WASM) → Symbols, diagnostics
├──→ AI Streaming Service → Code actions, completions
├──→ Collaboration Service → Yjs CRDT sync → WebSocket → Peers
└──→ Git Service → Auto-detect changes → Status bar update

AI Chat Message
    ↓
ChatPanel sends to aiStreamingService
    ↓
AI Provider (OpenAI/Anthropic/Ollama) → Streaming response
    ↓
Tool calls (read_file, write_file, search, etc.)
    ↓
File system operations → Editor updates → Re-render`} />
        </div>
      </DocSection>

      <DocSection title="Extension System" icon={<FaPlug size={12} />}>
        <div className="pt-3">
          <CodeBlock language="text" code={`Extension loaded from marketplace or local folder
    ↓
manifest.json parsed → Validate schema
    ↓
activationEvents checked → Load when triggered
    ↓
activate(ExtensionContext) called
    ↓
├──→ ctx.registerCommand() → Added to Command Palette
├──→ ctx.registerPanel()   → Added to Panel Registry
├──→ ctx.registerTheme()   → Added to Theme Editor
├──→ ctx.registerAgent()   → Added to Agent Dashboard
└──→ ctx.registerStatusBar() → Added to StatusBar

Extension disposed when:
  - IDE closes
  - Extension disabled by user
  - deactivation() called`} />
        </div>
      </DocSection>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  MAIN PANEL
// ══════════════════════════════════════════════════════════

export default function DocumentationPortal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('getting-started')
  const [search, setSearch] = useState('')

  const tabs = [
    { key: 'getting-started' as const, label: 'Getting Started', icon: <FaRocket size={10} /> },
    { key: 'api' as const, label: 'API Reference', icon: <FaCode size={10} /> },
    { key: 'cli' as const, label: 'CLI Guide', icon: <FaTerminal size={10} /> },
    { key: 'architecture' as const, label: 'Architecture', icon: <FaLayerGroup size={10} /> },
  ]

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBook size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">Documentation</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-medium">v1.0</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-surface-alt rounded text-ide-text-secondary">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-dim hover:text-ide-text'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-ide-border/50">
        <div className="flex items-center gap-2 px-2 py-1 bg-ide-surface rounded border border-ide-border/50">
          <FaSearch size={10} className="text-ide-text-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search docs..."
            className="flex-1 bg-transparent text-[10px] outline-none text-ide-text placeholder:text-ide-text-dim/50" />
          {search && (
            <button onClick={() => setSearch('')} className="text-ide-text-dim hover:text-ide-text text-[10px]">×</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'getting-started' && <GettingStartedTab />}
        {tab === 'api' && <APIReferenceTab />}
        {tab === 'cli' && <CLIGuideTab />}
        {tab === 'architecture' && <ArchitectureTab />}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[9px] text-ide-text-dim status-bar-gradient">
        <div className="flex items-center gap-3">
          <span>📖 Idexal Docs v1.0</span>
          <a href="https://github.com/idexal/idexal-ide" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 hover:text-blue-400 transition-colors">
            <FaExternalLinkAlt size={8} /> GitHub
          </a>
          <a href="https://idexa.com" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 hover:text-blue-400 transition-colors">
            <FaExternalLinkAlt size={8} /> idexa.com
          </a>
        </div>
        <span>© 2024 Idexal</span>
      </div>
    </div>
  )
}
