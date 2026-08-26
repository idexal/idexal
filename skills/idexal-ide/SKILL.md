---
name: idexal-ide
description: >
  Develop features, fix bugs, and refactor the Idexal IDE — a professional multi-agent AI-powered
  desktop IDE built with React, TypeScript, Vite, Electron, TailwindCSS, Zustand, Monaco Editor,
  and xterm.js. Use this skill whenever working on this codebase: adding panels, services, stores,
  AI provider integrations, editor features, terminal functionality, or any code inside freebuff-ide/.
---

# Idexal IDE Development Guide

## Architecture

```
src/
├── App.tsx                    ← 116 lines. Layout shell only. No panel imports.
├── panels/
│   └── panelRegistry.ts       ← Single source of truth: 70 panels, lazy-loaded
├── components/                ← 72 domain directories, one component each
│   ├── AI/                    ← ChatPanel, AgentDashboard, CodeIntelligencePanel
│   ├── Editor/                ← MonacoEditor, EditorArea
│   ├── Terminal/              ← TerminalPanel (xterm.js)
│   ├── Browser/               ← EmbeddedBrowser (iframe + tabs)
│   ├── Settings/              ← SettingsPanel, AIProviderSettings, EmbeddingSettings
│   └── ...                    ← 60+ other domain panels
├── services/                  ← Business logic, no UI
│   ├── aiProviders.ts         ← 14 AI provider definitions + model fetching
│   ├── aiStreamingService.ts  ← Streaming chat with provider-specific API formats
│   ├── fallbackService.ts     ← Automatic failover with health tracking
│   ├── embeddingService.ts    ← 8 embedding providers + 4 rerank providers
│   ├── searchProviderService.ts ← 7 search providers + RAG pipeline
│   ├── fileSystemService.ts   ← 3-tier: Electron → Browser FS → Mock
│   ├── browserFileService.ts  ← File System Access API + IndexedDB
│   └── ...                    ← 20+ other services
├── stores/                    ← Zustand state management
│   ├── editorStore.ts         ← Tabs, split view, content
│   ├── settingsStore.ts       ← Editor + AI settings, localStorage persistence
│   └── agentStore.ts          ← AI agent hierarchy and orchestrator
├── hooks/                     ← Custom React hooks
├── types/                     ← TypeScript type definitions
├── utils/                     ← Utility functions
└── __tests__/                 ← Vitest test files
```

## Key Patterns

### 1. Panel Registry (Data-Driven Panels)

All panels registered in `src/panels/panelRegistry.ts`. Adding a panel = one lazy import + one registry entry. App.tsx never changes.

```typescript
// 1. Add lazy import
const MyNewPanel = lazy(() => import('../components/MyDomain/MyNewPanel'))

// 2. Add to registry
'my-new': {
  component: MyNewPanel,
  shortcut: { key: 'm' },  // Ctrl+M — optional
}
```

```tsx
// App.tsx just looks up the registry:
const panel = panelRegistry[rightPanel]
return panel ? <panel.component onClose={closePanel} /> : null
```

### 2. Three-Tier File System

```typescript
const isElectron = !!(window as any).electronAPI?.isElectron
const isBrowserFS = !isElectron && isFileSystemAccessAvailable()

if (isElectron && electronAPI) {
  return electronAPI.someMethod(...)       // Real Electron IPC
} else if (isBrowserFS) {
  return browserFileService.someMethod(...) // File System Access API
} else {
  return MOCK_DATA                          // Demo mode
}
```

| Tier | Files | Terminal | Git |
|------|-------|----------|-----|
| Electron | Full | Real shell | Real |
| Browser+ (Chromium) | Real | Mock | Mock |
| Browser (other) | IndexedDB | Mock | Mock |

### 3. AI Provider System

14 provider families in `src/services/aiProviders.ts` (OpenAI, Anthropic, Google, Mistral, Cohere, Azure, Bedrock, Groq, Together, Perplexity, Deepseek, Fireworks, Ollama, Custom).

Each family defines: `baseUrl`, `models` (via `PRESET_MODELS`), and `name`. Provider instances are created via `addCustomProvider()` or initialized from defaults. Models fetched dynamically via `fetchModels()`.

```typescript
const model = aiProviderService.getModelForPurpose('chat')
const model = aiProviderService.getModelForPurpose('code')
```

### 4. Fallback Chain System

`src/services/fallbackService.ts` — automatic failover with health tracking:

```
Primary → Fail → Cooldown (30s→60s→120s→300s) → Try Next → ...
```

6 purpose chains (chat, code, completion, embedding, vision, audio), exponential backoff, 3 failures → unhealthy. Context preserved across fallbacks.

### 5. Embeddings & Reranking

`src/services/embeddingService.ts` — 8 embedding providers (OpenAI, Voyage, Cohere, Jina, Mistral, Google, Ollama, Custom), 4 rerank providers (Cohere, Jina, Voyage, Custom), in-memory vector store, RAG pipeline: `query → embed → retrieve → rerank → generate`.

### 6. Search Providers & RAG

`src/services/searchProviderService.ts` — 8 web search providers (Google, Bing, Brave, SerpAPI, Serper, Tavily, DuckDuckGo, Custom), `buildRAGPrompt(query, systemPrompt)` injects search context into LLM messages.

## Conventions

**File naming:** Components PascalCase in own directory (`src/components/Git/GitPanel.tsx`). Services camelCase (`src/services/aiProviders.ts`). Stores camelCase with `Store` suffix (`src/stores/editorStore.ts`). Tests in `src/__tests__/*.test.ts`.

**Component pattern:**
```tsx
export default function MyPanel({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<DataType[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { loadData().then(setData).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-4 text-ide-textMuted">Loading...</div>
  return (
    <div className="h-full flex flex-col bg-ide-bg">
      <div className="flex items-center justify-between p-2 border-b border-ide-border">
        <span className="text-sm font-medium">My Panel</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* content */}
    </div>
  )
}
```

**Service pattern:** Plain objects with methods, `isElectron` check at the top of each method:
```typescript
export const myService = {
  async doSomething(param: string): Promise<Result> {
    if (isElectron && electronAPI) return electronAPI.myMethod(param)
    return { success: true, data: MOCK_RESULT }
  }
}
```

**Store pattern:** Zustand `create<State>()` with actions inline. Persist to localStorage if needed (key: `idexal-settings`).

**Styling:** TailwindCSS only. Dark theme default. Tokens: `bg-ide-bg`, `text-ide-text`, `border-ide-border`, `text-ide-textMuted`. Icons: lucide-react.

**Shortcuts:** Data in `panelRegistry.ts` `shortcutBindings` array, not imperative if-blocks.

## Build Commands

```bash
cd freebuff-ide
npm run dev                  # Vite + Electron
npx tsc --noEmit             # Type check (must be clean before commit)
npx vitest run               # Tests
npx vite build               # Build
cd electron && npx tsc --noEmit  # Electron type check
```

## Gotchas

1. `electronAPI` is runtime-detected: `(window as any).electronAPI`. Never imported.
2. Panel components receive `onClose` as prop. ChatPanel also receives `onOpenSettings`.
3. Services check `isElectron` per-method, not at module level.
4. Monaco Editor loads via `@monaco-editor/react` (handles its own loading state).
5. xterm.js needs `@xterm/addon-fit` and `@xterm/addon-webgl`.
6. TailwindCSS custom tokens defined in `tailwind.config.js`.
7. Electron build is separate: `cd electron && npx tsc`.
