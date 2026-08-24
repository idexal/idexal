import React, { useState } from 'react'
import {
  FileText, Search, GitBranch, ChevronRight, ChevronDown,
  Folder, FolderOpen, File, Boxes, Brain, X
} from 'lucide-react'

interface SidebarProps {
  onClose: () => void
}

type SidebarTab = 'files' | 'search' | 'git' | 'agents' | 'memory'

const MOCK_FILES = [
  {
    name: 'src', type: 'directory' as const,
    children: [
      {
        name: 'components', type: 'directory' as const,
        children: [
          { name: 'App.tsx', type: 'file' as const },
          { name: 'Header.tsx', type: 'file' as const },
          { name: 'Sidebar.tsx', type: 'file' as const },
        ],
      },
      {
        name: 'hooks', type: 'directory' as const,
        children: [
          { name: 'useAgent.ts', type: 'file' as const },
          { name: 'useMemory.ts', type: 'file' as const },
        ],
      },
      { name: 'main.tsx', type: 'file' as const },
      { name: 'index.css', type: 'file' as const },
    ],
  },
  {
    name: 'rust-engine', type: 'directory' as const,
    children: [
      { name: 'Cargo.toml', type: 'file' as const },
      {
        name: 'src', type: 'directory' as const,
        children: [
          { name: 'lib.rs', type: 'file' as const },
          { name: 'agent.rs', type: 'file' as const },
          { name: 'memory.rs', type: 'file' as const },
        ],
      },
    ],
  },
  { name: 'package.json', type: 'file' as const },
  { name: 'tsconfig.json', type: 'file' as const },
  { name: 'README.md', type: 'file' as const },
]

function FileTreeItem({ item, level = 0 }: { item: any; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2)
  const isDir = item.type === 'directory'

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-ide-border/50 cursor-pointer file-tree-item"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => isDir && setExpanded(!expanded)}
      >
        {isDir ? (
          expanded ? <ChevronDown className="w-4 h-4 text-ide-text-muted" /> : <ChevronRight className="w-4 h-4 text-ide-text-muted" />
        ) : (
          <span className="w-4" />
        )}
        {isDir ? (
          expanded ? <FolderOpen className="w-4 h-4 text-ide-accent" /> : <Folder className="w-4 h-4 text-ide-accent" />
        ) : (
          <File className="w-4 h-4 text-ide-text-muted" />
        )}
        <span className="text-sm truncate">{item.name}</span>
      </div>
      {isDir && expanded && item.children && (
        <div>
          {item.children.map((child: any, index: number) => (
            <FileTreeItem key={index} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')
  const [searchQuery, setSearchQuery] = useState('')

  const tabs = [
    { id: 'files' as SidebarTab, icon: FileText, label: 'Files' },
    { id: 'search' as SidebarTab, icon: Search, label: 'Search' },
    { id: 'git' as SidebarTab, icon: GitBranch, label: 'Git' },
    { id: 'agents' as SidebarTab, icon: Boxes, label: 'Agents' },
    { id: 'memory' as SidebarTab, icon: Brain, label: 'Memory' },
  ]

  const AGENT_LIST = [
    { name: 'Code Agent', icon: '💻', status: 'idle', color: 'text-ide-accent' },
    { name: 'Review Agent', icon: '🔍', status: 'idle', color: 'text-ide-success' },
    { name: 'Debug Agent', icon: '🐛', status: 'idle', color: 'text-ide-warning' },
    { name: 'Architect Agent', icon: '🏗️', status: 'idle', color: 'text-purple-400' },
    { name: 'Test Agent', icon: '🧪', status: 'idle', color: 'text-pink-400' },
  ]

  return (
    <div className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col overflow-hidden">
      {/* Tab Icons */}
      <div className="flex border-b border-ide-border">
        <div className="flex-1 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-3 flex items-center justify-center transition-colors ${
                activeTab === tab.id
                  ? 'text-ide-accent border-b-2 border-ide-accent'
                  : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-3 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'files' && (
          <div className="p-2">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider px-2 py-2">Explorer</div>
            {MOCK_FILES.map((file, index) => (
              <FileTreeItem key={index} item={file} />
            ))}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-4">
            <input
              type="text"
              placeholder="Search in files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ide-input mb-4"
            />
            <div className="text-sm text-ide-text-muted">
              {searchQuery ? (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-ide-bg border border-ide-border">
                    <div className="text-ide-accent">src/components/App.tsx</div>
                    <div className="text-xs text-ide-text-muted mt-1">Line 42: ...function {searchQuery}...</div>
                  </div>
                </div>
              ) : (
                <p>Type to search across files</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="p-4">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-4">Source Control</div>
            <div className="space-y-2">
              <div className="text-sm">
                <div className="text-ide-success">✓ main</div>
                <div className="text-xs text-ide-text-muted mt-1">No pending changes</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="p-4">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-4">AI Agents</div>
            <div className="space-y-3">
              {AGENT_LIST.map((agent, index) => (
                <div key={index} className="p-3 rounded-lg bg-ide-bg border border-ide-border hover:border-ide-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{agent.icon}</span>
                    <span className={`text-sm font-medium ${agent.color}`}>{agent.name}</span>
                  </div>
                  <div className="text-xs text-ide-text-muted mt-1 capitalize">{agent.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="p-4">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-4">Memory Store</div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-ide-bg border border-ide-border">
                <div className="text-sm text-ide-accent">Project Context</div>
                <div className="text-xs text-ide-text-muted mt-1">No project loaded</div>
              </div>
              <div className="p-3 rounded-lg bg-ide-bg border border-ide-border">
                <div className="text-sm text-ide-accent">Conversation History</div>
                <div className="text-xs text-ide-text-muted mt-1">0 entries</div>
              </div>
              <div className="p-3 rounded-lg bg-ide-bg border border-ide-border">
                <div className="text-sm text-ide-accent">Code Index</div>
                <div className="text-xs text-ide-text-muted mt-1">Not indexed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
