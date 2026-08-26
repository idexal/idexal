# Architecture Overview

**Document Type:** Explanation (Understanding-oriented)
**Audience:** Developers, contributors, and technical stakeholders
**Goal:** Understand how Idexal IDE's components interact and why specific design decisions were made

---

## High-Level Architecture

Idexal IDE is a three-layer architecture combining the performance of Rust, the cross-platform capabilities of Electron, and the modern UI of React.

```
┌─────────────────────────────────────────────────┐
│                  User Interface                  │
│              (React + TypeScript)                │
│  ┌─────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ Monaco  │ │   AI    │ │    Terminal       │  │
│  │ Editor  │ │  Chat   │ │   (xterm.js)     │  │
│  └─────────┘ └─────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────┤
│                Electron Main                     │
│           (Node.js + IPC Bridge)                 │
│  ┌─────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │   IPC   │ │  File   │ │    Process        │  │
│  │ Handlers│ │ System  │ │    Manager        │  │
│  └─────────┘ └─────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────┤
│              Rust Engine (NAPI-RS)               │
│         (High-performance computation)           │
│  ┌─────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │  Parser │ │ Vector  │ │   Code Index      │  │
│  │ (Tree-  │ │  Store  │ │   (Search)        │  │
│  │ sitter) │ │         │ │                   │  │
│  └─────────┘ └─────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Layer 1: React UI (Renderer Process)

The user interface is built with React 18, TypeScript, and Tailwind CSS.

### Key Components

| Component | Purpose |
|---|---|
| `MonacoEditor` | Code editing with syntax highlighting, IntelliSense |
| `ChatPanel` | AI assistant with multi-agent support |
| `TerminalPanel` | Integrated terminal with xterm.js |
| `GitPanel` | Version control interface |
| `Sidebar` | File explorer, search, extensions |
| `TitleBar` | Application chrome, command palette trigger |
| `StatusBar` | Git branch, AI status, cursor position |

### State Management

All application state is managed through Zustand stores:

| Store | Purpose |
|---|---|
| `editorStore` | Open files, active tab, editor state |
| `settingsStore` | User preferences, AI config |
| `chatStore` | Chat messages, active provider |
| `fileStore` | File tree, file operations |

---

## Layer 2: Electron Main Process

The main process handles:

- **Window management** — Creating and managing browser windows
- **File system access** — Reading/writing files securely
- **IPC bridge** — Communication between renderer and main process
- **Native integrations** — Shell commands, system tray, notifications

### IPC Communication

```
Renderer (React) ←→ Preload Script ←→ Main Process
     ↓                    ↓                ↓
  React State      contextBridge     node-pty, fs, git
```

The preload script exposes a safe API through `contextBridge`:

```typescript
// electron/src/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  // ... more methods
})
```

---

## Layer 3: Rust Engine (NAPI-RS)

The Rust engine handles performance-critical operations through NAPI-RS bindings.

### Components

| Module | Purpose | Performance |
|---|---|---|
| `parser` | Tree-sitter based code parsing | ~10x faster than JS |
| `vector_store` | Semantic search with embeddings | ~50x faster than JS |
| `code_index` | Full-text code indexing | ~20x faster than JS |

### Why Rust?

- **Memory safety** without garbage collection
- **Zero-cost abstractions** for high-level code
- **Fearless concurrency** for parallel processing
- **Native performance** for parsing and indexing

### NAPI-RS Bridge

```rust
// rust-engine/src/lib.rs
#[napi]
pub fn parse_file(path: String) -> Result<ParseResult, Error> {
    // High-performance parsing with Tree-sitter
}

#[napi]
pub fn search_index(query: String, limit: u32) -> Result<Vec<SearchResult>, Error> {
    // Fast semantic search
}
```

---

## Data Flow

### Code Editing Flow

```
User types in Monaco Editor
    ↓
React state updates (editorStore)
    ↓
Debounced save (if auto-save enabled)
    ↓
IPC call: writeFile(path, content)
    ↓
Electron main process writes file
    ↓
File watcher detects change (chokidar)
    ↓
Index updated (Rust engine)
```

### AI Chat Flow

```
User sends message in ChatPanel
    ↓
Chat store updates with user message
    ↓
AI service routes to configured provider
    ↓
Streaming response via fetch/SSE
    ↓
Response parsed and displayed
    ↓
Context stored in conversation memory
```

---

## Security Model

### Renderer Isolation

- `nodeIntegration: false` — No direct Node.js access
- `contextIsolation: true` — Separate JavaScript contexts
- `sandbox: true` — Limited system access
- `webSecurity: true` — Same-origin policy enforced

### IPC Validation

All IPC messages are validated in the main process:

```typescript
ipcMain.handle('read-file', async (event, filePath) => {
  // Validate path is within workspace
  if (!isPathSafe(filePath, workspaceRoot)) {
    throw new Error('Access denied: path outside workspace')
  }
  return fs.readFile(filePath, 'utf-8')
})
```

---

## Extension Points

### Plugin System

Idexal IDE supports plugins through:

1. **Language Support** — Tree-sitter grammars for syntax highlighting
2. **AI Agents** — Custom agent definitions in JSON
3. **Themes** — Custom color schemes and icon sets
4. **Keybindings** — User-defined keyboard shortcuts

### Service Architecture

Services are designed for extensibility:

```typescript
// Services follow a common pattern
interface Service {
  initialize(): Promise<void>
  dispose(): void
}
```

---

## Performance Considerations

### Rust Engine Optimization

- **Lazy indexing** — Files indexed on-demand, not all at once
- **Incremental updates** — Only changed files re-indexed
- **Memory-efficient** — Streaming processing for large files

### React Optimization

- **Virtual scrolling** — File explorer handles 100K+ files
- **Debounced updates** — Editor state updates batched
- **Code splitting** — Heavy components lazy-loaded
- **Memoization** — Expensive computations cached

---

## Technology Decisions

### Why Electron over Tauri?

- Mature ecosystem with extensive library support
- Better compatibility with existing Node.js tooling
- Simpler IPC model for complex state management
- Established patterns for IDE development (VS Code precedent)

### Why Zustand over Redux?

- Simpler API with less boilerplate
- Better TypeScript support
- Smaller bundle size
- No action/reducer ceremony

### Why Tailwind over CSS Modules?

- Rapid prototyping with utility classes
- Consistent design system through config
- Smaller CSS bundle with purging
- Easy dark/light theme support

---

*Document: Explanation — Architecture Overview*
*Audience: Developers and contributors*
*Last updated: August 2026*