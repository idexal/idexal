/**
 * SharedFileTree — Shows which files each collaborator is viewing/editing.
 * Uses Yjs awareness to track file focus across users.
 */

import React, { useState, useEffect } from 'react'
import { FaFile, FaFolder, FaFolderOpen, FaEye, FaEdit } from '../Icon'
import { onCollaborationChange, getCollaborationState, type CollaborationState } from '../../services/collaborationService'

interface FileFocus {
  userId: string
  userName: string
  color: string
  filePath: string
  isEditing: boolean
}

export default function SharedFileTree() {
  const [state, setState] = useState<CollaborationState>(getCollaborationState())
  const [fileFocuses, setFileFocuses] = useState<FileFocus[]>([])

  useEffect(() => {
    return onCollaborationChange((newState) => {
      setState(newState)
      // Extract file focus from collaborator awareness
      const focuses: FileFocus[] = newState.collaborators
        .filter(c => (c as any).filePath)
        .map(c => ({
          userId: c.id,
          userName: c.name,
          color: c.color,
          filePath: (c as any).filePath || '',
          isEditing: (c as any).isEditing || false,
        }))
      setFileFocuses(focuses)
    })
  }, [])

  // Group files by directory
  const fileGroups = new Map<string, FileFocus[]>()
  fileFocuses.forEach(ff => {
    const dir = ff.filePath.split('/').slice(0, -1).join('/') || '/'
    if (!fileGroups.has(dir)) fileGroups.set(dir, [])
    fileGroups.get(dir)!.push(ff)
  })

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-ide-text-dim uppercase tracking-wider font-semibold mb-2">
        Active Files ({fileFocuses.length})
      </div>
      {fileFocuses.length === 0 ? (
        <div className="text-center py-4">
          <FaFile size={16} className="text-ide-text-dim/20 mx-auto mb-1" />
          <p className="text-[10px] text-ide-text-dim">No file activity yet</p>
        </div>
      ) : (
        fileFocuses.map((ff) => (
          <div key={`${ff.userId}-${ff.filePath}`}
            className="flex items-center gap-2 p-2 rounded-lg bg-ide-surface border border-ide-border hover:border-ide-brand/20 transition-colors">
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: ff.color + '20' }}>
              {ff.isEditing ? (
                <FaEdit size={10} style={{ color: ff.color }} />
              ) : (
                <FaEye size={10} style={{ color: ff.color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-ide-text truncate">{ff.filePath}</div>
              <div className="text-[9px] text-ide-text-dim" style={{ color: ff.color }}>
                {ff.userName} — {ff.isEditing ? 'editing' : 'viewing'}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
