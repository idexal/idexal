import React, { useState, useRef, useEffect } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { useAgent } from '../../hooks/useAgent'
import { AGENT_CONFIGS } from '../../utils/agentUtils'
import AgentThinking from '../AgentThinking/AgentThinking'
import { Send, X, Bot, User, Loader2, ChevronDown, Sparkles, Settings } from 'lucide-react'

interface ChatPanelProps {
  onClose: () => void
  onOpenSettings?: () => void
}

export default function ChatPanel({ onClose, onOpenSettings }: ChatPanelProps) {
  const {
    messages,
    isProcessing,
    selectedAgentType,
    selectAgent,
  } = useAgent()
  const { sendMessage } = useAgent()
  const [input, setInput] = useState('')
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isProcessing) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentConfig = AGENT_CONFIGS[selectedAgentType]

  return (
    <div className="h-full flex flex-col bg-ide-chat">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-ide-accent" />
          <span className="font-medium text-ide-text">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted" title="AI Settings">
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="px-4 py-2 border-b border-ide-border">
        <div className="relative">
          <button
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-ide-bg border border-ide-border hover:border-ide-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentConfig.icon}</span>
              <span className="text-sm font-medium" style={{ color: currentConfig.color }}>
                {currentConfig.name}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-ide-text-muted transition-transform ${showAgentSelector ? 'rotate-180' : ''}`} />
          </button>

          {showAgentSelector && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-ide-surface border border-ide-border rounded-lg shadow-lg z-10 overflow-hidden">
              {Object.values(AGENT_CONFIGS).map((config) => (
                <button
                  key={config.type}
                  onClick={() => {
                    selectAgent(config.type)
                    setShowAgentSelector(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-ide-border/50 transition-colors ${
                    selectedAgentType === config.type ? 'bg-ide-accent/10' : ''
                  }`}
                >
                  <span className="text-lg">{config.icon}</span>
                  <div className="text-left">
                    <div className="text-sm font-medium" style={{ color: config.color }}>
                      {config.name}
                    </div>
                    <div className="text-xs text-ide-text-muted">{config.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-ide-accent/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-ide-accent" />
            </div>
            <h3 className="text-sm font-medium text-ide-text mb-1">How can I help?</h3>
            <p className="text-xs text-ide-text-muted max-w-xs mb-4">
              Ask me to write code, review your work, debug issues, or plan architecture.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {['Write a React component', 'Review this code', 'Fix the bug in auth', 'Plan microservices architecture', 'Write unit tests'].map((action) => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  className="px-3 py-1.5 text-xs bg-ide-surface border border-ide-border rounded-full hover:border-ide-accent transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Provider Status */}
            <div className="mt-6 text-xs text-ide-text-muted">
              {isProcessing ? (
                <span className="text-ide-accent">Processing...</span>
              ) : (
                <span>Press Enter to send • Shift+Enter for new line</span>
              )}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 chat-message ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role !== 'user' && (
                <div className="w-8 h-8 rounded-lg bg-ide-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-ide-accent" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-ide-accent text-white'
                    : message.role === 'system'
                    ? 'bg-ide-warning/10 border border-ide-warning/30 text-ide-warning'
                    : 'bg-ide-bg border border-ide-border'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                {message.metadata?.agentType && (
                  <div className="mt-2 text-xs text-ide-text-muted border-t border-ide-border pt-2">
                    {(AGENT_CONFIGS as any)[message.metadata.agentType]?.icon} {(AGENT_CONFIGS as any)[message.metadata.agentType]?.name}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-ide-surface flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-ide-text-muted" />
                </div>
              )}
            </div>
          ))
        )}

        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-ide-accent/10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-ide-accent animate-spin" />
            </div>
            <div className="bg-ide-bg border border-ide-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-ide-text-muted">
                <span>Thinking</span>
                <div className="typing-indicator flex gap-1">
                  <span className="w-1.5 h-1.5 bg-ide-accent rounded-full"></span>
                  <span className="w-1.5 h-1.5 bg-ide-accent rounded-full"></span>
                  <span className="w-1.5 h-1.5 bg-ide-accent rounded-full"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-ide-border">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Shift+Enter for new line)"
            rows={1}
            className="w-full resize-none rounded-lg bg-ide-bg border border-ide-border px-4 py-3 pr-12 text-sm text-ide-text placeholder:text-ide-text-muted focus:outline-none focus:ring-2 focus:ring-ide-accent focus:border-transparent"
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={`absolute right-2 bottom-2 p-2 rounded-md transition-colors ${
              input.trim() && !isProcessing
                ? 'bg-ide-accent text-white hover:bg-ide-accent-hover'
                : 'bg-ide-surface text-ide-text-muted cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
