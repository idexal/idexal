import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAgent } from '../../hooks/useAgent'
import { useSettingsStore } from '../../stores/settingsStore'
import MarkdownRenderer from './MarkdownRenderer'
import { codeActionService } from '../../services/codeActionService'
import {
  Send, X, Settings, Bot, Trash2, ChevronDown,
  Code, Search, Bug, Boxes, FlaskConical, Copy, Check
} from 'lucide-react'

interface ChatPanelProps {
  onClose: () => void
  onOpenSettings: () => void
}

const AGENTS = [
  { type: 'code', name: 'Code', icon: Code, color: 'text-blue-400' },
  { type: 'review', name: 'Review', icon: Search, color: 'text-green-400' },
  { type: 'debug', name: 'Debug', icon: Bug, color: 'text-yellow-400' },
  { type: 'architect', name: 'Architect', icon: Boxes, color: 'text-purple-400' },
  { type: 'test', name: 'Test', icon: FlaskConical, color: 'text-pink-400' },
]

export default function ChatPanel({ onClose, onOpenSettings }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('code')
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { messages, sendMessage, cancelStream, clearMessages, isStreaming } = useAgent()
  const { activeProvider, openaiApiKey, anthropicApiKey } = useSettingsStore()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return
    sendMessage(input, selectedAgent)
    setInput('')
  }, [input, selectedAgent, sendMessage, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleApplyCode = useCallback(async (code: string, language: string) => {
    const ext = language === 'typescript' ? 'ts' : language === 'tsx' ? 'tsx' : language
    const filePath = `new-${Date.now()}.${ext}`
    const action = codeActionService.createAction(
      [{ language, filePath, content: code }],
      `Apply ${language} code`
    )
    codeActionService.applyAction(action.id)
  }, [])

  const handleCopyMessage = useCallback(async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const currentAgent = AGENTS.find(a => a.type === selectedAgent) || AGENTS[0]
  const AgentIcon = currentAgent.icon

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">AI Chat</span>

          {/* Agent Selector */}
          <div className="relative">
            <button
              onClick={() => setShowAgentPicker(!showAgentPicker)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${currentAgent.color} border-current/20 hover:bg-current/10`}
            >
              <AgentIcon className="w-3 h-3" />
              <span>{currentAgent.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showAgentPicker && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-ide-surface border border-ide-border rounded-lg shadow-xl z-10 overflow-hidden">
                {AGENTS.map((agent) => {
                  const Icon = agent.icon
                  return (
                    <button
                      key={agent.type}
                      onClick={() => {
                        setSelectedAgent(agent.type)
                        setShowAgentPicker(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        selectedAgent === agent.type
                          ? `${agent.color} bg-current/10`
                          : 'text-ide-text hover:bg-ide-border/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{agent.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
            title="Clear Messages"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-ide-accent/10 flex items-center justify-center mb-3">
              <AgentIcon className={`w-6 h-6 ${currentAgent.color}`} />
            </div>
            <h3 className="text-sm font-medium text-ide-text mb-1">
              {currentAgent.name} Agent
            </h3>
            <p className="text-xs text-ide-text-muted max-w-[250px]">
              Ask me anything about your code. I can write, review, debug, or help with architecture.
            </p>
            {!((activeProvider === 'openai' && openaiApiKey) || (activeProvider === 'anthropic' && anthropicApiKey)) && (
              <div className="mt-4 p-3 rounded-lg bg-ide-warning/10 border border-ide-warning/30 max-w-[280px]">
                <p className="text-xs text-ide-warning">
                  ⚠️ No AI provider configured. Responses will be demo only.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="mt-2 text-xs text-ide-accent hover:underline"
                >
                  Configure AI Provider →
                </button>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`group ${msg.role === 'user' ? 'flex justify-end' : ''}`}
            >
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                {/* Agent label */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mb-1">
                    <Bot className="w-3 h-3 text-ide-accent" />
                    <span className="text-[10px] text-ide-text-muted">
                      {AGENTS.find(a => a.type === msg.agentType)?.name || 'Agent'}
                    </span>
                    {msg.isStreaming && (
                      <span className="text-[10px] text-ide-accent animate-pulse">typing...</span>
                    )}
                  </div>
                )}

                {/* Message content */}
                <div
                  className={`inline-block text-left rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-ide-accent/20 text-ide-text'
                      : 'bg-ide-bg border border-ide-border text-ide-text'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer
                      content={msg.content}
                      onApplyCode={handleApplyCode}
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>

                {/* Actions */}
                {msg.role === 'assistant' && !msg.isStreaming && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="p-1 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-ide-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-ide-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${currentAgent.name} Agent... (Shift+Enter for new line)`}
            className="flex-1 resize-none bg-ide-bg border border-ide-border rounded-lg px-3 py-2 text-sm text-ide-text placeholder:text-ide-text-muted focus:outline-none focus:ring-1 focus:ring-ide-accent min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={isStreaming}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          {isStreaming ? (
            <button
              onClick={cancelStream}
              className="p-2 rounded-lg bg-ide-error text-white hover:bg-ide-error/80 transition-colors"
              title="Stop"
            >
              <div className="w-3 h-3 bg-white rounded-sm" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-ide-accent text-white hover:bg-ide-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[10px] text-ide-text-muted">
            {messages.length} messages
          </span>
          <span className="text-[10px] text-ide-text-muted">
            ⏎ Send · ⇧⏎ New line
          </span>
        </div>
      </div>
    </div>
  )
}
