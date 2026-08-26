import React from 'react'
import { FaGitAlt, FaExclamationTriangle, FaCheck, FaMicrochip, FaBolt, FaBox, FaExchangeAlt, FaBell, FaGlobe, FaDesktop } from '../Icon'
import { isFileSystemAccessAvailable } from '../../services/browserFileService'
import CollabPresenceBar from '../Collaboration/CollabPresenceBar'

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
    <div className="relative h-7 bg-ide-statusbar border-t border-ide-border flex items-center justify-between px-4 text-xs select-none status-bar-gradient brand-line-top">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <CollabPresenceBar onClick={() => (window as any).dispatchEvent(new CustomEvent('open-panel', { detail: { panelId: 'collaboration' } }))} />

        <button
          onClick={onOpenGit}
          className="flex items-center gap-1.5 text-ide-text-dim hover:text-ide-brand transition-colors group"
        >
          <FaGitAlt className="w-3 h-3 group-hover:drop-shadow-sm" style={{ filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.3))' }} />
          <span className="text-2xs font-medium">main</span>
        </button>

        <div className="w-px h-3 bg-ide-border/50" />

        <div className="flex items-center gap-1.5 text-ide-success">
          <FaCheck className="w-3 h-3" />
          <span className="text-2xs font-medium">0 problems</span>
        </div>

        <div className="flex items-center gap-1.5 text-ide-text-dim">
          <FaExclamationTriangle className="w-3 h-3" />
          <span className="text-2xs font-medium">0 warnings</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-ide-brand hover:text-ide-brand-light hover:bg-ide-brand-50 transition-all group"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-ide-success animate-brand-pulse" />
          <FaMicrochip className="w-3 h-3" />
          <span className="text-2xs font-medium">AI Ready</span>
        </button>

        <div className="w-px h-3 bg-ide-border/50" />

        <StatusBarButton onClick={onOpenTerminal} icon={<FaBolt className="w-3 h-3" />} label="Terminal" />
        <StatusBarButton onClick={onOpenPackages} icon={<FaBox className="w-3 h-3" />} label="Packages" />
        <StatusBarButton onClick={onOpenGitAdvanced} icon={<FaExchangeAlt className="w-3 h-3" />} label="Git+" />
        <StatusBarButton onClick={onOpenNotifications} icon={<FaBell className="w-3 h-3" />} label="Alerts" badge={2} />

        <div className="w-px h-3 bg-ide-border/50" />

        <div className="flex items-center gap-1.5 text-ide-text-dim px-1.5">
          {(window as any).electronAPI?.isElectron ? (
            <><FaDesktop className="w-3 h-3" /><span className="text-2xs">Desktop</span></>
          ) : isFileSystemAccessAvailable() ? (
            <><FaGlobe className="w-3 h-3 text-ide-success" /><span className="text-2xs">Browser+</span></>
          ) : (
            <><FaGlobe className="w-3 h-3" /><span className="text-2xs">Browser</span></>
          )}
        </div>

        <div className="w-px h-3 bg-ide-border/50" />

        <span className="text-2xs text-ide-text-dim font-mono px-1.5">Ln 1, Col 1</span>
        <span className="text-2xs text-ide-text-dim font-mono px-1.5">UTF-8</span>
        <span className="text-2xs text-ide-brand-light font-medium px-1.5">TypeScript</span>
      </div>
    </div>
  )
}

function StatusBarButton({ onClick, icon, label, badge }: {
  onClick?: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-ide-text-dim hover:text-ide-text-secondary hover:bg-ide-surface-alt/60 transition-all group"
    >
      {icon}
      <span className="text-2xs font-medium">{label}</span>
      {badge && badge > 0 && (
        <span className="min-w-4 h-3.5 px-1 text-2xs font-bold bg-ide-brand text-white rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}
