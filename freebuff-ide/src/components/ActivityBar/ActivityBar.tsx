import React from 'react'
import {
  Files, Search, GitBranch, Bug, Blocks, Settings, User,
  MessageSquare, Terminal, HelpCircle
} from 'lucide-react'

export type ActivityBarView = 'files' | 'search' | 'git' | 'debug' | 'extensions' | 'ai' | 'terminal' | 'settings' | 'help'

interface ActivityBarProps {
  activeView: ActivityBarView
  onViewChange: (view: ActivityBarView) => void
}

interface ActivityBarItem {
  id: ActivityBarView
  icon: React.ReactNode
  label: string
  badge?: number
}

const ITEMS: ActivityBarItem[] = [
  { id: 'files', icon: <Files className="w-5 h-5" />, label: 'Explorer' },
  { id: 'search', icon: <Search className="w-5 h-5" />, label: 'Search' },
  { id: 'git', icon: <GitBranch className="w-5 h-5" />, label: 'Source Control', badge: 3 },
  { id: 'debug', icon: <Bug className="w-5 h-5" />, label: 'Run & Debug' },
  { id: 'ai', icon: <MessageSquare className="w-5 h-5" />, label: 'AI Assistant' },
  { id: 'extensions', icon: <Blocks className="w-5 h-5" />, label: 'Extensions' },
]

const BOTTOM_ITEMS: ActivityBarItem[] = [
  { id: 'terminal', icon: <Terminal className="w-5 h-5" />, label: 'Terminal' },
  { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  { id: 'help', icon: <HelpCircle className="w-5 h-5" />, label: 'Help' },
]

export default function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div className="w-12 bg-ide-sidebar border-r border-ide-border flex flex-col items-center justify-between py-2">
      {/* Top Items */}
      <div className="flex flex-col items-center gap-1">
        {ITEMS.map((item) => (
          <ActivityBarButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </div>

      {/* Bottom Items */}
      <div className="flex flex-col items-center gap-1">
        {BOTTOM_ITEMS.map((item) => (
          <ActivityBarButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ActivityBarButton({ item, isActive, onClick }: { item: ActivityBarItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors group ${
        isActive
          ? 'text-ide-accent bg-ide-accent/10'
          : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50'
      }`}
      title={item.label}
    >
      {item.icon}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-ide-accent rounded-r" />
      )}
      {item.badge && item.badge > 0 && (
        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-ide-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {item.badge}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute left-full ml-2 px-2 py-1 bg-ide-surface border border-ide-border rounded text-xs text-ide-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {item.label}
      </div>
    </button>
  )
}
