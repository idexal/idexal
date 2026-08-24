import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText, Search, GitBranch, ChevronRight, ChevronDown,
  Folder, FolderOpen, Boxes, Brain, X, FolderUp,
  PanelLeftClose
} from 'lucide-react'
import { fileSystemService, type FileEntry, detectLanguage } from '../../services/fileSystemService'
import { useEditorStore } from '../../stores/editorStore'

interface SidebarProps {
  onClose: () => void
  activeTab?: SidebarTab
  onTabChange?: (tab: SidebarTab) => void
}

export type SidebarTab = 'files' | 'search' | 'git' | 'agents' | 'memory'

const FILE_ICONS: Record<string, string> = {
  typescript: '📘',
  javascript: '📙',
  rust: '🦀',
  python: '🐍',
  json: '📋',
  markdown: '📝',
  html: '🌐',
  css: '🎨',
  shell: '💻',
}

function FileTreeItem({ item, level = 0, onFileClick }: {
  item: FileEntry
  level?: number
  onFileClick?: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(level < 1)
  const isDir = item.type === 'directory'
  const lang = detectLanguage(item.name)
  const icon = FILE_ICONS[lang] || '📄'

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-ide-border/50 cursor-pointer group text-sm"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (isDir) setExpanded(!expanded)
          else onFileClick?.(item.path)
        }}
      >
        {isDir ? (
          expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-muted flex-shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-ide-text-muted flex-shrink-0" />
        ) : (
          <span className="w-3.5" />
        )}
        {isDir ? (
          expanded
            ? <FolderOpen className="w-4 h-4 text-ide-accent flex-shrink-0" />
            : <Folder className="w-4 h-4 text-ide-accent flex-shrink-0" />
        ) : (
          <span className="text-xs flex-shrink-0">{icon}</span>
        )}
        <span className="truncate">{item.name}</span>
      </div>
      {isDir && expanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ onClose, activeTab: propActiveTab, onTabChange }: SidebarProps) {
  const [internalTab, setInternalTab] = useState<SidebarTab>('files')
  const activeTab = propActiveTab || internalTab
  const [searchQuery, setSearchQuery] = useState('')
  const [fileTree, setFileTree] = useState<FileEntry[]>([])
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { openTab } = useEditorStore()

  const setActiveTab = useCallback((tab: SidebarTab) => {
    setInternalTab(tab)
    onTabChange?.(tab)
  }, [onTabChange])

  // Load file tree
  const loadFiles = useCallback(async (dirPath?: string) => {
    setIsLoading(true)
    try {
      if (!dirPath) {
        dirPath = await fileSystemService.openFolder() || undefined
      }
      if (dirPath) {
        setFolderPath(dirPath)
        const result = await fileSystemService.readDir(dirPath)
        if (result.success && result.tree) {
          setFileTree(result.tree)
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Handle file click - open in editor
  const handleFileClick = useCallback(async (filePath: string) => {
    const result = await fileSystemService.readFile(filePath)
    if (result.success && result.content) {
      const lang = detectLanguage(filePath)
      const name = filePath.split(/[/\\]/).pop() || 'untitled'
      openTab({ name, path: filePath, content: result.content, language: lang })
    }
  }, [openTab])

  const tabs: { id: SidebarTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'files', icon: <FileText className="w-5 h-5" />, label: 'Files' },
    { id: 'search', icon: <Search className="w-5 h-5" />, label: 'Search' },
    { id: 'git', icon: <GitBranch className="w-5 h-5" />, label: 'Git' },
    { id: 'agents', icon: <Boxes className="w-5 h-5" />, label: 'Agents' },
    { id: 'memory', icon: <Brain className="w-5 h-5" />, label: 'Memory' },
  ]

  const AGENT_LIST = [
    { name: 'Code Agent', icon: '💻', status: 'idle', color: 'text-ide-accent' },
    { name: 'Review Agent', icon: '🔍', status: 'idle', color: 'text-ide-success' },
    { name: 'Debug Agent', icon: '🐛', status: 'idle', color: 'text-ide-warning' },
    { name: 'Architect Agent', icon: '🏗️', status: 'idle', color: 'text-purple-400' },
    { name: 'Test Agent', icon: '🧪', status: 'idle', color: 'text-pink-400' },
  ]

  return (
    <div className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col overflow-hidden flex-shrink-0">
      {/* Tab Icons */}
      <div className="flex border-b border-ide-border">
        <div className="flex-1 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-2.5 flex items-center justify-center transition-colors relative ${
                activeTab === tab.id
                  ? 'text-ide-accent border-b-2 border-ide-accent'
                  : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {tab.badge && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[9px] bg-ide-accent text-white rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-2.5 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'files' && (
          <div>
            {/* Folder header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
              <span className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider">Explorer</span>
              <button
                onClick={() => loadFiles()}
                className="p-1 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
                title="Open Folder"
              >
                <FolderUp className="w-4 h-4" />
              </button>
            </div>

            {/* Folder path */}
            {folderPath && (
              <div className="px-3 py-1.5 text-[11px] text-ide-text-muted truncate bg-ide-bg border-b border-ide-border">
                {folderPath}
              </div>
            )}

            {/* File tree */}
            <div className="py-1">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-sm text-ide-text-muted">
                  Loading files...
                </div>
              ) : fileTree.length > 0 ? (
                fileTree.map((item) => (
                  <FileTreeItem
                    key={item.path}
                    item={item}
                    onFileClick={handleFileClick}
                  />
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <FolderUp className="w-8 h-8 text-ide-text-muted mx-auto mb-2" />
                  <p className="text-sm text-ide-text-muted">No folder open</p>
                  <button
                    onClick={() => loadFiles()}
                    className="mt-2 px-3 py-1 text-xs bg-ide-accent text-white rounded hover:bg-ide-accent/80"
                  >
                    Open Folder
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-3">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-2">Search</div>
            <input
              type="text"
              placeholder="Search in files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
            <div className="mt-3 text-sm text-ide-text-muted">
              {searchQuery ? (
                <div className="space-y-1.5">
                  <div className="p-2 rounded bg-ide-bg border border-ide-border text-xs">
                    <div className="text-ide-accent">src/components/App.tsx</div>
                    <div className="text-ide-text-muted mt-1">Line 42: ...{searchQuery}...</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs">Type to search across files</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="p-3">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-3">Source Control</div>
            <div className="space-y-2">
              <div className="text-sm">
                <div className="text-ide-success">✓ main</div>
                <div className="text-xs text-ide-text-muted mt-1">No pending changes</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="p-3">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-3">AI Agents</div>
            <div className="space-y-2">
              {AGENT_LIST.map((agent, index) => (
                <div key={index} className="p-2.5 rounded-lg bg-ide-bg border border-ide-border hover:border-ide-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{agent.icon}</span>
                    <span className={`text-sm font-medium ${agent.color}`}>{agent.name}</span>
                  </div>
                  <div className="text-[11px] text-ide-text-muted mt-0.5 capitalize">{agent.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="p-3">
            <div className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-3">Memory Store</div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-ide-bg border border-ide-border">
                <div className="text-sm text-ide-accent">Project Context</div>
                <div className="text-[11px] text-ide-text-muted mt-0.5">No project loaded</div>
              </div>
              <div className="p-2.5 rounded-lg bg-ide-bg border border-ide-border">
                <div className="text-sm text-ide-accent">Conversation History</div>
                <div className="text-[11px] text-ide-text-muted mt-0.5">0 entries</div>
              </div>
              <div className="p-2.5 rounded-lg bg-ide-bg border border-ide-border">
                <div className="text-sm text-ide-accent">Code Index</div>
                <div className="text-[11px] text-ide-text-muted mt-0.5">Not indexed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
