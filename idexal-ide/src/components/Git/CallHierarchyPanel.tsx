import React, { useState, useMemo } from 'react'
import {
  FaCodeBranch, FaSearch, FaChevronDown, FaChevronRight, FaArrowRight, FaArrowDown, FaCopy, FaCheck, FaFilter, FaCode, FaFileAlt
} from '../Icon'

interface CallNode {
  name: string
  file: string
  line: number
  type: 'function' | 'method' | 'class' | 'interface' | 'type'
  language: string
  calls: CallNode[]
  calledBy: CallNode[]
}

const MOCK_CALL_TREE: CallNode = {
  name: 'App',
  file: 'src/App.tsx',
  line: 10,
  type: 'function',
  language: 'TypeScript',
  calls: [
    {
      name: 'initializeAgents',
      file: 'src/stores/agentStore.ts',
      line: 45,
      type: 'function',
      language: 'TypeScript',
      calls: [
        { name: 'createAgent', file: 'src/services/agentService.ts', line: 12, type: 'function', language: 'TypeScript', calls: [
          { name: 'generateId', file: 'src/utils/id.ts', line: 3, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
          { name: 'validateConfig', file: 'src/utils/validate.ts', line: 8, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
        ], calledBy: [] },
        { name: 'loadAgentsFromStorage', file: 'src/stores/agentStore.ts', line: 67, type: 'function', language: 'TypeScript', calls: [
          { name: 'parseAgentConfig', file: 'src/stores/agentStore.ts', line: 89, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
        ], calledBy: [] },
      ],
      calledBy: [],
    },
    {
      name: 'loadSettings',
      file: 'src/stores/settingsStore.ts',
      line: 23,
      type: 'function',
      language: 'TypeScript',
      calls: [
        { name: 'getTheme', file: 'src/services/themeService.ts', line: 15, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
        { name: 'getFontConfig', file: 'src/services/settingsService.ts', line: 34, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
      ],
      calledBy: [],
    },
    {
      name: 'EditorArea',
      file: 'src/components/Editor/EditorArea.tsx',
      line: 25,
      type: 'function',
      language: 'TypeScript',
      calls: [
        { name: 'MonacoEditor', file: 'src/components/Editor/MonacoEditor.tsx', line: 15, type: 'function', language: 'TypeScript', calls: [
          { name: 'configureMonaco', file: 'src/services/monacoService.ts', line: 8, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
          { name: 'registerLanguages', file: 'src/services/languageService.ts', line: 12, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
        ], calledBy: [] },
        { name: 'TabBar',
          file: 'src/components/Editor/TabBar.tsx',
          line: 12,
          type: 'function',
          language: 'TypeScript',
          calls: [],
          calledBy: [],
        },
      ],
      calledBy: [],
    },
    {
      name: 'ChatPanel',
      file: 'src/components/AI/ChatPanel.tsx',
      line: 18,
      type: 'function',
      language: 'TypeScript',
      calls: [
        { name: 'sendMessage', file: 'src/services/aiService.ts', line: 45, type: 'function', language: 'TypeScript', calls: [
          { name: 'streamResponse', file: 'src/services/aiService.ts', line: 67, type: 'function', language: 'TypeScript', calls: [
            { name: 'parseSSE', file: 'src/utils/sse.ts', line: 5, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
          ], calledBy: [] },
        ], calledBy: [] },
        { name: 'formatMessage', file: 'src/utils/markdown.ts', line: 23, type: 'function', language: 'TypeScript', calls: [], calledBy: [] },
      ],
      calledBy: [],
    },
  ],
  calledBy: [],
}

const TYPE_COLORS: Record<string, string> = {
  function: 'text-blue-400',
  method: 'text-green-400',
  class: 'text-yellow-400',
  interface: 'text-purple-400',
  type: 'text-cyan-400',
}

const TYPE_ICONS: Record<string, string> = {
  function: 'ƒ',
  method: '▸',
  class: 'C',
  interface: 'I',
  type: 'T',
}

export default function CallHierarchyPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'outgoing' | 'incoming'>('outgoing')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['App']))
  const [selectedNode, setSelectedNode] = useState<CallNode | null>(null)
  const [copied, setCopied] = useState(false)

  const toggleNode = (name: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const expandAll = () => {
    const all = new Set<string>()
    const collect = (node: CallNode) => {
      all.add(node.name)
      node.calls.forEach(collect)
      node.calledBy.forEach(collect)
    }
    collect(MOCK_CALL_TREE)
    setExpandedNodes(all)
  }

  const collapseAll = () => setExpandedNodes(new Set(['App']))

  const filteredTree = useMemo(() => {
    if (!searchQuery) return MOCK_CALL_TREE
    const q = searchQuery.toLowerCase()
    const filter = (node: CallNode): CallNode | null => {
      if (node.name.toLowerCase().includes(q)) return node
      const filteredCalls = node.calls.map(filter).filter(Boolean) as CallNode[]
      const filteredBy = node.calledBy.map(filter).filter(Boolean) as CallNode[]
      if (filteredCalls.length || filteredBy.length) {
        return { ...node, calls: filteredCalls, calledBy: filteredBy }
      }
      return null
    }
    return filter(MOCK_CALL_TREE) || MOCK_CALL_TREE
  }, [searchQuery])

  const totalNodes = useMemo(() => {
    let count = 0
    const countNodes = (node: CallNode) => { count++; node.calls.forEach(countNodes); node.calledBy.forEach(countNodes) }
    countNodes(MOCK_CALL_TREE)
    return count
  }, [])

  const renderNode = (node: CallNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.name)
    const hasChildren = node.calls.length > 0
    const isSelected = selectedNode?.name === node.name

    return (
      <div key={`${node.name}-${depth}`}>
        <div
          className={`flex items-center gap-1 px-2 py-1 hover:bg-ide-bg-secondary/20 cursor-pointer group ${
            isSelected ? 'bg-blue-500/10' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedNode(node)}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNode(node.name) }} className="flex-shrink-0">
              {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}
          <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold bg-ide-bg-secondary ${TYPE_COLORS[node.type]}`}>
            {TYPE_ICONS[node.type]}
          </span>
          <span className="text-xs font-mono text-ide-text truncate">{node.name}</span>
          <span className="text-[10px] text-ide-text-secondary/50 truncate hidden group-hover:inline">
            {node.file}:{node.line}
          </span>
          {hasChildren && (
            <span className="ml-auto text-[10px] text-ide-text-secondary/40 flex-shrink-0">
              {node.calls.length}
            </span>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.calls.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCodeBranch size={16} className="text-orange-400" />
          <span className="text-sm font-semibold">Call Hierarchy</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={expandAll} className="px-1.5 py-0.5 text-[10px] bg-ide-bg-secondary rounded hover:bg-ide-bg-secondary/80">Expand</button>
          <button onClick={collapseAll} className="px-1.5 py-0.5 text-[10px] bg-ide-bg-secondary rounded hover:bg-ide-bg-secondary/80">Collapse</button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex border-b border-ide-border">
        <button
          onClick={() => setViewMode('outgoing')}
          className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
            viewMode === 'outgoing' ? 'border-orange-400 text-orange-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          Outgoing Calls ({MOCK_CALL_TREE.calls.length})
        </button>
        <button
          onClick={() => setViewMode('incoming')}
          className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
            viewMode === 'incoming' ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          Incoming Calls (0)
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-ide-border">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1">
          <FaSearch size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter functions..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {renderNode(filteredTree)}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="border-t border-ide-border bg-ide-bg-secondary/20 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${TYPE_COLORS[selectedNode.type]}`}>{TYPE_ICONS[selectedNode.type]}</span>
              <span className="text-xs font-semibold">{selectedNode.name}</span>
              <span className="text-[10px] text-ide-text-secondary">{selectedNode.type}</span>
            </div>
            <button
              onClick={() => { navigator.clipboard?.writeText(selectedNode.name); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
              className="text-ide-text-secondary hover:text-ide-text"
            >
              {copied ? <FaCheck size={12} className="text-green-400" /> : <FaCopy size={12} />}
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary">
            <span className="flex items-center gap-1"><FaFileAlt size={10} /> {selectedNode.file}:{selectedNode.line}</span>
            <span className="flex items-center gap-1"><FaArrowRight size={10} /> Calls: {selectedNode.calls.length}</span>
            <span className="flex items-center gap-1"><FaArrowDown size={10} /> Called by: {selectedNode.calledBy.length}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>{totalNodes} functions in hierarchy</span>
        <span>Root: App()</span>
      </div>
    </div>
  )
}
