/**
 * CollabPresenceBar — Status bar indicator for active collaboration sessions.
 * Shows collaborator count, connection status, and quick access to collaboration panel.
 */

import React, { useState, useEffect } from 'react'
import { FaUsers, FaWifi, FaSync } from '../Icon'
import { onCollaborationChange, getCollaborationState, type CollaborationState } from '../../services/collaborationService'

interface CollabPresenceBarProps {
  onClick?: () => void
}

export default function CollabPresenceBar({ onClick }: CollabPresenceBarProps) {
  const [state, setState] = useState<CollaborationState>(getCollaborationState())

  useEffect(() => {
    return onCollaborationChange(setState)
  }, [])

  if (!state.sessionId) return null

  const onlineCount = state.collaborators.filter(c => c.isActive).length + 1

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] hover:bg-ide-surface-alt transition-colors cursor-pointer"
      title={`Collaboration: ${onlineCount} user${onlineCount !== 1 ? 's' : ''} online`}
    >
      {state.isConnected ? (
        <FaWifi size={9} className="text-green-400" />
      ) : (
        <FaSync size={9} className="text-yellow-400 animate-pulse" />
      )}
      <FaUsers size={9} className="text-violet-400" />
      <span className="text-ide-text-dim">{onlineCount}</span>
      {/* Color dots for each collaborator */}
      <div className="flex -space-x-1">
        {state.collaborators.filter(c => c.isActive).slice(0, 5).map((c) => (
          <div
            key={c.id}
            className="w-2 h-2 rounded-full border border-ide-bg"
            style={{ background: c.color }}
            title={c.name}
          />
        ))}
      </div>
    </button>
  )
}
