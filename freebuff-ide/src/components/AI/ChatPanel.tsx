import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAgent } from '../../hooks/useAgent'
import { useSettingsStore } from '../../stores/settingsStore'
import MarkdownRenderer from './MarkdownRenderer'
import { codeActionService } from '../../services/codeActionService'
import { aiStreamingService } from '../../services/aiStreamingService'
import {
  Send, X, Settings, Bot, Trash2, ChevronDown,
  Code, Search, Bug, Boxes, FlaskConical, Copy, Check,
  Workflow, Zap, Users, ChevronRight, Rocket, Shield, Gauge,
  Sparkles
} from 'lucide-react'

interface ChatPanelProps {
  onClose: () => void
  onOpenSettings: () => void
}

const AGENTS = [
  { type: 'code', name: 'Code', icon: Code, color: 'text-blue-400', desc: 'Write code' },
  { type: 'review', name: 'Review', icon: Search, color: 'text-green-400', desc: 'Review code' },
  { type: 'debug', name: 'Debug', icon: Bug, color: 'text-yellow-400', desc: 'Find bugs' },
  { type: 'architect', name: 'Architect', icon: Boxes, color: 'text-purple-400', desc: 'Design systems' },
  { type: 'test', name: 'Test', icon: FlaskConical, color: 'text-pink-400', desc: 'Write tests' },
  { type: 'devops', name: 'DevOps', icon: Rocket, color: 'text-orange-400', desc: 'Deploy & CI/CD' },
  { type: 'security', name: 'Security', icon: Shield, color: 'text-red-400', desc: 'Security audit' },
  { type: 'performance', name: 'Perf', icon: Gauge, color: 'text-cyan-400', desc: 'Optimize' },
]

type ChatMode = 'chat' | 'workflow' | 'collab' | 'orchestrate'

export default function ChatPanel({ onClose, onOpenSettings }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('code')
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [chatMode, setChatMode] = useState<ChatMode>('chat')
  const [selectedWorkflow, setSelectedWorkflow] = useState('review-and-fix')
  const [showActivity, setShowActivity] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages, sendMessage, runWorkflow, collaborativeReview, orchestrate,
    cancelStream, clearMessages, isStreaming,
    activeWorkflow, agentActivity, workflows,
  } = useAgent()
  const { activeProvider, openaiApiKey, anthropicApiKey } = useSettingsStore()

  // Configure AI streaming service on mount
  useEffect(() => {
    if (activeProvider === 'openai' && openaiApiKey) {
      aiStreamingService.configure({ provider: 'openai', apiKey: openaiApiKey, model: 'gpt-4o' })
    } else if (activeProvider === 'anthropic' && anthropicApiKey) {
      aiStreamingService.configure({ provider: 'anthropic', apiKey: anthropicApiKey, model: 'claude-sonnet-4-20250514' })
    } else {
      aiStreamingService.configure({ provider: 'demo', apiKey: '', model: 'demo' })
    }
  }, [activeProvider, openaiApiKey, anthropicApiKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return
    if (chatMode === 'workflow') {
      runWorkflow(selectedWorkflow, input)
    } else if (chatMode === 'collab') {
      collaborativeReview(selectedAgent, input)
    } else if (chatMode === 'orchestrate') {
      orchestrate(input)
    } else {
      sendMessage(input, selectedAgent)
    }
    setInput('')
  }, [input, selectedAgent, chatMode, selectedWorkflow, sendMessage, runWorkflow, collaborativeReview, orchestrate, isStreaming])

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
  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow)

  const getPlaceholder = () => {
    if (chatMode === 'workflow') return `Describe the task for the ${currentWorkflow?.name || 'workflow'}...`
    if (chatMode === 'collab') return `Describe the task for ${currentAgent.name} → Review → Fix...`
    if (chatMode === 'orchestrate') return `Describe what you want — I'll auto-select the best agents...`
    return `Ask ${currentAgent.name} Agent... (Shift+Enter for new line)`
  }

  const modeButtons: { mode: ChatMode; label: string; icon: React.ReactNode; title: string }[] = [
    { mode: 'chat', label: 'Chat', icon: null, title: 'Single agent chat' },
    { mode: 'workflow', label: 'Workflow', icon: <Workflow className="w-3 h-3" />, title: 'Multi-step pipeline' },
    { mode: 'collab', label: 'Collab', icon: <Users className="w-3 h-3" />, title: 'Collaborative review' },
    { mode: 'orchestrate', label: 'Auto', icon: <Sparkles className="w-3 h-3" />, title: 'Smart auto-orchestration' },
  ]

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">AI Chat</span>

          {/* Mode Tabs */}
          <div className="flex items-center gap-0.5 bg-ide-bg rounded-md p-0.5">
            {modeButtons.map((mb) => (
              <button
                key={mb.mode}
                onClick={() => setChatMode(mb.mode)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${
                  chatMode === mb.mode ? 'bg-ide-surface text-ide-text shadow-sm' : 'text-ide-text-muted hover:text-ide-text'
                }`}
                title={mb.title}
              >
                {mb.icon}
                {mb.label}
              </button>
            ))}
          </div>

          {/* Agent/Workflow Selector */}
          {chatMode === 'chat' && (
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
                <div className="absolute top-full left-0 mt-1 w-52 bg-ide-surface border border-ide-border rounded-lg shadow-xl z-20 overflow-hidden">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon
                    return (
                      <button
                        key={agent.type}
                        onClick={() => { setSelectedAgent(agent.type); setShowAgentPicker(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          selectedAgent === agent.type ? `${agent.color} bg-current/10` : 'text-ide-text hover:bg-ide-border/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="text-xs font-medium">{agent.name}</div>
                          <div className="text-[10px] text-ide-text-muted">{agent.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {chatMode === 'workflow' && (
            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="text-xs bg-ide-bg border border-ide-border rounded px-2 py-1 text-ide-text"
            >
              {workflows.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name} ({w.steps.length} steps)</option>
              ))}
            </select>
          )}

          {chatMode === 'collab' && (
            <div className="relative">
              <button
                onClick={() => setShowAgentPicker(!showAgentPicker)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${currentAgent.color} border-current/20`}
              >
                <AgentIcon className="w-3 h-3" />
                <span>{currentAgent.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showAgentPicker && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-ide-surface border border-ide-border rounded-lg shadow-xl z-20 overflow-hidden">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon
                    return (
                      <button
                        key={agent.type}
                        onClick={() => { setSelectedAgent(agent.type); setShowAgentPicker(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          selectedAgent === agent.type ? `${agent.color} bg-current/10` : 'text-ide-text hover:bg-ide-border/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="text-xs font-medium">{agent.name}</div>
                          <div className="text-[10px] text-ide-text-muted">{agent.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {chatMode === 'orchestrate' && (
            <span className="text-[10px] text-ide-accent flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Smart auto-selection
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {agentActivity.length > 0 && (
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`p-1.5 rounded transition-colors ${showActivity ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border'}`}
              title="Agent Activity"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
          <button onClick={clearMessages} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onOpenSettings} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent Activity Feed */}
      {showActivity && agentActivity.length > 0 && (
        <div className="border-b border-ide-border bg-ide-bg max-h-40 overflow-auto">
          <div className="px-3 py-2">
            <div className="text-[10px] font-semibold text-ide-text-muted uppercase mb-1">Agent Activity</div>
            {agentActivity.slice(-10).reverse().map((msg) => {
              const agent = AGENTS.find(a => a.type === msg.from)
              return (
                <div key={msg.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                  <span className={`font-medium ${agent?.color || 'text-ide-text-muted'}`}>{msg.from}</span>
                  <ChevronRight className="w-3 h-3 text-ide-text-muted" />
                  <span className="text-ide-text-muted">{msg.to}</span>
                  <span className="text-ide-text truncate flex-1">{msg.content.slice(0, 60)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-ide-accent/10 flex items-center justify-center mb-3">
              {chatMode === 'workflow' ? (
                <Workflow className="w-7 h-7 text-ide-accent" />
              ) : chatMode === 'collab' ? (
                <Users className="w-7 h-7 text-ide-accent" />
              ) : chatMode === 'orchestrate' ? (
                <Sparkles className="w-7 h-7 text-ide-accent" />
              ) : (
                <AgentIcon className={`w-7 h-7 ${currentAgent.color}`} />
              )}
            </div>
            <h3 className="text-sm font-medium text-ide-text mb-1">
              {chatMode === 'workflow' ? currentWorkflow?.name || 'Workflow'
                : chatMode === 'collab' ? 'Collaborative Review'
                : chatMode === 'orchestrate' ? 'Smart Orchestration'
                : `${currentAgent.name} Agent`
              }
            </h3>
            <p className="text-xs text-ide-text-muted max-w-[320px]">
              {chatMode === 'workflow'
                ? `${currentWorkflow?.description || 'Multi-step agent pipeline'}. The workflow chains multiple agents together.`
                : chatMode === 'collab'
                ? `${currentAgent.name} works first, then Review checks it, then Debug/Security/Performance fix any critical issues.`
                : chatMode === 'orchestrate'
                ? 'Describe what you need. I\'ll analyze the request and automatically select the best agents and workflow.'
                : `Ask me anything about your code. I can write, review, debug, test, deploy, secure, or optimize.`
              }
            </p>

            {/* Agent Grid */}
            {chatMode === 'chat' && (
              <div className="grid grid-cols-4 gap-2 mt-4 max-w-[320px]">
                {AGENTS.map((agent) => {
                  const Icon = agent.icon
                  return (
                    <button
                      key={agent.type}
                      onClick={() => { setSelectedAgent(agent.type); inputRef.current?.focus() }}
                      className={`p-2 rounded-lg border transition-all ${
                        selectedAgent === agent.type
                          ? `${agent.color} border-current/30 bg-current/5`
                          : 'text-ide-text-muted border-ide-border hover:border-current/20 hover:bg-ide-bg'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <div className="text-[9px]">{agent.name}</div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Workflow List */}
            {chatMode === 'workflow' && (
              <div className="mt-4 max-w-[320px] space-y-1.5">
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => { setSelectedWorkflow(wf.id); inputRef.current?.focus() }}
                    className={`w-full text-left p-2 rounded-lg border transition-all ${
                      selectedWorkflow === wf.id
                        ? 'border-ide-accent/30 bg-ide-accent/5 text-ide-accent'
                        : 'border-ide-border hover:border-ide-accent/20 text-ide-text-muted hover:bg-ide-bg'
                    }`}
                  >
                    <div className="text-xs font-medium">{wf.icon} {wf.name}</div>
                    <div className="text-[10px] text-ide-text-muted">{wf.description} ({wf.steps.length} steps)</div>
                  </button>
                ))}
              </div>
            )}

            {!((activeProvider === 'openai' && openaiApiKey) || (activeProvider === 'anthropic' && anthropicApiKey)) && (
              <div className="mt-4 p-3 rounded-lg bg-ide-warning/10 border border-ide-warning/30 max-w-[280px]">
                <p className="text-xs text-ide-warning">⚠️ No AI provider configured. Responses will be demo only.</p>
                <button onClick={onOpenSettings} className="mt-2 text-xs text-ide-accent hover:underline">Configure AI Provider →</button>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`group ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mb-1">
                    <Bot className="w-3 h-3 text-ide-accent" />
                    <span className="text-[10px] text-ide-text-muted">
                      {AGENTS.find(a => a.type === msg.agentType)?.name || 'Agent'}
                    </span>
                    {msg.isStreaming && <span className="text-[10px] text-ide-accent animate-pulse">typing...</span>}
                  </div>
                )}
                {msg.role === 'system' && (
                  <div className="mb-2 px-3 py-2 rounded-lg bg-ide-accent/5 border border-ide-accent/20 text-xs text-ide-text-muted">
                    {msg.content}
                  </div>
                )}
                {msg.role !== 'system' && (
                  <div className={`inline-block text-left rounded-lg px-3 py-2 ${
                    msg.role === 'user' ? 'bg-ide-accent/20 text-ide-text' : 'bg-ide-bg border border-ide-border text-ide-text'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} onApplyCode={handleApplyCode} />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                )}
                {msg.role === 'assistant' && !msg.isStreaming && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="p-1 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
                      title="Copy"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-ide-success" /> : <Copy className="w-3 h-3" />}
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
            placeholder={getPlaceholder()}
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
            <button onClick={cancelStream} className="p-2 rounded-lg bg-ide-error text-white hover:bg-ide-error/80 transition-colors" title="Stop">
              <div className="w-3 h-3 bg-white rounded-sm" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-ide-accent text-white hover:bg-ide-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {chatMode === 'workflow' ? <Workflow className="w-4 h-4" />
                : chatMode === 'collab' ? <Users className="w-4 h-4" />
                : chatMode === 'orchestrate' ? <Sparkles className="w-4 h-4" />
                : <Send className="w-4 h-4" />
              }
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[10px] text-ide-text-muted">{messages.length} messages</span>
          <span className="text-[10px] text-ide-text-muted">
            {chatMode === 'workflow' ? `${currentWorkflow?.steps.length || 0}-step pipeline`
              : chatMode === 'orchestrate' ? 'Smart auto-selection'
              : '⏎ Send · ⇧⏎ New line'}
          </span>
        </div>
      </div>
    </div>
  )
}
