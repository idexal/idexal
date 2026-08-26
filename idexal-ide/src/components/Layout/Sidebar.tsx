import React, { useState, useEffect, useCallback } from 'react'
import {
  FaFileAlt, FaSearch, FaGitAlt, FaChevronRight, FaChevronDown,
  FaFolder, FaFolderOpen, FaCubes, FaBrain, FaTimes, FaBolt,
} from '../../components/Icon'
import { fileSystemService, type FileEntry, detectLanguage } from '../../services/fileSystemService'
import { useEditorStore } from '../../stores/editorStore'
import { projectSkillsService, type ProjectSkill } from '../../services/projectSkillsService'

interface SidebarProps {
  onClose: () => void
  activeTab?: SidebarTab
  onTabChange?: (tab: SidebarTab) => void
}

export type SidebarTab = 'files' | 'search' | 'git' | 'agents' | 'memory' | 'skills'

const FILE_ICONS: Record<string, { emoji: string; color: string }> = {
  typescript: { emoji: '📘', color: '#3178c6' },
  javascript: { emoji: '📙', color: '#f7df1e' },
  rust:       { emoji: '🦀', color: '#dea584' },
  python:     { emoji: '🐍', color: '#3776ab' },
  json:       { emoji: '📋', color: '#6b7280' },
  markdown:   { emoji: '📝', color: '#6b7280' },
  html:       { emoji: '🌐', color: '#e34f26' },
  css:        { emoji: '🎨', color: '#1572b6' },
  shell:      { emoji: '💻', color: '#89e051' },
}

function FileTreeItem({ item, level = 0, onFileClick }: {
  item: FileEntry
  level?: number
  onFileClick?: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(level < 1)
  const [hovered, setHovered] = useState(false)
  const isDir = item.type === 'directory'
  const lang = detectLanguage(item.name)
  const fileInfo = FILE_ICONS[lang] || { emoji: '📄', color: '#6b7280' }

  return (
    <div
      className="file-tree-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-1.5 py-[5px] px-2 cursor-pointer group text-sm transition-all duration-100"
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        onClick={() => {
          if (isDir) setExpanded(!expanded)
          else onFileClick?.(item.path)
        }}
      >
        {/* Chevron */}
        <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
          {isDir ? (
            expanded
              ? <FaChevronDown className="w-3 h-3 text-ide-text-dim transition-transform duration-150" />
              : <FaChevronRight className="w-3 h-3 text-ide-text-dim transition-transform duration-150" />
          ) : null}
        </div>

        {/* Icon */}
        {isDir ? (
          expanded
            ? <FaFolderOpen className="w-4 h-4 text-ide-brand flex-shrink-0 transition-colors" />
            : <FaFolder className="w-4 h-4 text-ide-text-muted group-hover:text-ide-brand flex-shrink-0 transition-colors" />
        ) : (
          <span className="w-4 h-4 flex items-center justify-center text-xs flex-shrink-0">{fileInfo.emoji}</span>
        )}

        {/* Name */}
        <span className={`truncate transition-colors duration-100 ${
          isDir ? 'text-ide-text-secondary font-medium' : 'text-ide-text-muted group-hover:text-ide-text-secondary'
        }`}>
          {item.name}
        </span>
      </div>

      {isDir && expanded && item.children && (
        <div className="animate-fade-in">
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

  const handleFileClick = useCallback(async (filePath: string) => {
    const result = await fileSystemService.readFile(filePath)
    if (result.success && result.content) {
      const lang = detectLanguage(filePath)
      const name = filePath.split(/[/\\]/).pop() || 'untitled'
      openTab({ name, path: filePath, content: result.content, language: lang })
    }
  }, [openTab])

  const tabs: { id: SidebarTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'files', icon: <FaFileAlt className="w-4.5 h-4.5" />, label: 'Files' },
    { id: 'search', icon: <FaSearch className="w-4.5 h-4.5" />, label: 'Search' },
    { id: 'git', icon: <FaGitAlt className="w-4.5 h-4.5" />, label: 'Git' },
    { id: 'agents', icon: <FaCubes className="w-4.5 h-4.5" />, label: 'Agents' },
    { id: 'memory', icon: <FaBrain className="w-4.5 h-4.5" />, label: 'Memory' },
    { id: 'skills', icon: <FaBolt className="w-4.5 h-4.5" />, label: 'Skills' },
  ]

  const AGENT_LIST = [
    { name: 'FaCode Agent', icon: '💻', status: 'idle', color: 'text-ide-brand-light', bg: 'bg-ide-brand-50' },
    { name: 'Review Agent', icon: '🔍', status: 'idle', color: 'text-ide-success', bg: 'bg-emerald-500/10' },
    { name: 'Debug Agent', icon: '🐛', status: 'idle', color: 'text-ide-warning', bg: 'bg-amber-500/10' },
    { name: 'Architect', icon: '🏗️', status: 'idle', color: 'text-ide-accent-light', bg: 'bg-violet-500/10' },
    { name: 'Test Agent', icon: '🧪', status: 'idle', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ]

  return (
    <div className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col overflow-hidden flex-shrink-0 animate-slide-in-left">
      {/* Tab Icons */}
      <div className="flex border-b border-ide-border bg-ide-titlebar/50">
        <div className="flex-1 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 flex items-center justify-center transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-ide-brand-light sidebar-item-active'
                  : 'text-ide-text-dim hover:text-ide-text-muted hover:bg-ide-surface-alt/50'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {tab.badge && (
                <span className="absolute top-1.5 right-1 min-w-4 h-4 px-1 text-2xs font-bold bg-ide-brand text-white rounded-full flex items-center justify-center shadow-brand-sm">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="px-2.5 py-2.5 text-ide-text-dim hover:text-ide-text-muted hover:bg-ide-surface-alt/50 transition-colors"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'files' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border/50">
              <span className="text-2xs font-semibold text-ide-text-dim uppercase tracking-widest">Explorer</span>
              <button
                onClick={() => loadFiles()}
                className="p-1 rounded-md hover:bg-ide-brand-50 text-ide-text-dim hover:text-ide-brand transition-all"
                title="Open Folder"
              >
                <FaFolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>

            {folderPath && (
              <div className="px-3 py-1.5 text-2xs text-ide-text-dim truncate bg-ide-bg-alt border-b border-ide-border/30 font-mono">
                {folderPath}
              </div>
            )}

            <div className="py-1">
              {isLoading ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-6 h-6 mx-auto mb-3 border-2 border-ide-brand border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-ide-text-dim">Loading files...</p>
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
                <div className="px-4 py-10 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-ide-brand-50 border border-ide-brand-200 flex items-center justify-center">
                    <FaFolderOpen className="w-6 h-6 text-ide-brand" />
                  </div>
                  <p className="text-sm text-ide-text-secondary font-medium">No folder open</p>
                  <p className="text-xs text-ide-text-dim mt-1 mb-3">Open a project to explore files</p>
                  <button
                    onClick={() => loadFiles()}
                    className="ide-button-primary !px-4 !py-1.5 !text-xs"
                  >
                    Open Folder
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-3 animate-fade-in">
            <div className="text-2xs font-semibold text-ide-text-dim uppercase tracking-widest mb-2">Search</div>
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-dim" />
              <input
                type="text"
                placeholder="Search across files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ide-input !pl-8 !py-1.5 !text-xs"
              />
            </div>
            <div className="mt-3">
              {searchQuery ? (
                <div className="space-y-1.5">
                  <div className="ide-panel !rounded-lg !p-2.5">
                    <div className="text-2xs text-ide-brand font-mono">src/components/App.tsx</div>
                    <div className="text-2xs text-ide-text-dim mt-1">Line 42: ...{searchQuery}...</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FaSearch className="w-6 h-6 text-ide-text-dim/30 mx-auto mb-2" />
                  <p className="text-xs text-ide-text-dim">Type to search across files</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="p-3 animate-fade-in">
            <div className="text-2xs font-semibold text-ide-text-dim uppercase tracking-widest mb-3">Source Control</div>
            <div className="ide-panel !rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-ide-success" />
                <span className="text-sm text-ide-text-secondary font-medium">main</span>
              </div>
              <p className="text-xs text-ide-text-dim">No pending changes</p>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="p-3 animate-fade-in">
            <div className="text-2xs font-semibold text-ide-text-dim uppercase tracking-widest mb-3">AI Agents</div>
            <div className="space-y-2">
              {AGENT_LIST.map((agent, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/30 cursor-pointer transition-all duration-200 hover:shadow-brand-sm group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${agent.bg} flex items-center justify-center text-sm transition-transform duration-200 group-hover:scale-110`}>
                      {agent.icon}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${agent.color}`}>{agent.name}</span>
                      <div className="text-2xs text-ide-text-dim capitalize">{agent.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <SkillsBrowser folderPath={folderPath} onOpenFile={handleFileClick} />
        )}

        {activeTab === 'memory' && (
          <div className="p-3 animate-fade-in">
            <div className="text-2xs font-semibold text-ide-text-dim uppercase tracking-widest mb-3">Memory Store</div>
            <div className="space-y-2">
              {[
                { title: 'Project Context', desc: 'No project loaded', icon: '📁' },
                { title: 'Conversations', desc: '0 entries', icon: '💬' },
                { title: 'FaCode Index', desc: 'Not indexed', icon: '🔍' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/20 transition-all group">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <div className="text-sm text-ide-brand-light font-medium">{item.title}</div>
                  </div>
                  <div className="text-2xs text-ide-text-dim mt-1 ml-7">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Skills Browser (bundled repo skills library) ────────────────

function SkillsBrowser({ folderPath, onOpenFile }: {
  folderPath: string | null
  onOpenFile?: (filePath: string) => void
}) {
  const [, forceUpdate] = useState(0)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = projectSkillsService.subscribe(() => forceUpdate(n => n + 1))
    if (folderPath) projectSkillsService.load(folderPath)
    return () => { unsub() }
  }, [folderPath])

  const skills = projectSkillsService.getAll()
  const results = query.trim() ? projectSkillsService.search(query, 40) : []
  const visible: ProjectSkill[] = query.trim()
    ? results.map(r => r.skill)
    : skills

  return (
    <div className="p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xs font-semibold text-ide-text-dim uppercase tracking-widest">Project Skills</div>
        <span className="text-2xs text-ide-brand-light">{skills.length} available</span>
      </div>

      {!folderPath && (
        <div className="p-3 rounded-xl bg-ide-surface border border-ide-border text-2xs text-ide-text-dim">
          Open a workspace folder to load its bundled skills library.
        </div>
      )}

      {folderPath && (
        <>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="w-full px-2.5 py-1.5 mb-2 text-xs rounded-lg bg-ide-surface border border-ide-border focus:border-ide-brand/50 outline-none"
          />
          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100%-3rem)]">
            {visible.map(skill => (
              <div
                key={skill.id}
                className="rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/30 transition-all duration-200 group"
              >
                <button
                  className="w-full text-left p-2.5 flex items-start gap-2"
                  onClick={() => setExpandedId(expandedId === skill.id ? null : skill.id)}
                >
                  <FaBolt className="w-3.5 h-3.5 mt-0.5 text-ide-brand-light shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ide-text truncate">{skill.name}</div>
                    {skill.description && (
                      <div className="text-2xs text-ide-text-dim line-clamp-2">{skill.description.slice(0, 140)}</div>
                    )}
                  </div>
                </button>
                {expandedId === skill.id && (
                  <div className="px-2.5 pb-2.5 flex items-center gap-2">
                    <button
                      className="text-2xs px-2 py-1 rounded-md bg-ide-brand/10 text-ide-brand-light hover:bg-ide-brand/20 transition-colors"
                      onClick={() => onOpenFile?.(skill.filePath)}
                    >
                      Open SKILL.md
                    </button>
                    <span className="text-2xs text-ide-text-dim truncate">{skill.id}{skill.version ? ` · v${skill.version}` : ''}</span>
                  </div>
                )}
              </div>
            ))}
            {visible.length === 0 && (
              <div className="p-3 text-2xs text-ide-text-dim">No skills match “{query}”.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
