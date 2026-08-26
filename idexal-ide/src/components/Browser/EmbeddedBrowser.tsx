import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  FaGlobe, FaArrowLeft, FaArrowRight, FaRedo, FaCode, FaPlus, FaTimes, FaStar, FaSearch, FaLock, FaExclamationTriangle, FaChevronDown, FaExpand, FaCompress, FaClock, FaExternalLinkAlt, FaTerminal
} from '../Icon'

interface BrowserTab {
  id: string
  title: string
  url: string
  inputUrl: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  isSecure: boolean
  favicon: string | null
  history: string[]
  historyIndex: number
}

interface BrowserPanelProps {
  onClose: () => void
}

let tabCounter = 0

function createTab(url: string = 'about:blank'): BrowserTab {
  tabCounter++
  return {
    id: `browser-tab-${tabCounter}`,
    title: url === 'about:blank' ? 'New Tab' : url,
    url,
    inputUrl: url,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isSecure: url.startsWith('https://'),
    favicon: null,
    history: [url],
    historyIndex: 0,
  }
}

const BOOKMARKS = [
  { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { name: 'MDN', url: 'https://developer.mozilla.org', icon: '📚' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📋' },
  { name: 'Vite', url: 'https://vitejs.dev', icon: '⚡' },
  { name: 'React', url: 'https://react.dev', icon: '⚛️' },
  { name: 'Tailwind', url: 'https://tailwindcss.com', icon: '🎨' },
  { name: 'NPM', url: 'https://npmjs.com', icon: '📦' },
]

export default function EmbeddedBrowser({ onClose }: BrowserPanelProps) {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab('https://www.google.com')])
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [devToolsTab, setDevToolsTab] = useState<'console' | 'network' | 'elements'>('console')
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string; time: string }>>([])
  const [maximized, setMaximized] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const updateTab = useCallback((id: string, updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const navigate = useCallback((url: string, tabId?: string) => {
    const id = tabId || activeTabId
    const tab = tabs.find(t => t.id === id)
    if (!tab) return

    let finalUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
      if (url.includes('.') && !url.includes(' ')) {
        finalUrl = 'https://' + url
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`
      }
    }

    const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), finalUrl]
    updateTab(id, {
      url: finalUrl,
      inputUrl: finalUrl,
      isLoading: true,
      isSecure: finalUrl.startsWith('https://'),
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canGoBack: newHistory.length > 1,
      canGoForward: false,
    })
  }, [activeTabId, tabs, updateTab])

  const goBack = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || tab.historyIndex <= 0) return
    const newIndex = tab.historyIndex - 1
    updateTab(activeTabId, {
      url: tab.history[newIndex],
      inputUrl: tab.history[newIndex],
      historyIndex: newIndex,
      canGoBack: newIndex > 0,
      canGoForward: true,
      isSecure: tab.history[newIndex].startsWith('https://'),
    })
  }, [activeTabId, tabs, updateTab])

  const goForward = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || tab.historyIndex >= tab.history.length - 1) return
    const newIndex = tab.historyIndex + 1
    updateTab(activeTabId, {
      url: tab.history[newIndex],
      inputUrl: tab.history[newIndex],
      historyIndex: newIndex,
      canGoBack: true,
      canGoForward: newIndex < tab.history.length - 1,
      isSecure: tab.history[newIndex].startsWith('https://'),
    })
  }, [activeTabId, tabs, updateTab])

  const refresh = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    updateTab(activeTabId, { isLoading: true, url: tab.url + '#reload-' + Date.now() })
    setTimeout(() => updateTab(activeTabId, { isLoading: false }), 1000)
  }, [activeTabId, tabs, updateTab])

  const addTab = useCallback(() => {
    const newTab = createTab()
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) {
        const newTab = createTab()
        setActiveTabId(newTab.id)
        return [newTab]
      }
      if (activeTabId === id) {
        const idx = prev.findIndex(t => t.id === id)
        const newActive = next[Math.min(idx, next.length - 1)]
        setActiveTabId(newActive.id)
      }
      return next
    })
  }, [activeTabId])

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate(activeTab.inputUrl)
    }
  }

  const handleIframeLoad = () => {
    updateTab(activeTabId, { isLoading: false, title: activeTab.url.split('/').pop() || activeTab.url })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        addTab()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (tabs.length > 1) closeTab(activeTabId)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        refresh()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addTab, closeTab, activeTabId, tabs.length, refresh])

  return (
    <div className={`h-full flex flex-col bg-[#1a1a2e] ${maximized ? 'fixed inset-0 z-50' : ''}`}>
      {/* Tab Bar */}
      <div className="h-9 flex items-center bg-[#16162a] border-b border-ide-border/30">
        <div className="flex items-center h-full overflow-x-auto flex-1">
          {tabs.map(tab => (
            <div key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`h-8 flex items-center gap-1.5 px-3 text-[11px] border-r border-ide-border/20 cursor-pointer max-w-[180px] min-w-[100px] ${
                tab.id === activeTabId ? 'bg-[#1a1a2e] text-ide-text' : 'text-ide-text-secondary hover:bg-ide-bg-secondary/20'
              }`}>
              {tab.isLoading ? (
                <FaRedo size={10} className="animate-spin text-blue-400 flex-shrink-0" />
              ) : tab.favicon ? (
                <img src={tab.favicon} className="w-3 h-3 flex-shrink-0" alt="" />
              ) : (
                <FaGlobe size={10} className="text-ide-text-secondary flex-shrink-0" />
              )}
              <span className="truncate flex-1">{tab.title}</span>
              {tabs.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  className="p-0.5 hover:bg-ide-border rounded opacity-50 hover:opacity-100 flex-shrink-0">
                  <FaTimes size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addTab} className="h-8 px-2 text-ide-text-secondary hover:text-ide-text hover:bg-ide-bg-secondary/20">
          <FaPlus size={14} />
        </button>
      </div>

      {/* Navigation Bar */}
      <div className="h-10 flex items-center gap-1.5 px-2 bg-[#16162a] border-b border-ide-border/30">
        <button onClick={goBack} disabled={!activeTab.canGoBack}
          className="p-1.5 rounded hover:bg-ide-bg-secondary/30 disabled:opacity-30 text-ide-text-secondary">
          <FaArrowLeft size={14} />
        </button>
        <button onClick={goForward} disabled={!activeTab.canGoForward}
          className="p-1.5 rounded hover:bg-ide-bg-secondary/30 disabled:opacity-30 text-ide-text-secondary">
          <FaArrowRight size={14} />
        </button>
        <button onClick={refresh} className="p-1.5 rounded hover:bg-ide-bg-secondary/30 text-ide-text-secondary">
          {activeTab.isLoading ? <FaRedo size={14} className="animate-spin" /> : <FaRedo size={14} />}
        </button>
        <button onClick={() => navigate('https://www.google.com')}
          className="p-1.5 rounded hover:bg-ide-bg-secondary/30 text-ide-text-secondary">
          <FaCode size={14} />
        </button>

        {/* URL Bar */}
        <div className="flex-1 flex items-center bg-ide-bg-secondary/50 rounded-md px-2 py-1 gap-1.5">
          {activeTab.isSecure ? (
            <FaLock size={11} className="text-green-400 flex-shrink-0" />
          ) : activeTab.url.startsWith('http') ? (
            <FaExclamationTriangle size={11} className="text-yellow-400 flex-shrink-0" />
          ) : (
            <FaGlobe size={11} className="text-ide-text-secondary flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={activeTab.inputUrl}
            onChange={e => updateTab(activeTabId, { inputUrl: e.target.value })}
            onKeyDown={handleInputKeyDown}
            onFocus={e => e.target.select()}
            placeholder="Search or enter URL..."
            className="flex-1 bg-transparent text-[11px] text-ide-text outline-none font-mono"
          />
          {activeTab.inputUrl !== activeTab.url && (
            <button onClick={() => navigate(activeTab.inputUrl)}
              className="text-blue-400 hover:text-blue-300">
              <FaArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Actions */}
        <button onClick={() => setShowBookmarks(!showBookmarks)}
          className={`p-1.5 rounded ${showBookmarks ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-ide-bg-secondary/30 text-ide-text-secondary'}`}>
          {showBookmarks ? <FaCode size={14} /> : <FaStar size={14} />}
        </button>
        <button onClick={() => setShowDevTools(!showDevTools)}
          className={`p-1.5 rounded ${showDevTools ? 'bg-green-500/20 text-green-400' : 'hover:bg-ide-bg-secondary/30 text-ide-text-secondary'}`}>
          <FaCode size={14} />
        </button>
        <button onClick={() => setMaximized(!maximized)}
          className="p-1.5 rounded hover:bg-ide-bg-secondary/30 text-ide-text-secondary">
          {maximized ? <FaCompress size={14} /> : <FaExpand size={14} />}
        </button>
        <button onClick={onClose}
          className="p-1.5 rounded hover:bg-red-500/20 text-ide-text-secondary hover:text-red-400">
          <FaTimes size={14} />
        </button>
      </div>

      {/* Bookmarks Bar */}
      {showBookmarks && (
        <div className="h-8 flex items-center gap-1 px-2 bg-[#16162a] border-b border-ide-border/30 overflow-x-auto">
          {BOOKMARKS.map(b => (
            <button key={b.url} onClick={() => navigate(b.url)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-ide-text-secondary hover:bg-ide-bg-secondary/30 hover:text-ide-text whitespace-nowrap">
              <span>{b.icon}</span> {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {activeTab.url === 'about:blank' ? (
            <NewTabPage onNavigate={navigate} />
          ) : (
            <iframe
              ref={iframeRef}
              src={activeTab.url}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="Browser"
            />
          )}
          {activeTab.isLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/50">
              <div className="h-full bg-blue-400 animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>

        {/* Dev Tools */}
        {showDevTools && (
          <div className="w-[300px] border-l border-ide-border/30 flex flex-col bg-[#16162a]">
            <div className="flex border-b border-ide-border/30">
              {(['console', 'network', 'elements'] as const).map(tab => (
                <button key={tab} onClick={() => setDevToolsTab(tab)}
                  className={`flex-1 px-2 py-1 text-[10px] border-b-2 text-center capitalize ${
                    devToolsTab === tab ? 'border-green-400 text-green-400' : 'border-transparent text-ide-text-secondary'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2 text-[10px] font-mono">
              {devToolsTab === 'console' && (
                <div className="space-y-0.5">
                  {consoleLogs.length === 0 ? (
                    <div className="text-ide-text-secondary text-center py-4">Console output will appear here</div>
                  ) : (
                    consoleLogs.map((log, i) => (
                      <div key={i} className={`py-0.5 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warn' ? 'text-yellow-400' : 'text-ide-text'
                      }`}>
                        <span className="text-ide-text-secondary">[{log.time}]</span> {log.message}
                      </div>
                    ))
                  )}
                </div>
              )}
              {devToolsTab === 'network' && (
                <div className="text-ide-text-secondary text-center py-4">
                  Network requests will appear here
                </div>
              )}
              {devToolsTab === 'elements' && (
                <div className="text-ide-text-secondary text-center py-4">
                  DOM inspector — inspect the page elements
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 flex items-center justify-between px-3 border-t border-ide-border/30 bg-[#16162a] text-[10px] text-ide-text-secondary">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            {activeTab.isSecure ? <FaLock size={9} className="text-green-400" /> : <FaGlobe size={9} />}
            {activeTab.isSecure ? 'Secure' : 'Not secure'}
          </span>
          <span className="flex items-center gap-1">
            <FaCode size={9} className="text-green-400" /> Connected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>{tabs.length} tabs</span>
          <span>DevTools {showDevTools ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  )
}

function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#1a1a2e]">
      <div className="text-center mb-8">
        <FaGlobe size={48} className="mx-auto mb-4 text-blue-400" />
        <h2 className="text-lg font-semibold text-ide-text mb-1">Idexal Browser</h2>
        <p className="text-xs text-ide-text-secondary">Search the web or enter a URL</p>
      </div>

      <div className="w-[500px] max-w-full">
        <div className="flex items-center bg-ide-bg-secondary/50 rounded-lg px-3 py-2 gap-2">
          <FaSearch size={16} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                onNavigate(searchQuery.trim())
              }
            }}
            placeholder="Search Google or enter URL..."
            className="flex-1 bg-transparent text-sm text-ide-text outline-none"
            autoFocus
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-3">
        {BOOKMARKS.map(b => (
          <button key={b.url} onClick={() => onNavigate(b.url)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-ide-bg-secondary/20 transition-colors">
            <span className="text-2xl">{b.icon}</span>
            <span className="text-[10px] text-ide-text-secondary">{b.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
