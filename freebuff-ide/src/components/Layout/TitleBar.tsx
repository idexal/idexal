import React from 'react'
import { PanelLeftClose, Terminal, MessageSquare, Command, Cpu, GitBranch, Settings } from 'lucide-react'

interface TitleBarProps {
  onToggleSidebar: () => void
  onToggleTerminal: () => void
  onToggleChat: () => void
  onOpenCommandPalette: () => void
  onOpenSettings?: () => void
}

export default function TitleBar({
  onToggleSidebar,
  onToggleTerminal,
  onToggleChat,
  onOpenCommandPalette,
  onOpenSettings,
}: TitleBarProps) {
  return (
    <div className="h-10 bg-ide-surface border-b border-ide-border flex items-center justify-between px-4 select-none">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-ide-accent" />
          <span className="text-sm font-semibold text-gradient">Idexal IDE</span>
        </div>

        {/* Menu Buttons */}
        <div className="flex items-center gap-1">
          <button onClick={onToggleSidebar} className="p-1.5 rounded hover:bg-ide-border transition-colors" title="Toggle Sidebar (Ctrl+B)">
            <PanelLeftClose className="w-4 h-4 text-ide-text-muted" />
          </button>
          <button onClick={onToggleTerminal} className="p-1.5 rounded hover:bg-ide-border transition-colors" title="Toggle Terminal (Ctrl+`)">
            <Terminal className="w-4 h-4 text-ide-text-muted" />
          </button>
          <button onClick={onToggleChat} className="p-1.5 rounded hover:bg-ide-border transition-colors" title="Toggle AI Chat (Ctrl+Shift+A)">
            <MessageSquare className="w-4 h-4 text-ide-text-muted" />
          </button>
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="p-1.5 rounded hover:bg-ide-border transition-colors" title="Settings (Ctrl+,)">
              <Settings className="w-4 h-4 text-ide-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Center - Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-ide-bg border border-ide-border hover:border-ide-accent transition-colors text-sm text-ide-text-muted"
      >
        <Command className="w-3.5 h-3.5" />
        <span>Command Palette</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-ide-surface rounded border border-ide-border">⌘K</kbd>
      </button>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ide-text-muted">v1.0.0</span>
      </div>
    </div>
  )
}
