/**
 * CollabChat — Real-time chat during collaboration sessions.
 * Uses Yjs shared array for message persistence and sync.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FaPaperPlane, FaTimes, FaComments } from '../Icon'
import { getYDoc, getCollaborationState } from '../../services/collaborationService'
import * as Y from 'yjs'

export interface CollabMessage {
  id: string
  author: string
  color: string
  text: string
  timestamp: number
  type: 'text' | 'system' | 'code'
}

interface CollabChatProps {
  onClose: () => void
}

export default function CollabChat({ onClose }: CollabChatProps) {
  const [messages, setMessages] = useState<CollabMessage[]>([])
  const [input, setInput] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const yarrayRef = useRef<Y.Array<Record<string, any>> | null>(null)

  // Get or create the shared message array
  const getYMessages = useCallback(() => {
    const ydoc = getYDoc()
    if (!ydoc) return null
    if (!yarrayRef.current) {
      yarrayRef.current = ydoc.getArray<Record<string, any>>('collab-chat')
      // Listen for changes from other users
      yarrayRef.current.observe(() => {
        loadMessages()
      })
    }
    return yarrayRef.current
  }, [])

  // Load messages from Yjs shared array
  const loadMessages = useCallback(() => {
    const yarr = yarrayRef.current
    if (!yarr) return
    const items: CollabMessage[] = []
    yarr.forEach((item) => {
      items.push({
        id: item.id || '',
        author: item.author || 'Anonymous',
        color: item.color || '#888',
        text: item.text || '',
        timestamp: item.timestamp || 0,
        type: item.type || 'text',
      })
    })
    setMessages(items)
  }, [])

  // Send a message
  const sendMessage = useCallback(() => {
    if (!input.trim()) return
    const state = getCollaborationState()
    const yarr = getYMessages()
    if (!yarr) return

    const msg: Record<string, any> = {
      id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      author: state.localUser.name || 'Anonymous',
      color: state.localUser.color || '#888',
      text: input.trim(),
      timestamp: Date.now(),
      type: 'text',
    }

    yarr.push([msg])
    setInput('')
  }, [input, getYMessages])

  // Send a system message
  const sendSystemMessage = useCallback((text: string) => {
    const yarr = getYMessages()
    if (!yarr) return
    yarr.push([{
      id: `sys-${Date.now().toString(36)}`,
      author: 'System',
      color: '#888',
      text,
      timestamp: Date.now(),
      type: 'system',
    }])
  }, [getYMessages])

  // Load on mount
  useEffect(() => {
    getYMessages()
    loadMessages()
  }, [getYMessages, loadMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaComments size={14} className="text-violet-400" />
          <span className="text-sm font-semibold">Team Chat</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-surface-alt rounded text-ide-text-secondary">×</button>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <FaComments size={24} className="text-ide-text-dim/20 mx-auto mb-2" />
            <p className="text-xs text-ide-text-dim">No messages yet</p>
            <p className="text-[10px] text-ide-text-dim mt-1">Start chatting with your team</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.type === 'system' ? 'justify-center' : ''}`}>
            {msg.type === 'system' ? (
              <div className="text-[10px] text-ide-text-dim italic px-3 py-1">{msg.text}</div>
            ) : (
              <>
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ background: msg.color }}
                >
                  {msg.author[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: msg.color }}>{msg.author}</span>
                    <span className="text-[9px] text-ide-text-dim">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="text-xs text-ide-text leading-relaxed break-words">{msg.text}</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-ide-border">
        <div className="flex items-center gap-2 bg-ide-surface border border-ide-border rounded-lg px-2 py-1 focus-within:border-violet-500/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-dim/50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-1.5 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white transition-colors"
          >
            <FaPaperPlane size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}
