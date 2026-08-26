import React, { useState } from 'react'
import {
  FaShieldAlt, FaChartLine, FaUndo, FaPlus, FaTrash, FaArrowDown, FaCheck, FaTimes, FaExclamationTriangle, FaBolt
} from '../Icon'
import { aiProviderService, AIProviderConfig, ModelPurpose, PROVIDER_INFO } from '../../services/aiProviders'
import { fallbackService, ProviderHealth, FallbackEntry, FallbackEvent } from '../../services/fallbackService'

const PURPOSE_LABELS: Record<ModelPurpose, { label: string; icon: string }> = {
  chat: { label: 'Chat & General', icon: '💬' },
  code: { label: 'FaCode Generation', icon: '💻' },
  completion: { label: 'FaCode Completion', icon: '⚡' },
  embedding: { label: 'Embeddings', icon: '🔢' },
  vision: { label: 'Vision & Multimodal', icon: '👁️' },
  audio: { label: 'Audio & Speech', icon: '🎤' },
  reasoning: { label: 'Reasoning & Analysis', icon: '🧩' },
  translation: { label: 'Translation', icon: '🌍' },
  summarization: { label: 'Summarization', icon: '📝' },
}

interface FallbackTabProps {
  chains: Record<string, FallbackEntry[]>
  health: ProviderHealth[]
  events: FallbackEvent[]
  selectedPurpose: ModelPurpose
  onSelectPurpose: (p: ModelPurpose) => void
  onResetHealth: (id?: string) => void
}

export default function FallbackTab({ chains, health, events, selectedPurpose, onSelectPurpose, onResetHealth }: FallbackTabProps) {
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const chain = chains[selectedPurpose] || []
  const enabledProviders = aiProviderService.getEnabledProviders()
  const emergency = fallbackService.getEmergencyFallback()

  const handleAddEntry = (providerId: string, modelId: string) => {
    fallbackService.addToChain(selectedPurpose, { providerId, modelId })
    const updated = fallbackService.getChain(selectedPurpose)
    // Trigger parent re-render by calling onResetHealth
    onResetHealth()
    setShowAddEntry(false)
  }

  const handleRemoveEntry = (providerId: string, modelId: string) => {
    fallbackService.removeFromChain(selectedPurpose, providerId, modelId)
    onResetHealth()
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newChain = [...chain]
    ;[newChain[index - 1], newChain[index]] = [newChain[index], newChain[index - 1]]
    fallbackService.setChain(selectedPurpose, newChain)
    onResetHealth()
  }

  const handleMoveDown = (index: number) => {
    if (index >= chain.length - 1) return
    const newChain = [...chain]
    ;[newChain[index], newChain[index + 1]] = [newChain[index + 1], newChain[index]]
    fallbackService.setChain(selectedPurpose, newChain)
    onResetHealth()
  }

  const getHealthColor = (providerId: string) => {
    const h = health.find(x => x.providerId === providerId)
    if (!h) return 'text-ide-text-secondary'
    if (h.consecutiveFailures >= 3) return 'text-red-400'
    if (h.consecutiveFailures > 0) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getHealthLabel = (providerId: string) => {
    const h = health.find(x => x.providerId === providerId)
    if (!h) return 'Unknown'
    if (h.cooldownUntil && Date.now() < h.cooldownUntil) return 'Cooling down'
    if (h.consecutiveFailures >= 3) return 'Unhealthy'
    if (h.consecutiveFailures > 0) return 'Degraded'
    return 'Healthy'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Emergency Fallback */}
      <div className="px-3 py-2 border-b border-ide-border/30 bg-yellow-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle size={12} className="text-yellow-400" />
            <div>
              <div className="text-[10px] font-medium">Emergency Fallback</div>
              <div className="text-[9px] text-ide-text-secondary">
                {emergency ? `${emergency.providerId}/${emergency.modelId}` : 'Not configured'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowEmergency(true)}
            className="px-2 py-0.5 bg-yellow-600 hover:bg-yellow-500 rounded text-[10px]"
          >
            {emergency ? 'Change' : 'Setup'}
          </button>
        </div>
      </div>

      {/* Purpose Selector */}
      <div className="px-3 py-2 border-b border-ide-border/30">
        <div className="text-[10px] text-ide-text-secondary mb-1.5">Fallback chain for:</div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PURPOSE_LABELS) as ModelPurpose[]).map(p => (
            <button
              key={p}
              onClick={() => onSelectPurpose(p)}
              className={`px-2 py-0.5 rounded text-[10px] ${
                selectedPurpose === p
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-ide-bg-secondary/30 text-ide-text-secondary hover:text-ide-text border border-transparent'
              }`}
            >
              {PURPOSE_LABELS[p].icon} {PURPOSE_LABELS[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Fallback Chain */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium flex items-center gap-1">
              <FaShieldAlt size={12} className="text-green-400" />
              Provider Chain
            </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-2 py-0.5 bg-ide-bg-secondary hover:bg-ide-border rounded text-[10px]"
            >
              ⚙️ Config
            </button>
            <button
              onClick={() => setShowAddEntry(true)}
              className="px-2 py-0.5 bg-green-600 hover:bg-green-500 rounded text-[10px] flex items-center gap-1"
            >
              <FaPlus size={10} /> Add
            </button>
          </div>
          </div>

          {chain.length === 0 ? (
            <div className="text-center py-6 text-ide-text-secondary text-[11px]">
              <FaShieldAlt size={24} className="mx-auto mb-2 opacity-30" />
              <p>No fallback chain configured.</p>
              <p className="mt-1">Add providers to enable automatic failover.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chain.map((entry, i) => {
                const provider = aiProviderService.getProvider(entry.providerId)
                const model = provider?.models.find(m => m.id === entry.modelId)
                const info = provider ? PROVIDER_INFO[provider.family] : null
                return (
                  <div
                    key={`${entry.providerId}-${entry.modelId}`}
                    className="flex items-center gap-2 px-2 py-1.5 bg-ide-bg-secondary/20 rounded border border-ide-border/20"
                  >
                    <span className="text-[10px] text-ide-text-secondary font-mono w-4">{i + 1}.</span>
                    <span className="text-sm">{info?.icon || '⚙️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] truncate">{provider?.name || entry.providerId}</div>
                      <div className="text-[9px] text-ide-text-secondary truncate">{model?.name || entry.modelId}</div>
                    </div>
                    <span className={`text-[9px] ${getHealthColor(entry.providerId)}`}>
                      {getHealthLabel(entry.providerId)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleMoveUp(i)} disabled={i === 0} className="p-0.5 hover:bg-ide-bg-secondary rounded disabled:opacity-30">
                        <FaArrowDown size={10} className="rotate-180" />
                      </button>
                      <button onClick={() => handleMoveDown(i)} disabled={i === chain.length - 1} className="p-0.5 hover:bg-ide-bg-secondary rounded disabled:opacity-30">
                        <FaArrowDown size={10} />
                      </button>
                      <button onClick={() => handleRemoveEntry(entry.providerId, entry.modelId)} className="p-0.5 hover:bg-red-500/20 rounded text-red-400">
                        <FaTrash size={10} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Provider Health */}
        <div className="px-3 py-2 border-t border-ide-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium flex items-center gap-1">
              <FaChartLine size={12} className="text-blue-400" />
              Provider Health
            </span>
            <button onClick={() => onResetHealth()} className="px-2 py-0.5 bg-ide-bg-secondary hover:bg-ide-bg-secondary/80 rounded text-[10px] flex items-center gap-1">
              <FaUndo size={10} /> Reset All
            </button>
          </div>
          {health.length === 0 ? (
            <p className="text-[10px] text-ide-text-secondary text-center py-3">No health data yet. Health tracking starts after first API call.</p>
          ) : (
            <div className="space-y-1">
              {health.map(h => {
                const provider = aiProviderService.getProvider(h.providerId)
                const info = provider ? PROVIDER_INFO[provider.family] : null
                const isCooling = h.cooldownUntil && Date.now() < h.cooldownUntil
                return (
                  <div key={h.providerId} className="flex items-center gap-2 px-2 py-1 bg-ide-bg-secondary/10 rounded text-[10px]">
                    <span>{info?.icon || '⚙️'}</span>
                    <span className="flex-1 truncate">{provider?.name || h.providerId}</span>
                    <span className="text-green-400">✓{h.successCount}</span>
                    <span className="text-red-400">✗{h.failureCount}</span>
                    {isCooling && <span className="text-yellow-400">⏳</span>}
                    <button onClick={() => onResetHealth(h.providerId)} className="p-0.5 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
                      <FaUndo size={8} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Events */}
        {events.length > 0 && (
          <div className="px-3 py-2 border-t border-ide-border/30">
            <span className="text-xs font-medium flex items-center gap-1 mb-2">
              <FaBolt size={12} className="text-yellow-400" />
              Recent Fallback Events
            </span>
            <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
              {events.slice().reverse().map((e, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-0.5 text-[9px]">
                  <span className={
                    e.type === 'success' ? 'text-green-400' :
                    e.type === 'fallback' ? 'text-yellow-400' :
                    e.type === 'exhausted' ? 'text-red-400' :
                    'text-ide-text-secondary'
                  }>
                    {e.type === 'success' ? '✓' : e.type === 'fallback' ? '→' : e.type === 'exhausted' ? '✗' : '○'}
                  </span>
                  <span className="text-ide-text-secondary">{e.purpose}</span>
                  <span className="truncate">{e.providerId}/{e.modelId}</span>
                  {e.error && <span className="text-red-400 truncate flex-1">{e.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddEntry && (
        <AddEntryModal
          purpose={selectedPurpose}
          existing={chain}
          onAdd={handleAddEntry}
          onClose={() => setShowAddEntry(false)}
        />
      )}

      {/* Emergency Fallback Modal */}
      {showEmergency && (
        <EmergencyFallbackModal
          current={emergency}
          onSet={(providerId, modelId) => {
            fallbackService.setEmergencyFallback(providerId, modelId)
            onResetHealth()
            setShowEmergency(false)
          }}
          onClear={() => {
            fallbackService.clearEmergencyFallback()
            onResetHealth()
            setShowEmergency(false)
          }}
          onClose={() => setShowEmergency(false)}
        />
      )}
    </div>
  )
}

function AddEntryModal({
  purpose, existing, onAdd, onClose
}: {
  purpose: ModelPurpose
  existing: FallbackEntry[]
  onAdd: (providerId: string, modelId: string) => void
  onClose: () => void
}) {
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const enabledProviders = aiProviderService.getEnabledProviders().filter(p => p.apiKey && p.models.length > 0)
  const provider = enabledProviders.find(p => p.id === selectedProvider)

  const availableModels = provider?.models.filter(m =>
    !existing.some(e => e.providerId === provider.id && e.modelId === m.id)
  ) || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-ide-bg border border-ide-border rounded-lg p-4 w-[350px] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold">Add to Fallback Chain</span>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
        <div className="space-y-2">
          <select
            value={selectedProvider}
            onChange={e => { setSelectedProvider(e.target.value); setSelectedModel('') }}
            className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
          >
            <option value="">Select provider...</option>
            {enabledProviders.map(p => (
              <option key={p.id} value={p.id}>{PROVIDER_INFO[p.family]?.icon} {p.name}</option>
            ))}
          </select>
          {provider && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
            >
              <option value="">Select model...</option>
              {availableModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => selectedProvider && selectedModel && onAdd(selectedProvider, selectedModel)}
            disabled={!selectedProvider || !selectedModel}
            className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs font-medium"
          >
            Add to Chain
          </button>
          <button onClick={onClose} className="px-3 py-1.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function EmergencyFallbackModal({
  current, onSet, onClear, onClose
}: {
  current: { providerId: string; modelId: string } | null
  onSet: (providerId: string, modelId: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const [selectedProvider, setSelectedProvider] = useState(current?.providerId || '')
  const [selectedModel, setSelectedModel] = useState(current?.modelId || '')
  const enabledProviders = aiProviderService.getEnabledProviders().filter(p => p.apiKey && p.models.length > 0)
  const provider = enabledProviders.find(p => p.id === selectedProvider)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-ide-bg border border-ide-border rounded-lg p-4 w-[400px] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold">Emergency Fallback</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mb-3">
          <p className="text-[10px] text-yellow-400">
            Emergency fallback is used when ALL providers in the chain fail. This ensures your work is never interrupted.
          </p>
        </div>
        <div className="space-y-2">
          <select
            value={selectedProvider}
            onChange={e => { setSelectedProvider(e.target.value); setSelectedModel('') }}
            className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
          >
            <option value="">Select emergency provider...</option>
            {enabledProviders.map(p => (
              <option key={p.id} value={p.id}>{PROVIDER_INFO[p.family]?.icon} {p.name}</option>
            ))}
          </select>
          {provider && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
            >
              <option value="">Select model...</option>
              {provider.models.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.contextLength.toLocaleString()} ctx)</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {current && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs"
            >
              Remove
            </button>
          )}
          <button
            onClick={() => selectedProvider && selectedModel && onSet(selectedProvider, selectedModel)}
            disabled={!selectedProvider || !selectedModel}
            className="flex-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded text-xs font-medium"
          >
            Set Emergency Fallback
          </button>
          <button onClick={onClose} className="px-3 py-1.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
