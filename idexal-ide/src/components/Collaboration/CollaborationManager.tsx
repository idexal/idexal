/**
 * CollaborationManager — Create, join, and manage CRDT-based shared editing sessions.
 * Shows active collaborators, their cursors, and session controls.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  FaUsers, FaPlus, FaSignInAlt, FaSignOutAlt, FaCopy, FaCheck,
  FaCircle, FaUser, FaUsersCog, FaLock, FaUnlock, FaSync,
  FaUndo, FaRedo, FaComments, FaCode, FaShare, FaTimes, FaFile,
} from '../Icon'
import CollabChat from './CollabChat'
import SharedFileTree from './SharedFileTree'
import {
  createSession,
  joinSession,
  destroySession,
  onCollaborationChange,
  undo,
  redo,
  getCollaborationState,
  type CollaborationState,
  type Collaborator,
  type Session,
} from '../../services/collaborationService'

// ── Color utilities ────────────────────────────────────
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ── Sub-components ─────────────────────────────────────

function CollaboratorCard({ collaborator }: { collaborator: Collaborator }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/20 transition-all group">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: collaborator.color }}
      >
        {getInitials(collaborator.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ide-text truncate">{collaborator.name}</div>
        <div className="text-[10px] text-ide-text-dim">
          {collaborator.isActive ? (
            <span className="text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active now
            </span>
          ) : (
            <span>Last seen {timeSince(collaborator.lastSeen)}</span>
          )}
        </div>
        {collaborator.cursor && (
          <div className="text-[10px] text-ide-text-dim mt-0.5 font-mono">
            Ln {collaborator.cursor.line}, Col {collaborator.cursor.column}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {collaborator.cursor && (
          <div
            className="w-2 h-4 rounded-sm animate-pulse"
            style={{ background: collaborator.color }}
            title="Cursor active"
          />
        )}
      </div>
    </div>
  )
}

function SessionStats({ state }: { state: CollaborationState }) {
  const onlineCount = state.collaborators.filter(c => c.isActive).length + 1 // +1 for self
  const totalCount = state.collaborators.length + 1

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: 'Online', value: onlineCount, color: 'text-green-400', icon: <FaUsersCog size={12} /> },
        { label: 'Total', value: totalCount, color: 'text-blue-400', icon: <FaUsers size={12} /> },
        { label: 'Status', value: state.isConnected ? 'Synced' : 'Offline', color: state.isConnected ? 'text-green-400' : 'text-yellow-400', icon: state.isConnected ? <FaCheck size={12} /> : <FaSync size={12} className="animate-spin" /> },
      ].map((stat, i) => (
        <div key={i} className="p-2.5 rounded-lg bg-ide-surface border border-ide-border text-center">
          <div className={`flex items-center justify-center gap-1 text-xs ${stat.color}`}>
            {stat.icon} {stat.value}
          </div>
          <div className="text-[10px] text-ide-text-dim mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────

export default function CollaborationManager({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<CollaborationState>(getCollaborationState())
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle')
  const [roomName, setRoomName] = useState('')
  const [userName, setUserName] = useState('')
  const [copied, setCopied] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<Session[]>([])
  const [activeTab, setActiveTab] = useState<'session' | 'chat' | 'files'>('session')

  // Subscribe to collaboration state changes
  useEffect(() => {
    const unsub = onCollaborationChange((newState) => {
      setState(newState)
    })
    return unsub
  }, [])

  // ── Create session ──────────────────────────────
  const handleCreate = useCallback(() => {
    if (!roomName.trim()) return
    const session = createSession({
      roomName: roomName.trim(),
      userName: userName.trim() || undefined,
      documentPath: roomName.trim(),
    })
    setSessionHistory(prev => [session, ...prev].slice(0, 10))
    setMode('idle')
  }, [roomName, userName])

  // ── Join session ────────────────────────────────
  const handleJoin = useCallback(() => {
    if (!roomName.trim()) return
    const session = joinSession({
      roomName: roomName.trim(),
      userName: userName.trim() || undefined,
    })
    setSessionHistory(prev => [session, ...prev].slice(0, 10))
    setMode('idle')
  }, [roomName, userName])

  // ── Leave session ───────────────────────────────
  const handleLeave = useCallback(() => {
    destroySession()
  }, [])

  // ── Copy invite link ────────────────────────────
  const handleCopyInvite = useCallback(() => {
    const link = `idexal://collab/${state.sessionId || roomName}`
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [state.sessionId, roomName])

  const isConnected = state.sessionId !== null

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaUsers size={16} className="text-violet-400" />
          <span className="text-sm font-semibold">Collaboration</span>
          {isConnected && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-surface-alt rounded text-ide-text-secondary">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!isConnected ? (
          /* ── Not connected — show create/join form ── */
          <div className="space-y-4">
            {/* Welcome banner */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FaUsersCog size={16} className="text-violet-400" />
                <span className="text-sm font-semibold text-violet-300">Real-time Collaboration</span>
              </div>
              <p className="text-xs text-ide-text-dim leading-relaxed">
                Edit the same files simultaneously with your team using CRDT-powered conflict-free
                replicated data types. Every keystroke syncs in real-time.
              </p>
            </div>

            {/* Session identity */}
            <div>
              <label className="text-[10px] text-ide-text-dim uppercase tracking-wider font-semibold mb-1.5 block">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full px-3 py-2 bg-ide-surface border border-ide-border rounded-lg text-sm outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            {/* Mode selector */}
            {mode === 'idle' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('create')}
                  className="p-4 rounded-xl bg-ide-surface border border-ide-border hover:border-green-500/40 hover:bg-green-500/5 transition-all text-left group"
                >
                  <FaPlus size={20} className="text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-semibold text-ide-text">Create Session</div>
                  <div className="text-[10px] text-ide-text-dim mt-1">Start a new shared editing session</div>
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="p-4 rounded-xl bg-ide-surface border border-ide-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left group"
                >
                  <FaSignInAlt size={20} className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-semibold text-ide-text">Join Session</div>
                  <div className="text-[10px] text-ide-text-dim mt-1">Connect to an existing session</div>
                </button>
              </div>
            )}

            {/* Create form */}
            {mode === 'create' && (
              <div className="p-4 rounded-xl bg-ide-surface border border-green-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-400">Create Session</span>
                  <button onClick={() => setMode('idle')} className="text-ide-text-dim hover:text-ide-text text-xs">Cancel</button>
                </div>
                <input
                  type="text"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="Session name (e.g. feature-branch)"
                  className="w-full px-3 py-2 bg-ide-bg border border-ide-border rounded-lg text-sm outline-none focus:border-green-500/50"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!roomName.trim()}
                  className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Create & Start
                </button>
              </div>
            )}

            {/* Join form */}
            {mode === 'join' && (
              <div className="p-4 rounded-xl bg-ide-surface border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-400">Join Session</span>
                  <button onClick={() => setMode('idle')} className="text-ide-text-dim hover:text-ide-text text-xs">Cancel</button>
                </div>
                <input
                  type="text"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="Session name to join"
                  className="w-full px-3 py-2 bg-ide-bg border border-ide-border rounded-lg text-sm outline-none focus:border-blue-500/50"
                  autoFocus
                />
                <button
                  onClick={handleJoin}
                  disabled={!roomName.trim()}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Join Session
                </button>
              </div>
            )}

            {/* Recent sessions */}
            {sessionHistory.length > 0 && (
              <div>
                <div className="text-[10px] text-ide-text-dim uppercase tracking-wider font-semibold mb-2">Recent Sessions</div>
                <div className="space-y-1.5">
                  {sessionHistory.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setRoomName(s.name); setMode('join') }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-ide-surface border border-ide-border hover:border-ide-brand/20 text-left transition-colors"
                    >
                      <FaCode size={12} className="text-ide-text-dim" />
                      <span className="text-xs text-ide-text truncate flex-1">{s.name}</span>
                      <span className="text-[10px] text-ide-text-dim">{timeSince(s.createdAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Connected — show live session ── */
          <>
          {/* Tab bar */}
          <div className="flex border-b border-ide-border -mx-3 px-3">
            {([
              { key: 'session' as const, label: 'Session', icon: <FaUsers size={10} /> },
              { key: 'chat' as const, label: 'Chat', icon: <FaComments size={10} /> },
              { key: 'files' as const, label: 'Files', icon: <FaFile size={10} /> },
            ]).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition-colors ${
                  activeTab === t.key ? 'border-violet-400 text-violet-400' : 'border-transparent text-ide-text-dim hover:text-ide-text'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'session' && (
          <div className="space-y-4">
            {/* Session info card */}
            <div className="p-3 rounded-xl bg-ide-surface border border-ide-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-semibold text-ide-text">{state.sessionId ? 'Connected' : 'Session Active'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyInvite}
                    className="p-1.5 rounded-lg hover:bg-ide-surface-alt text-ide-text-dim hover:text-ide-text transition-colors"
                    title="Copy invite link"
                  >
                    {copied ? <FaCheck size={12} className="text-green-400" /> : <FaCopy size={12} />}
                  </button>
                  <button
                    onClick={handleLeave}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-ide-text-dim hover:text-red-400 transition-colors"
                    title="Leave session"
                  >
                    <FaSignOutAlt size={12} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <SessionStats state={state} />

              {/* Undo/Redo controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  className="flex-1 py-1.5 rounded-lg bg-ide-surface-alt border border-ide-border hover:border-ide-brand/20 text-xs text-ide-text-dim hover:text-ide-text flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FaUndo size={10} /> Undo
                </button>
                <button
                  onClick={redo}
                  className="flex-1 py-1.5 rounded-lg bg-ide-surface-alt border border-ide-border hover:border-ide-brand/20 text-xs text-ide-text-dim hover:text-ide-text flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FaRedo size={10} /> Redo
                </button>
              </div>
            </div>

            {/* Local user card */}
            <div>
              <div className="text-[10px] text-ide-text-dim uppercase tracking-wider font-semibold mb-2">You</div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ide-surface border border-violet-500/20">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: state.localUser.color }}
                >
                  {getInitials(state.localUser.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ide-text truncate">{state.localUser.name}</div>
                  <div className="text-[10px] text-violet-400">Host • You</div>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: state.localUser.color }}
                />
              </div>
            </div>

            {/* Collaborators */}
            <div>
              <div className="text-[10px] text-ide-text-dim uppercase tracking-wider font-semibold mb-2">
                Collaborators ({state.collaborators.length})
              </div>
              {state.collaborators.length > 0 ? (
                <div className="space-y-2">
                  {state.collaborators.map((c) => (
                    <CollaboratorCard key={c.id} collaborator={c} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-ide-surface border border-dashed border-ide-border text-center">
                  <FaUsersCog size={24} className="text-ide-text-dim/30 mx-auto mb-2" />
                  <p className="text-xs text-ide-text-dim">No other collaborators yet</p>
                  <p className="text-[10px] text-ide-text-dim mt-1">Share the invite link to get started</p>
                  <button
                    onClick={handleCopyInvite}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-600/20 transition-colors inline-flex items-center gap-1.5"
                  >
                    <FaShare size={10} /> Copy Invite Link
                  </button>
                </div>
              )}
            </div>

            {/* Connection info */}
            <div className="p-3 rounded-lg bg-ide-surface-alt border border-ide-border">
              <div className="flex items-center gap-2 text-[10px] text-ide-text-dim">
                {state.isConnected ? (
                  <>
                    <FaUnlock size={10} className="text-green-400" />
                    <span>WebSocket connected • CRDT sync active • Real-time collaboration enabled</span>
                  </>
                ) : (
                  <>
                    <FaLock size={10} className="text-yellow-400" />
                    <span>Connecting to collaboration server...</span>
                  </>
                )}
              </div>
            </div>
          </div>
          )}

          {activeTab === 'chat' && (
            <CollabChat onClose={() => {}} />
          )}

          {activeTab === 'files' && (
            <SharedFileTree />
          )}
          </>
        )}
      </div>
    </div>
  )
}
