import React, { useState, useEffect } from 'react'
import {
  Users, Share2, Copy, Check, Globe, Lock, Clock, Mic, MicOff,
  Video, VideoOff, MessageSquare, Settings, UserPlus, Link,
  Shield, Eye, Edit3, Terminal, Circle, Wifi, WifiOff
} from 'lucide-react'

interface Collaborator {
  id: string
  name: string
  avatar: string
  color: string
  cursor: { file: string; line: number; column: number } | null
  permission: 'edit' | 'view' | 'admin'
  joinedAt: Date
  isActive: boolean
}

interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: Date
  type: 'text' | 'system'
}

interface ShareSession {
  id: string
  shareUrl: string
  isActive: boolean
  startedAt: Date
  collaborators: Collaborator[]
  isRecording: boolean
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  lockEditing: boolean
}

const MOCK_COLLABORATORS: Collaborator[] = [
  { id: '1', name: 'You (Host)', avatar: '👤', color: '#3b82f6', cursor: { file: 'src/App.tsx', line: 42, column: 15 }, permission: 'admin', joinedAt: new Date(Date.now() - 1800000), isActive: true },
  { id: '2', name: 'Alice Chen', avatar: '👩', color: '#10b981', cursor: { file: 'src/App.tsx', line: 58, column: 8 }, permission: 'edit', joinedAt: new Date(Date.now() - 1200000), isActive: true },
  { id: '3', name: 'Bob Smith', avatar: '👨', color: '#f59e0b', cursor: { file: 'src/utils.ts', line: 15, column: 3 }, permission: 'edit', joinedAt: new Date(Date.now() - 900000), isActive: true },
  { id: '4', name: 'Charlie Dev', avatar: '🧑', color: '#ef4444', cursor: null, permission: 'view', joinedAt: new Date(Date.now() - 600000), isActive: false },
]

const MOCK_CHAT: ChatMessage[] = [
  { id: '1', sender: 'System', message: 'Session started by You (Host)', timestamp: new Date(Date.now() - 1800000), type: 'system' },
  { id: '2', sender: 'Alice Chen', message: 'Hey everyone! Let me start working on the auth module', timestamp: new Date(Date.now() - 1200000), type: 'text' },
  { id: '3', sender: 'Bob Smith', message: 'I\'ll take the API endpoints', timestamp: new Date(Date.now() - 1100000), type: 'text' },
  { id: '4', sender: 'You', message: 'Great! Let\'s sync in 30 minutes', timestamp: new Date(Date.now() - 1000000), type: 'text' },
  { id: '5', sender: 'Alice Chen', message: 'I found a bug in the middleware', timestamp: new Date(Date.now() - 600000), type: 'text' },
  { id: '6', sender: 'System', message: 'Charlie Dev joined as viewer', timestamp: new Date(Date.now() - 500000), type: 'system' },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export default function LiveSharePanel({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState<ShareSession>({
    id: 'session-abc123',
    shareUrl: 'https://idexal.dev/share/session-abc123',
    isActive: true,
    startedAt: new Date(Date.now() - 1800000),
    collaborators: MOCK_COLLABORATORS,
    isRecording: false,
    isAudioEnabled: true,
    isVideoEnabled: false,
    lockEditing: false,
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT)
  const [chatInput, setChatInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'people' | 'chat' | 'settings'>('people')

  const activeCollaborators = session.collaborators.filter(c => c.isActive)

  const copyShareLink = () => {
    navigator.clipboard?.writeText(session.shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendChatMessage = () => {
    if (!chatInput.trim()) return
    const msg: ChatMessage = {
      id: String(chatMessages.length + 1),
      sender: 'You',
      message: chatInput,
      timestamp: new Date(),
      type: 'text',
    }
    setChatMessages(prev => [...prev, msg])
    setChatInput('')
  }

  const togglePermission = (collabId: string) => {
    setSession(prev => ({
      ...prev,
      collaborators: prev.collaborators.map(c =>
        c.id === collabId
          ? { ...c, permission: c.permission === 'edit' ? 'view' : c.permission === 'view' ? 'admin' : 'edit' }
          : c
      ),
    }))
  }

  const removeCollaborator = (collabId: string) => {
    setSession(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c.id !== collabId),
    }))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-green-400" />
          <span className="text-sm font-semibold">Live Share</span>
          {session.isActive && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Circle size={6} className="fill-green-400" />
              Live
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Share Link */}
      <div className="px-3 py-2 border-b border-ide-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
            <Link size={12} className="text-ide-text-secondary mr-1.5" />
            <span className="text-xs text-ide-text-secondary truncate flex-1">{session.shareUrl}</span>
          </div>
          <button
            onClick={copyShareLink}
            className={`p-1.5 rounded text-xs ${copied ? 'bg-green-600 text-white' : 'bg-ide-bg-secondary hover:bg-ide-bg-secondary/80'}`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-ide-text-secondary">
          <Clock size={10} />
          <span>Duration: {timeAgo(session.startedAt)}</span>
          <span>•</span>
          <Users size={10} />
          <span>{activeCollaborators.length} active</span>
        </div>
      </div>

      {/* Audio/Video Controls */}
      <div className="flex items-center justify-center gap-3 px-3 py-2 border-b border-ide-border">
        <button
          onClick={() => setSession(prev => ({ ...prev, isAudioEnabled: !prev.isAudioEnabled }))}
          className={`p-2 rounded-full ${session.isAudioEnabled ? 'bg-green-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
        >
          {session.isAudioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
        </button>
        <button
          onClick={() => setSession(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }))}
          className={`p-2 rounded-full ${session.isVideoEnabled ? 'bg-green-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
        >
          {session.isVideoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
        </button>
        <button
          onClick={() => setSession(prev => ({ ...prev, isRecording: !prev.isRecording }))}
          className={`p-2 rounded-full ${session.isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
          title="Record session"
        >
          <Circle size={14} className={session.isRecording ? 'fill-red-400' : ''} />
        </button>
        <button
          onClick={() => setSession(prev => ({ ...prev, lockEditing: !prev.lockEditing }))}
          className={`p-2 rounded-full ${session.lockEditing ? 'bg-yellow-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
          title="Lock editing"
        >
          {session.lockEditing ? <Lock size={14} /> : <Edit3 size={14} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'people' as const, label: 'People', icon: Users, count: activeCollaborators.length },
          { key: 'chat' as const, label: 'Chat', icon: MessageSquare, count: chatMessages.length },
          { key: 'settings' as const, label: 'Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs border-b-2 flex-1 justify-center ${
              activeTab === tab.key
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
            {tab.count !== undefined && <span className="ml-0.5">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* People Tab */}
        {activeTab === 'people' && (
          <div className="p-3 space-y-2">
            {session.collaborators.map(collab => (
              <div
                key={collab.id}
                className={`flex items-center gap-2 p-2 rounded border border-ide-border/50 ${
                  collab.isActive ? 'bg-ide-bg-secondary/30' : 'opacity-50'
                }`}
              >
                <div className="text-lg">{collab.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">{collab.name}</span>
                    {collab.permission === 'admin' && <Shield size={10} className="text-purple-400" />}
                    {collab.isActive && <Circle size={6} className="fill-green-400 text-green-400" />}
                  </div>
                  {collab.cursor ? (
                    <div className="text-xs text-ide-text-secondary">
                      {collab.cursor.file}:{collab.cursor.line}:{collab.cursor.column}
                    </div>
                  ) : (
                    <div className="text-xs text-ide-text-secondary">Not in editor</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePermission(collab.id)}
                    className={`px-2 py-0.5 text-xs rounded ${
                      collab.permission === 'edit' ? 'bg-green-600/20 text-green-400' :
                      collab.permission === 'view' ? 'bg-blue-600/20 text-blue-400' :
                      'bg-purple-600/20 text-purple-400'
                    }`}
                  >
                    {collab.permission}
                  </button>
                  {collab.id !== '1' && (
                    <button
                      onClick={() => removeCollaborator(collab.id)}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">
              <UserPlus size={12} />
              Invite Collaborator
            </button>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map(msg => (
                <div key={msg.id} className={msg.type === 'system' ? 'text-center' : ''}>
                  {msg.type === 'system' ? (
                    <span className="text-xs text-ide-text-secondary italic">{msg.message}</span>
                  ) : (
                    <div className={`text-xs ${msg.sender === 'You' ? 'text-right' : ''}`}>
                      <span className="text-ide-text-secondary">{msg.sender}: </span>
                      <span className="text-ide-text">{msg.message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-ide-border flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="px-2 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs">
                <span>Allow editing</span>
                <input type="checkbox" checked={!session.lockEditing} onChange={() => setSession(p => ({ ...p, lockEditing: !p.lockEditing }))} className="accent-green-500" />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span>Show cursors</span>
                <input type="checkbox" defaultChecked className="accent-green-500" />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span>Share terminal</span>
                <input type="checkbox" defaultChecked className="accent-green-500" />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span>Share clipboard</span>
                <input type="checkbox" defaultChecked className="accent-green-500" />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span>Notifications</span>
                <input type="checkbox" defaultChecked className="accent-green-500" />
              </label>
            </div>
            <button className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30">
              End Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
