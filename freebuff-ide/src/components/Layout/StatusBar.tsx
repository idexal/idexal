import React from 'react'
import { GitBranch, AlertCircle, CheckCircle, Wifi, Cpu, Zap, Settings, Bell, Package, GitCompareArrows } from 'lucide-react'

interface StatusBarProps {
  onOpenTerminal: () => void
  onOpenChat: () => void
  onOpenGit?: () => void
  onOpenPackages?: () => void
  onOpenNotifications?: () => void
  onOpenGitAdvanced?: () => void
}

export default function StatusBar({ onOpenTerminal, onOpenChat, onOpenGit, onOpenPackages, onOpenNotifications, onOpenGitAdvanced }: StatusBarProps) {
  return (
    <div className="h-6 bg-ide-surface border-t border-ide-border flex items-center justify-between px-4 text-xs select-none">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenGit}
          className="flex items-center gap-1 text-ide-text-muted hover:text-ide-text transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </button>

        <div className="flex items-center gap-1 text-ide-success">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>0 problems</span>
        </div>

        <div className="flex items-center gap-1 text-ide-text-muted">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>0 warnings</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-1 text-ide-accent hover:text-ide-accent-hover transition-colors"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Ready</span>
        </button>

        <button
          onClick={onOpenTerminal}
          className="flex items-center gap-1 text-ide-text-muted hover:text-ide-text transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>

        <button onClick={onOpenPackages} className="flex items-center gap-1 text-ide-text-muted hover:text-ide-text transition-colors">
          <Package className="w-3.5 h-3.5" />
          <span>Packages</span>
        </button>

        <button onClick={onOpenGitAdvanced} className="flex items-center gap-1 text-ide-text-muted hover:text-ide-text transition-colors">
          <GitCompareArrows className="w-3.5 h-3.5" />
          <span>Git+</span>
        </button>

        <button onClick={onOpenNotifications} className="flex items-center gap-1 text-ide-text-muted hover:text-ide-text transition-colors">
          <Bell className="w-3.5 h-3.5" />
          <span>Alerts</span>
        </button>

        <div className="flex items-center gap-1 text-ide-text-muted">
          <Wifi className="w-3.5 h-3.5" />
          <span>Connected</span>
        </div>

        <div className="text-ide-text-muted">Ln 1, Col 1</div>
        <div className="text-ide-text-muted">UTF-8</div>
        <div className="text-ide-text-muted">TypeScript</div>
      </div>
    </div>
  )
}
