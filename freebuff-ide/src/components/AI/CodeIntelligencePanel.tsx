import React, { useState, useMemo } from 'react'
import {
  Search, ArrowRight, ArrowLeft, ArrowUp, Code, FileText,
  ChevronDown, ChevronRight, Copy, Check, ExternalLink,
  Eye, GitBranch, Hash, Layers, Package
} from 'lucide-react'

interface Symbol {
  name: string
  kind: 'function' | 'struct' | 'enum' | 'trait' | 'impl' | 'type' | 'variable' | 'constant' | 'module' | 'interface'
  file: string
  line: number
  column: number
  signature: string
  documentation: string
  references: Reference[]
  definition?: string
}

interface Reference {
  file: string
  line: number
  column: number
  context: string
  kind: 'definition' | 'usage' | 'import' | 'type' | 'documentation'
}

const KIND_COLORS: Record<string, string> = {
  function: 'text-blue-400',
  struct: 'text-green-400',
  enum: 'text-yellow-400',
  trait: 'text-purple-400',
  impl: 'text-cyan-400',
  type: 'text-pink-400',
  variable: 'text-orange-400',
  constant: 'text-red-400',
  module: 'text-gray-400',
  interface: 'text-indigo-400',
}

const KIND_ICONS: Record<string, string> = {
  function: 'ƒ',
  struct: 'S',
  enum: 'E',
  trait: 'T',
  impl: 'I',
  type: 't',
  variable: 'v',
  constant: 'C',
  module: 'M',
  interface: 'I',
}

const MOCK_SYMBOLS: Symbol[] = [
  {
    name: 'AIProviderService',
    kind: 'struct',
    file: 'src/services/aiProviders.ts',
    line: 85,
    column: 0,
    signature: 'class AIProviderService',
    documentation: 'Service for managing AI providers, fetching models, and handling API keys',
    references: [
      { file: 'src/services/aiProviders.ts', line: 280, column: 0, context: 'export const aiProviderService = new AIProviderService()', kind: 'definition' },
      { file: 'src/components/Settings/AIProviderSettings.tsx', line: 5, column: 0, context: "import { aiProviderService } from '../../services/aiProviders'", kind: 'import' },
      { file: 'src/components/Settings/AIProviderSettings.tsx', line: 25, column: 0, context: 'setProviders(aiProviderService.getAllProviders())', kind: 'usage' },
    ],
  },
  {
    name: 'fetchModels',
    kind: 'function',
    file: 'src/services/aiProviders.ts',
    line: 180,
    column: 2,
    signature: 'async fetchModels(providerId: string): Promise<AIModel[]>',
    documentation: 'Fetches available models from a provider API endpoint',
    references: [
      { file: 'src/services/aiProviders.ts', line: 180, column: 2, context: 'async fetchModels(providerId: string)', kind: 'definition' },
      { file: 'src/components/Settings/AIProviderSettings.tsx', line: 35, column: 0, context: 'await aiProviderService.fetchModels(providerId)', kind: 'usage' },
    ],
  },
  {
    name: 'AIModel',
    kind: 'interface',
    file: 'src/services/aiProviders.ts',
    line: 25,
    column: 0,
    signature: 'interface AIModel { id: string; name: string; ... }',
    documentation: 'Represents an AI model with its capabilities and metadata',
    references: [
      { file: 'src/services/aiProviders.ts', line: 25, column: 0, context: 'export interface AIModel', kind: 'definition' as const },
      { file: 'src/services/aiProviders.ts', line: 45, column: 0, context: 'models: AIModel[]', kind: 'type' as const },
    ],
  },
  {
    name: 'useSettingsStore',
    kind: 'function',
    file: 'src/stores/settingsStore.ts',
    line: 75,
    column: 0,
    signature: 'export const useSettingsStore = create<SettingsState>(...)',
    documentation: 'Zustand store for application settings',
    references: [
      { file: 'src/stores/settingsStore.ts', line: 75, column: 0, context: 'export const useSettingsStore', kind: 'definition' },
      { file: 'src/App.tsx', line: 5, column: 0, context: "import { useSettingsStore } from './stores/settingsStore'", kind: 'import' },
      { file: 'src/App.tsx', line: 68, column: 0, context: 'const { loadSettings } = useSettingsStore()', kind: 'usage' },
      { file: 'src/components/Settings/SettingsPanel.tsx', line: 3, column: 0, context: "import { useSettingsStore } from '../../stores/settingsStore'", kind: 'import' },
    ],
  },
  {
    name: 'chatOpenAI',
    kind: 'function',
    file: 'src/services/aiService.ts',
    line: 95,
    column: 2,
    signature: 'private async chatOpenAI(messages: AIMessage[], provider: AIProvider): Promise<AIResponse>',
    documentation: 'Sends chat messages to OpenAI API and returns response',
    references: [
      { file: 'src/services/aiService.ts', line: 95, column: 2, context: 'private async chatOpenAI', kind: 'definition' },
      { file: 'src/services/aiService.ts', line: 85, column: 0, context: 'return this.chatOpenAI(messages, provider)', kind: 'usage' },
    ],
  },
  {
    name: 'ProviderFamily',
    kind: 'type',
    file: 'src/services/aiProviders.ts',
    line: 8,
    column: 0,
    signature: "type ProviderFamily = 'openai' | 'anthropic' | 'google' | ...",
    documentation: 'Union type of all supported AI provider families',
    references: [
      { file: 'src/services/aiProviders.ts', line: 8, column: 0, context: 'export type ProviderFamily', kind: 'definition' },
      { file: 'src/services/aiProviders.ts', line: 30, column: 0, context: 'family: ProviderFamily', kind: 'type' },
    ],
  },
  {
    name: 'aiProviderService',
    kind: 'variable',
    file: 'src/services/aiProviders.ts',
    line: 280,
    column: 0,
    signature: 'export const aiProviderService = new AIProviderService()',
    documentation: 'Singleton instance of AIProviderService',
    references: [
      { file: 'src/services/aiProviders.ts', line: 280, column: 0, context: 'export const aiProviderService', kind: 'definition' },
      { file: 'src/components/Settings/AIProviderSettings.tsx', line: 25, column: 0, context: 'aiProviderService.getAllProviders()', kind: 'usage' },
    ],
  },
  {
    name: 'EditorArea',
    kind: 'function',
    file: 'src/components/Editor/EditorArea.tsx',
    line: 15,
    column: 0,
    signature: 'export default function EditorArea()',
    documentation: 'Main editor component with Monaco editor integration',
    references: [
      { file: 'src/components/Editor/EditorArea.tsx', line: 15, column: 0, context: 'export default function EditorArea', kind: 'definition' },
      { file: 'src/App.tsx', line: 8, column: 0, context: "import EditorArea from './components/Editor/EditorArea'", kind: 'import' },
      { file: 'src/App.tsx', line: 130, column: 0, context: '<EditorArea />', kind: 'usage' },
    ],
  },
]

export default function CodeIntelligencePanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(MOCK_SYMBOLS[0])
  const [activeTab, setActiveTab] = useState<'references' | 'definition' | 'hover'>('references')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Symbol[]>([MOCK_SYMBOLS[0]])
  const [historyIndex, setHistoryIndex] = useState(0)

  const filtered = useMemo(() => {
    if (!searchQuery) return MOCK_SYMBOLS
    const q = searchQuery.toLowerCase()
    return MOCK_SYMBOLS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.kind.includes(q) ||
      s.file.toLowerCase().includes(q) ||
      s.documentation.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const navigateTo = (symbol: Symbol) => {
    setSelectedSymbol(symbol)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(symbol)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setSelectedSymbol(history[historyIndex - 1])
    }
  }

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setSelectedSymbol(history[historyIndex + 1])
    }
  }

  const copySymbol = () => {
    if (selectedSymbol) {
      navigator.clipboard?.writeText(selectedSymbol.name)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    MOCK_SYMBOLS.forEach(s => { counts[s.kind] = (counts[s.kind] || 0) + 1 })
    return counts
  }, [])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">Code Intelligence</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={historyIndex === 0}
            className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary disabled:opacity-30"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex === history.length - 1}
            className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary disabled:opacity-30"
          >
            <ArrowRight size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-ide-border">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1">
          <Search size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
          <span className="text-[10px] text-ide-text-secondary">{filtered.length} symbols</span>
        </div>
      </div>

      {/* Kind Filter */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-ide-border overflow-x-auto">
        <button
          onClick={() => setSearchQuery('')}
          className={`px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 ${
            !searchQuery ? 'bg-blue-500/20 text-blue-400' : 'text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          All ({MOCK_SYMBOLS.length})
        </button>
        {Object.entries(kindCounts).map(([kind, count]) => (
          <button
            key={kind}
            onClick={() => setSearchQuery(kind)}
            className={`px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 flex items-center gap-0.5 ${
              searchQuery === kind ? 'bg-blue-500/20 text-blue-400' : 'text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <span className={KIND_COLORS[kind]}>{KIND_ICONS[kind]}</span> {kind} ({count})
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Symbol List */}
        <div className="w-[200px] border-r border-ide-border overflow-y-auto flex-shrink-0">
          {filtered.map(symbol => (
            <div
              key={symbol.name}
              onClick={() => navigateTo(symbol)}
              className={`px-2 py-1.5 cursor-pointer border-b border-ide-border/10 ${
                selectedSymbol?.name === symbol.name ? 'bg-blue-500/10' : 'hover:bg-ide-bg-secondary/20'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold bg-ide-bg-secondary ${KIND_COLORS[symbol.kind]}`}>
                  {KIND_ICONS[symbol.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{symbol.name}</div>
                  <div className="text-[9px] text-ide-text-secondary truncate">{symbol.file.split('/').pop()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Symbol Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedSymbol ? (
            <div className="p-3 space-y-3">
              {/* Symbol Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold bg-ide-bg-secondary ${KIND_COLORS[selectedSymbol.kind]}`}>
                    {KIND_ICONS[selectedSymbol.kind]}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{selectedSymbol.name}</h3>
                    <span className={`text-[10px] ${KIND_COLORS[selectedSymbol.kind]}`}>{selectedSymbol.kind}</span>
                  </div>
                </div>
                <button
                  onClick={copySymbol}
                  className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>

              {/* Location */}
              <div className="text-[10px] text-ide-text-secondary flex items-center gap-2">
                <FileText size={10} />
                <span className="font-mono">{selectedSymbol.file}:{selectedSymbol.line}</span>
              </div>

              {/* Signature */}
              <div className="bg-ide-bg-secondary/20 rounded p-2">
                <div className="text-[10px] text-ide-text-secondary mb-1">Signature</div>
                <pre className="text-[11px] font-mono text-ide-text overflow-x-auto">{selectedSymbol.signature}</pre>
              </div>

              {/* Documentation */}
              <div className="bg-ide-bg-secondary/20 rounded p-2">
                <div className="text-[10px] text-ide-text-secondary mb-1">Documentation</div>
                <div className="text-[11px] text-ide-text">{selectedSymbol.documentation}</div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-ide-border">
                {(['references', 'definition', 'hover'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-1.5 text-[10px] border-b-2 text-center capitalize ${
                      activeTab === tab ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
                    }`}
                  >
                    {tab} ({tab === 'references' ? selectedSymbol.references.length : 1})
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'references' && (
                <div className="space-y-1">
                  {selectedSymbol.references.map((ref, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-ide-bg-secondary/10 text-[10px]">
                      <span className={`px-1 py-0 rounded text-[8px] ${
                        ref.kind === 'definition' ? 'bg-green-500/20 text-green-400' :
                        ref.kind === 'import' ? 'bg-blue-500/20 text-blue-400' :
                        ref.kind === 'type' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-ide-bg-secondary text-ide-text-secondary'
                      }`}>
                        {ref.kind}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-ide-text-secondary">{ref.file}:{ref.line}</div>
                        <div className="text-ide-text truncate">{ref.context}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'definition' && (
                <div className="bg-ide-bg-secondary/20 rounded p-2">
                  <div className="text-[10px] text-ide-text-secondary mb-1">Definition</div>
                  <pre className="text-[11px] font-mono text-ide-text overflow-x-auto">{selectedSymbol.signature}</pre>
                </div>
              )}

              {activeTab === 'hover' && (
                <div className="space-y-2">
                  <div className="bg-ide-bg-secondary/20 rounded p-2">
                    <div className="text-[10px] text-ide-text-secondary mb-1">Type</div>
                    <div className="text-[11px] font-mono text-ide-text">{selectedSymbol.kind}</div>
                  </div>
                  <div className="bg-ide-bg-secondary/20 rounded p-2">
                    <div className="text-[10px] text-ide-text-secondary mb-1">File</div>
                    <div className="text-[11px] font-mono text-ide-text">{selectedSymbol.file}</div>
                  </div>
                  <div className="bg-ide-bg-secondary/20 rounded p-2">
                    <div className="text-[10px] text-ide-text-secondary mb-1">References</div>
                    <div className="text-[11px] text-ide-text">{selectedSymbol.references.length} references found</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-ide-text-secondary">
              <Code size={48} className="mb-3 opacity-20" />
              <span className="text-sm">Select a symbol to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
