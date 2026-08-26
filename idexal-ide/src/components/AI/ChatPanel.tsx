import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAgent } from '../../hooks/useAgent'
import { useSettingsStore } from '../../stores/settingsStore'
import MarkdownRenderer from './MarkdownRenderer'
import { codeActionService } from '../../services/codeActionService'
import { aiStreamingService } from '../../services/aiStreamingService'
import {
  FaRocket, FaShieldAlt, FaTachometerAlt, FaFlask, FaCode, FaSearch, FaBug,
  FaCubes, FaUsers, FaRobot, FaPaperPlane, FaTrash, FaCog, FaTimes,
  FaChevronDown, FaChevronRight, FaCopy, FaCheck, FaBolt, FaLightbulb,
  FaFileCode, FaTerminal, FaArrowRight, FaSpinner, FaSync, FaBrain,
  FaStar, FaDollarSign, FaBullseye, FaPlug,
} from '../../components/Icon'
import { DiffViewer } from './DiffViewer'
import { useFileEdits } from '../../hooks/useFileEdits'
import { ToolCallGroup, ToolCall } from './ToolCallDisplay'
interface ChatPanelProps {
  onClose: () => void

  onOpenSettings: () => void
}

const AGENTS = [
  { type: 'code', name: 'FaCode', icon: FaCode, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', desc: 'Write & refactor code' },
  { type: 'review', name: 'Review', icon: FaSearch, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', desc: 'Review code quality' },
  { type: 'debug', name: 'Debug', icon: FaBug, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Find & fix bugs' },
  { type: 'architect', name: 'Architect', icon: FaCubes, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', desc: 'Design architecture' },
  { type: 'test', name: 'Test', icon: FaFlask, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', desc: 'Write unit tests' },
  { type: 'devops', name: 'DevOps', icon: FaRocket, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', desc: 'CI/CD & deploy' },
  { type: 'security', name: 'Security', icon: FaShieldAlt, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', desc: 'Security audit' },
  { type: 'performance', name: 'Perf', icon: FaTachometerAlt, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', desc: 'Optimize performance' },
]

const QUICK_ACTIONS = [
  { label: 'Explain this code', icon: FaLightbulb, prompt: 'Explain what this code does and how it works', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { label: 'Write a function', icon: FaFileCode, prompt: 'Help me write a new function that', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { label: 'Fix a bug', icon: FaBug, prompt: 'I found a bug: ', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { label: 'Review code', icon: FaSearch, prompt: 'Review this code for issues and improvements:', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { label: 'Write tests', icon: FaFlask, prompt: 'Write unit tests for this code:', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  { label: 'Optimize', icon: FaBolt, prompt: 'Optimize this code for better performance:', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
]

const SUGGESTION_CHIPS = [
  'How does this work?',
  'Can you refactor this?',
  'Add error handling',
  'Write documentation',
  'Find security issues',
  'Optimize performance',
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
  const { activeProvider, openaiApiKey, anthropicApiKey, customGatewayUrl, customGatewayKey, customGatewayModel } = useSettingsStore()
  const { proposals, pendingProposals, applyEdit, rejectEdit, applyAll, rejectAll, hasPending } = useFileEdits(messages)

  // Configure AI streaming service on mount
  useEffect(() => {
    const gwKey = customGatewayKey || ''
    const gwUrl = customGatewayUrl || 'http://localhost:20128/v1'
    const gwModel = customGatewayModel || 'auto/best-coding'
    if (gwKey) {
      aiStreamingService.configure({ provider: 'custom', apiKey: gwKey, model: gwModel, baseUrl: gwUrl })
    } else if (activeProvider === 'openai' && openaiApiKey) {
      aiStreamingService.configure({ provider: 'openai', apiKey: openaiApiKey, model: 'gpt-4o' })
    } else if (activeProvider === 'anthropic' && anthropicApiKey) {
      aiStreamingService.configure({ provider: 'anthropic', apiKey: anthropicApiKey, model: 'claude-sonnet-4-20250514' })
    }
  }, [activeProvider, openaiApiKey, anthropicApiKey, customGatewayUrl, customGatewayKey, customGatewayModel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSend = useCallback((text?: string) => {
    const msg = text || input
    if (!msg.trim() || isStreaming) return
    if (chatMode === 'workflow') {
      runWorkflow(selectedWorkflow, msg)
    } else if (chatMode === 'collab') {
      collaborativeReview(selectedAgent, msg)
    } else if (chatMode === 'orchestrate') {
      orchestrate(msg)
    } else {
      sendMessage(msg, selectedAgent)
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
    return `Ask ${currentAgent.name} Agent anything...`
  }

  const modeButtons: { mode: ChatMode; label: string; icon: React.ReactNode; title: string }[] = [
    { mode: 'chat', label: 'Chat', icon: null, title: 'Single agent chat' },
    { mode: 'workflow', label: 'Workflow', icon: <FaCubes className="w-3 h-3" />, title: 'Multi-step pipeline' },
    { mode: 'collab', label: 'Collab', icon: <FaUsers className="w-3 h-3" />, title: 'Collaborative review' },
    { mode: 'orchestrate', label: 'Auto', icon: <FaStar className="w-3 h-3" />, title: 'Smart auto-orchestration' },
  ]

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FaRobot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">AI Chat</span>

          {/* Mode Tabs */}
          <div className="flex items-center gap-0.5 bg-ide-bg rounded-lg p-0.5 ml-1">
            {modeButtons.map((mb) => (
              <button
                key={mb.mode}
                onClick={() => setChatMode(mb.mode)}
                className={`px-2.5 py-1 text-[10px] rounded-md transition-all duration-200 flex items-center gap-1 font-medium ${
                  chatMode === mb.mode
                    ? 'bg-ide-surface text-ide-text shadow-sm'
                    : 'text-ide-text-muted hover:text-ide-text'
                }`}
                title={mb.title}
              >
                {mb.icon}
                {mb.label}
              </button>
            ))}
          </div>

          {/* Agent Selector */}
          {chatMode === 'chat' && (
            <div className="relative">
              <button
                onClick={() => setShowAgentPicker(!showAgentPicker)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all duration-200 ${currentAgent.color} ${currentAgent.border} ${currentAgent.bg} hover:scale-105`}
              >
                <AgentIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{currentAgent.name}</span>
                <FaChevronDown className={`w-3 h-3 transition-transform ${showAgentPicker ? 'rotate-180' : ''}`} />
              </button>

              {showAgentPicker && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-ide-surface border border-ide-border rounded-xl shadow-2xl z-20 overflow-hidden">
                  <div className="p-2 border-b border-ide-border">
                    <div className="text-[10px] font-semibold text-ide-text-muted uppercase tracking-wider px-2">Select Agent</div>
                  </div>
                  <div className="p-1.5 max-h-[300px] overflow-auto">
                    {AGENTS.map((agent) => {
                      const Icon = agent.icon
                      return (
                        <button
                          key={agent.type}
                          onClick={() => { setSelectedAgent(agent.type); setShowAgentPicker(false) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                            selectedAgent === agent.type
                              ? `${agent.color} ${agent.bg} ${agent.border} border`
                              : 'text-ide-text hover:bg-ide-border/50 border border-transparent'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${agent.bg}`}>
                            <Icon className={`w-4 h-4 ${agent.color}`} />
                          </div>
                          <div className="text-left flex-1">
                            <div className="text-xs font-semibold">{agent.name}</div>
                            <div className="text-[10px] text-ide-text-muted">{agent.desc}</div>
                          </div>
                          {selectedAgent === agent.type && <FaCheck className={`w-3.5 h-3.5 ${agent.color}`} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {chatMode === 'workflow' && (
            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="text-xs bg-ide-bg border border-ide-border rounded-lg px-2.5 py-1.5 text-ide-text cursor-pointer"
            >
              {workflows.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name} ({w.steps.length} steps)</option>
              ))}
            </select>
          )}

          {chatMode === 'orchestrate' && (
            <span className="text-[10px] text-purple-400 flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <FaStar className="w-3 h-3" /> Smart auto-selection
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {agentActivity.length > 0 && (
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`p-1.5 rounded-lg transition-all ${showActivity ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border'}`}
              title="Agent FaChartLine"
            >                  <FaBolt className="w-4 h-4" />
            </button>
          )}
          <button onClick={clearMessages} className="p-1.5 rounded-lg hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors" title="Clear">
            <FaTrash className="w-4 h-4" />
          </button>
          <button onClick={onOpenSettings} className="p-1.5 rounded-lg hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors" title="Settings">
            <FaCog className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agent FaChartLine Feed */}
      {showActivity && agentActivity.length > 0 && (
        <div className="border-b border-ide-border bg-ide-bg max-h-40 overflow-auto">
          <div className="px-3 py-2">
            <div className="text-[10px] font-semibold text-ide-text-muted uppercase mb-1">Agent FaChartLine</div>
            {agentActivity.slice(-10).reverse().map((msg) => {
              const agent = AGENTS.find(a => a.type === msg.from)
              return (
                <div key={msg.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                  <span className={`font-medium ${agent?.color || 'text-ide-text-muted'}`}>{msg.from}</span>
                  <FaChevronRight className="w-3 h-3 text-ide-text-muted" />
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
          /* ═══════ BEAUTIFUL WELCOME SCREEN ═══════ */
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            {/* Animated Logo */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-pulse">
                <FaRobot className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-ide-surface flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-ide-text mb-1">
              {chatMode === 'workflow' ? 'Workflow Pipeline'
                : chatMode === 'collab' ? 'Collaborative Review'
                : chatMode === 'orchestrate' ? 'Smart Orchestration'
                : `${currentAgent.name} Agent`
              }
            </h2>
            <p className="text-sm text-ide-text-muted max-w-[400px] mb-6">
              {chatMode === 'workflow'
                ? 'Chain multiple agents together for complex multi-step tasks.'
                : chatMode === 'collab'
                ? 'Write → Review → Fix in a collaborative pipeline.'
                : chatMode === 'orchestrate'
                ? 'Describe what you need and I\'ll automatically select the best agents.'
                : `I can help you write, review, debug, test, deploy, secure, and optimize your code.`
              }
            </p>

            {/* Quick Action Chips */}
            <div className="grid grid-cols-3 gap-2 mb-6 max-w-[420px]">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={() => { setInput(action.prompt); inputRef.current?.focus() }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-left ${action.color}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[11px] font-medium">{action.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Agent Grid */}
            {chatMode === 'chat' && (
              <div className="mb-6">
                <div className="text-[10px] font-semibold text-ide-text-muted uppercase tracking-wider mb-3">Choose an Agent</div>
                <div className="flex gap-2 flex-wrap justify-center max-w-[420px]">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon
                    return (
                      <button
                        key={agent.type}
                        onClick={() => { setSelectedAgent(agent.type); inputRef.current?.focus() }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-200 hover:scale-105 ${
                          selectedAgent === agent.type
                            ? `${agent.color} ${agent.border} ${agent.bg} shadow-sm`
                            : 'text-ide-text-muted border-ide-border hover:border-current/20 hover:bg-ide-bg'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">{agent.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[420px]">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => { setInput(chip); inputRef.current?.focus() }}
                  className="px-3 py-1.5 text-[11px] text-ide-text-muted bg-ide-bg border border-ide-border rounded-full hover:border-ide-accent/50 hover:text-ide-accent hover:bg-ide-accent/5 transition-all duration-200"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Provider Status */}
            <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-ide-bg rounded-xl border border-ide-border">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[11px] text-ide-text-muted">
                Connected to <span className="text-ide-accent font-medium">AI Gateway</span> · 1883 models available
              </span>
            </div>
          </div>
        ) : (
          /* ═══════ MESSAGE LIST ═══════ */
          messages.map((msg) => (
            <div key={msg.id} className={`group animate-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                {/* Assistant Header */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <FaRobot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-ide-text-muted">
                      {AGENTS.find(a => a.type === msg.agentType)?.name || 'AI'}
                    </span>
                    {msg.isStreaming && (
                      <div className="flex items-center gap-1">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 bg-ide-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-ide-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-ide-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[10px] text-ide-accent font-medium">thinking...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* System Message */}
                {msg.role === 'system' && (
                  <div className="mb-2 px-3 py-2 rounded-xl bg-ide-accent/5 border border-ide-accent/20 text-xs text-ide-text-muted">
                    {msg.content}
                  </div>
                )}                    {/* Tool Calls */}
                {msg.role === 'assistant' && (msg as any).toolCalls && (msg as any).toolCalls.length > 0 && (
                  <ToolCallGroup tools={(msg as any).toolCalls as ToolCall[]} />
                )}

                {/* Message Bubble */}
                {msg.role !== 'system' && (
                  <div className={`inline-block text-left rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-ide-bg border border-ide-border text-ide-text'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} onApplyCode={handleApplyCode} />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {msg.role === 'assistant' && !msg.isStreaming && (
                  <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-ide-bg border border-ide-border hover:border-ide-accent/50 text-ide-text-muted hover:text-ide-text transition-all"
                      title="Copy"
                    >
                      {copiedId === msg.id ? <FaCheck className="w-3 h-3 text-green-400" /> : <FaCopy className="w-3 h-3" />}
                      {copiedId === msg.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => { setInput(`Follow up on: ${msg.content.slice(0, 50)}...`); inputRef.current?.focus() }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-ide-bg border border-ide-border hover:border-ide-accent/50 text-ide-text-muted hover:text-ide-text transition-all"
                    >
                      <FaArrowRight className="w-3 h-3" /> Reply
                    </button>
                  </div>
                )}

                {/* Suggestion Chips after last assistant message */}
                {msg.role === 'assistant' && !msg.isStreaming && messages.indexOf(msg) === messages.length - 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {SUGGESTION_CHIPS.slice(0, 3).map((chip) => (
                      <button
                        key={chip}
                        onClick={() => { setInput(chip); inputRef.current?.focus() }}
                        className="px-2.5 py-1 text-[10px] text-ide-text-muted bg-ide-bg border border-ide-border rounded-full hover:border-ide-accent/50 hover:text-ide-accent transition-all"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />

        {/* ═══════ FILE EDIT DIFF VIEWER ═══════ */}
        {hasPending && (
          <div className="mx-3 mb-3 p-3 bg-ide-surface border border-ide-border rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaFileCode className="w-4 h-4 text-ide-accent" />
                <span className="text-xs font-medium text-ide-text">
                  {pendingProposals.length} file edit{pendingProposals.length !== 1 ? "s" : ""} pending
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={rejectAll}
                  className="px-3 py-1 text-[10px] rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Reject All
                </button>
                <button
                  onClick={applyAll}
                  className="px-3 py-1 text-[10px] rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                >
                  Apply All
                </button>
              </div>
            </div>
            <DiffViewer
              diffs={pendingProposals.map(p => p.diff)}
              onApply={(filePath) => {
                const proposal = pendingProposals.find(p => p.filePath === filePath)
                if (proposal) applyEdit(proposal.id)
              }}
              onReject={(filePath) => {
                const proposal = pendingProposals.find(p => p.filePath === filePath)
                if (proposal) rejectEdit(proposal.id)
              }}
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-ide-border flex-shrink-0 bg-ide-surface">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="w-full resize-none bg-ide-bg border border-ide-border rounded-xl px-4 py-3 text-sm text-ide-text placeholder:text-ide-text-muted focus:outline-none focus:ring-2 focus:ring-ide-accent/30 focus:border-ide-accent/50 min-h-[44px] max-h-[120px] transition-all duration-200"
              rows={1}
              disabled={isStreaming}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            {isStreaming && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <FaSpinner className="w-4 h-4 text-ide-accent animate-spin" />
              </div>
            )}
          </div>
          {isStreaming ? (
            <button onClick={cancelStream} className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/20" title="Stop">
              <div className="w-3 h-3 bg-white rounded-sm" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-105 disabled:hover:scale-100"
            >
              {chatMode === 'workflow' ? <FaCubes className="w-4 h-4" />
                : chatMode === 'collab' ? <FaUsers className="w-4 h-4" />
                : chatMode === 'orchestrate' ? <FaStar className="w-4 h-4" />
                : <FaPaperPlane className="w-4 h-4" />
              }
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-ide-text-muted">{messages.length} messages</span>
          <span className="text-[10px] text-ide-text-muted">
            {isStreaming ? 'AI is responding...' :
             chatMode === 'workflow' ? `${currentWorkflow?.steps.length || 0}-step pipeline` :
             chatMode === 'orchestrate' ? 'Smart auto-selection' :
             '⏎ Send · ⇧⏎ New line'}
          </span>
        </div>
      </div>
    </div>
  )
}
