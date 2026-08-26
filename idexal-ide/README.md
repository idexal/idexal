# Idexal IDE

<p align="center">
  <img src="public/icon.png" alt="Idexal IDE" width="128" height="128" />
</p>

<h3 align="center">Professional Multi-Agent AI-Powered IDE</h3>

<p align="center">
  A full-featured desktop IDE with built-in AI assistance, a high-performance Rust engine,
  and a companion CLI tool — built to compete with the best.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#cli-tool">CLI Tool</a> •
  <a href="#ai-providers">AI Providers</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#development">Development</a> •
  <a href="#plugins">Plugins</a>
</p>

---

## Features

### 🖥️ Desktop IDE

| Feature | Description |
|---------|-------------|
| **Monaco Editor** | Full VS Code editor with IntelliSense, multi-cursor, minimap |
| **Integrated Terminal** | xterm.js-based terminal with tabs and split panes |
| **Git Integration** | Status, diff, commit, blame — all in the UI |
| **AI Chat Panel** | Context-aware chat with your codebase |
| **Plugin System** | Extend with custom panels and commands |
| **Theme Builder** | Create and switch between themes |
| **Code Snippets** | Snippet manager with language-specific templates |
| **Symbol Outline** | Real-time symbol extraction via Rust tree-sitter |

### 🤖 AI Providers

| Provider | Chat | Streaming | Context | Models |
|----------|------|-----------|---------|--------|
| **OpenAI** | ✅ | ✅ | ✅ | GPT-4o, GPT-4, GPT-3.5 |
| **Anthropic** | ✅ | ✅ | ✅ | Claude 3.5 Sonnet, Haiku |
| **Google** | ✅ | ✅ | ✅ | Gemini Pro |
| **Mistral** | ✅ | ✅ | ✅ | Mistral Large, Medium |
| **Ollama** | ✅ | ✅ | ✅ | Any local model |
| **Custom** | ✅ | ✅ | ✅ | Any OpenAI-compatible API |

### 🖥️ CLI Tool

```bash
# Analyze your project
idexal analyze

# Search for symbols
idexal search Config

# Interactive chat
idexal chat

# Ask a question
idexal ask "How does the plugin system work?"

# Index project for fast search
idexal index
```

### ⚡ Rust Engine

| Capability | Description |
|------------|-------------|
| **Tree-sitter Parser** | 7 languages (Rust, TS, JS, Python, Go, C, C++) |
| **TCP Server** | JSON-RPC over TCP for IDE ↔ engine communication |
| **N-API Binding** | Direct .node native module for Electron |
| **Vector Store** | Semantic code search with embedding support |
| **Code Index** | Project-wide symbol database |
| **Memory System** | Long-term project memory across sessions |

---

## Installation

### Download

| Platform | Format | Link |
|----------|--------|------|
| **Windows** | NSIS Installer (.exe) | [Download](https://github.com/idexal/idexal-ide/releases/latest) |
| **Windows** | Portable (.exe) | [Download](https://github.com/idexal/idexal-ide/releases/latest) |
| **macOS** | DMG (Intel) | [Download](https://github.com/idexal/idexal-ide/releases/latest) |
| **macOS** | DMG (Apple Silicon) | [Download](https://github.com/idexal/idexal-ide/releases/latest) |
| **Linux** | AppImage | [Download](https://github.com/idexal/idexal-ide/releases/latest) |
| **Linux** | DEB (Debian/Ubuntu) | [Download](https://github.com/idexal/idexal-ide/releases/latest) |
| **Linux** | RPM (Fedora/RHEL) | [Download](https://github.com/idexal/idexal-ide/releases/latest) |

### From Source

```bash
# Clone the repository
git clone https://github.com/idexal/idexal-ide.git
cd idexal-ide/freebuff-ide

# Install dependencies
npm install

# Install Rust (for engine)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the Rust engine
npm run build:rust

# Start development
npm run dev
```

---

## CLI Tool

The `idexal` CLI is a standalone Rust binary that competes with Claude Code and Codex.

### Commands

| Command | Description |
|---------|-------------|
| `idexal version` | Show version info |
| `idexal analyze` | Visual project analysis |
| `idexal search <query>` | Search codebase symbols |
| `idexal chat` | Interactive chat mode |
| `idexal ask "<question>"` | One-shot question |
| `idexal index` | Build project symbol index |

### Example

```bash
$ cd my-project
$ idexal analyze

📊 Project Analysis: my-project
📁 Files: 314
├── TypeScript: 159
├── JavaScript: 120
└── Rust: 19
📈 Symbols: 11,367
├── Functions: 1,024
├── Classes: 436
├── Types: 892
└── Interfaces: 215
🌐 Languages: 7 (TypeScript, JavaScript, Rust, Python, Go, C, C++)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Renderer (React + Vite)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Monaco   │ │ xterm.js │ │ Chat AI  │           │
│  │ Editor   │ │ Terminal │ │ Panel    │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └─────────────┼────────────┘                  │
│                     │ useEngine() hook              │
├─────────────────────┼───────────────────────────────┤
│  Preload (contextBridge)                            │
│  ipcRenderer.invoke('engine-xxx')                   │
├─────────────────────┼───────────────────────────────┤
│  Main Process (Electron)                            │
│  ipcMain.handle() ──► engine.xxx()                  │
├─────────────────────┼───────────────────────────────┤
│  Native Module (.node) or TCP Server                │
│  ┌──────────────────┴────────────────────┐         │
│  │  Rust Engine (idexal-engine)           │         │
│  │  • Tree-sitter parser (7 languages)   │         │
│  │  • Vector store + Code index          │         │
│  │  • Project memory system              │         │
│  │  • JSON-RPC over TCP                  │         │
│  └───────────────────────────────────────┘         │
└─────────────────────────────────────────────────────┘
```

### Security Model

| Layer | Protection |
|-------|-----------|
| **Renderer** | `webSecurity: true`, `sandbox: true` |
| **IPC** | Path validation on all file handlers |
| **Git** | `execFile` with argument arrays (no shell) |
| **Environment** | Whitelist of 16 safe keys only |
| **Network** | SSRF protection, localhost blocked |
| **URLs** | Only `https:` and `http:` protocols allowed |

---

## Development

### Prerequisites

- **Node.js** 20+
- **Rust** (for engine)
- **npm** or **pnpm**

### Quick Start

```bash
# Install all dependencies
npm install

# Build the Rust engine
npm run build:rust

# Start development server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite + Electron in dev mode |
| `npm run build` | Build Vite + Electron for production |
| `npm run build:rust` | Build Rust engine + copy .node |
| `npm run build:cli` | Build CLI binary only |
| `npm run test` | Run vitest in watch mode |
| `npm run test:run` | Run all tests once |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run dist` | Package for current platform |
| `npm run dist:win` | Package for Windows |
| `npm run dist:mac` | Package for macOS |
| `npm run dist:linux` | Package for Linux |
| `npm run dist:all` | Package for all platforms |
| `npm run release` | Full release build (current platform) |
| `npm run release:all` | Full release build (all platforms) |

### Rust Engine

```bash
cd rust-engine

# Check
cargo check

# Test
cargo test

# Build release
cargo build --release

# Run CLI
./target/release/idexal --help
```

---

## Plugins

### Built-in Plugins

| Plugin | Description |
|--------|-------------|
| **Git Advanced** | Branch management, stash, cherry-pick |
| **Theme Builder** | Custom theme editor |
| **Code Metrics** | Code quality analysis |
| **Schema Visualizer** | Database schema viewer |
| **Live Share** | Collaborative editing (WebSocket) |
| **Extension Marketplace** | Browse and install plugins |

### Plugin API

```typescript
// Register a custom panel
ide.registerPanel({
  id: 'my-panel',
  title: 'My Panel',
  icon: 'Puzzle',
  component: MyPanelComponent,
});

// Register a command
ide.registerCommand({
  id: 'myCommand',
  label: 'My Command',
  handler: () => { /* ... */ },
});

// Listen to editor events
ide.onDidChangeActiveFile((filePath) => {
  console.log('Active file:', filePath);
});
```

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests (requires built app)
npm run test:e2e

# Rust tests
cd rust-engine && cargo test

# Type check
npm run typecheck
```

---

## License

Copyright © 2026 Idexal. All rights reserved.
