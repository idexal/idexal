import React, { useState, useRef } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { exportImportService } from '../../services/exportImportService'
import {
  X, Key, Monitor, Palette, Code, Brain, Download, Upload, Trash2,
  Keyboard, Info, Check
} from 'lucide-react'

interface SettingsPanelProps {
  onClose: () => void
}

type SettingsTab = 'ai' | 'editor' | 'appearance' | 'data' | 'about'

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')
  const settings = useSettingsStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const tabs = [
    { id: 'ai' as SettingsTab, icon: Brain, label: 'AI Providers' },
    { id: 'editor' as SettingsTab, icon: Code, label: 'Editor' },
    { id: 'appearance' as SettingsTab, icon: Palette, label: 'Appearance' },
    { id: 'data' as SettingsTab, icon: Download, label: 'Data' },
    { id: 'about' as SettingsTab, icon: Info, label: 'About' },
  ]

  const handleExport = () => {
    exportImportService.downloadExport()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const success = await exportImportService.importFromFile(file)
    setImportStatus(success ? 'success' : 'error')
    setTimeout(() => setImportStatus('idle'), 3000)

    if (success) {
      settings.loadSettings()
    }
  }

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      exportImportService.clearAll()
      settings.loadSettings()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl max-h-[80vh] bg-ide-surface border border-ide-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border">
          <h2 className="font-semibold text-ide-text">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ide-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-ide-accent border-b-2 border-ide-accent'
                  : 'text-ide-text-muted hover:text-ide-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[60vh]">
          {activeTab === 'ai' && <AISettings />}
          {activeTab === 'editor' && <EditorSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'data' && (
            <DataSettings
              onExport={handleExport}
              onImport={handleImport}
              onClear={handleClearData}
              importStatus={importStatus}
              fileInputRef={fileInputRef}
            />
          )}
          {activeTab === 'about' && <AboutSettings />}
        </div>
      </div>
    </div>
  )
}

function AISettings() {
  const settings = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-ide-text mb-2">Active Provider</label>
        <select
          value={settings.activeProvider}
          onChange={(e) => settings.setActiveProvider(e.target.value as any)}
          className="ide-input"
        >
          <option value="openai">OpenAI (GPT-4)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="local">Local Model (Ollama)</option>
        </select>
      </div>

      {settings.activeProvider === 'openai' && (
        <div className="space-y-4 p-4 bg-ide-bg rounded-lg border border-ide-border">
          <h3 className="text-sm font-medium text-ide-accent flex items-center gap-2">
            <Key className="w-4 h-4" /> OpenAI Configuration
          </h3>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">API Key</label>
            <input type="password" value={settings.openaiApiKey} onChange={(e) => settings.setOpenAIKey(e.target.value)} placeholder="sk-..." className="ide-input" />
          </div>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">Model</label>
            <select value={settings.openaiModel} onChange={(e) => settings.setOpenAIModel(e.target.value)} className="ide-input">
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
        </div>
      )}

      {settings.activeProvider === 'anthropic' && (
        <div className="space-y-4 p-4 bg-ide-bg rounded-lg border border-ide-border">
          <h3 className="text-sm font-medium text-ide-accent flex items-center gap-2">
            <Key className="w-4 h-4" /> Anthropic Configuration
          </h3>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">API Key</label>
            <input type="password" value={settings.anthropicApiKey} onChange={(e) => settings.setAnthropicKey(e.target.value)} placeholder="sk-ant-..." className="ide-input" />
          </div>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">Model</label>
            <select value={settings.anthropicModel} onChange={(e) => settings.setAnthropicModel(e.target.value)} className="ide-input">
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
            </select>
          </div>
        </div>
      )}

      {settings.activeProvider === 'local' && (
        <div className="space-y-4 p-4 bg-ide-bg rounded-lg border border-ide-border">
          <h3 className="text-sm font-medium text-ide-accent flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Local Model Configuration
          </h3>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">API URL</label>
            <input type="text" value={settings.localModelUrl} onChange={(e) => settings.setLocalModelUrl(e.target.value)} className="ide-input" />
          </div>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">Model Name</label>
            <input type="text" value={settings.localModelName} onChange={(e) => settings.setLocalModelName(e.target.value)} className="ide-input" />
          </div>
        </div>
      )}

      <button onClick={settings.saveSettings} className="ide-button-primary">Save Settings</button>
    </div>
  )
}

function EditorSettings() {
  const settings = useSettingsStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-ide-text-muted mb-1">Font Size</label>
          <input type="number" value={settings.fontSize} onChange={(e) => settings.setFontSize(Number(e.target.value))} min={10} max={24} className="ide-input" />
        </div>
        <div>
          <label className="block text-xs text-ide-text-muted mb-1">Tab Size</label>
          <select value={settings.tabSize} onChange={(e) => settings.setTabSize(Number(e.target.value))} className="ide-input">
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={8}>8 spaces</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <ToggleSetting label="Enable Minimap" checked={settings.minimap} onChange={settings.setMinimap} />
        <ToggleSetting label="Line Numbers" checked={settings.lineNumbers} onChange={settings.setLineNumbers} />
        <ToggleSetting label="Auto Save" checked={settings.autoSave} onChange={settings.setAutoSave} />
      </div>

      <div>
        <label className="block text-xs text-ide-text-muted mb-1">Word Wrap</label>
        <select value={settings.wordWrap} onChange={(e) => settings.setWordWrap(e.target.value as any)} className="ide-input">
          <option value="off">Off</option>
          <option value="on">On</option>
          <option value="wordWrapColumn">At Column</option>
        </select>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const settings = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-ide-text-muted mb-2">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => settings.setTheme(theme)}
              className={`p-4 rounded-lg border transition-colors capitalize ${
                settings.theme === theme
                  ? 'border-ide-accent bg-ide-accent/10 text-ide-accent'
                  : 'border-ide-border bg-ide-bg text-ide-text hover:border-ide-accent/50'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-ide-text-muted mb-2">Font Family</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => useSettingsStore.setState({ fontFamily: e.target.value })}
          className="ide-input"
        >
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="'Fira Code', monospace">Fira Code</option>
          <option value="'Cascadia Code', monospace">Cascadia Code</option>
          <option value="monospace">System Monospace</option>
        </select>
      </div>
    </div>
  )
}

function DataSettings({
  onExport, onImport, onClear, importStatus, fileInputRef
}: {
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  importStatus: 'idle' | 'success' | 'error'
  fileInputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-ide-text mb-3">Export Settings</h3>
        <p className="text-xs text-ide-text-muted mb-3">Download your settings as a JSON file</p>
        <button onClick={onExport} className="flex items-center gap-2 ide-button">
          <Download className="w-4 h-4" />
          Export Settings ({exportImportService.getExportSize()})
        </button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-ide-text mb-3">Import Settings</h3>
        <p className="text-xs text-ide-text-muted mb-3">Import settings from a JSON file</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 ide-button"
        >
          <Upload className="w-4 h-4" />
          Import Settings
        </button>
        {importStatus === 'success' && (
          <p className="text-xs text-ide-success mt-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> Settings imported successfully
          </p>
        )}
        {importStatus === 'error' && (
          <p className="text-xs text-ide-error mt-2">Failed to import settings</p>
        )}
      </div>

      <div className="pt-4 border-t border-ide-border">
        <h3 className="text-sm font-medium text-ide-error mb-3">Danger Zone</h3>
        <button onClick={onClear} className="flex items-center gap-2 px-4 py-2 text-sm text-ide-error border border-ide-error/30 rounded-lg hover:bg-ide-error/10">
          <Trash2 className="w-4 h-4" />
          Clear All Data
        </button>
      </div>
    </div>
  )
}

function AboutSettings() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-xl font-bold text-ide-text mb-1">Idexal IDE</h3>
        <p className="text-sm text-ide-accent">v1.0.0</p>
      </div>
      <p className="text-sm text-ide-text-muted">
        Professional Multi-Agent AI-Powered Development Environment
      </p>
      <div className="p-4 bg-ide-bg rounded-lg border border-ide-border text-left text-sm text-ide-text-muted">
        <div className="font-medium text-ide-text mb-2">Technology Stack</div>
        <ul className="space-y-1">
          <li>• React 18 + TypeScript</li>
          <li>• Rust Engine (NAPI-RS)</li>
          <li>• Electron Desktop</li>
          <li>• Monaco Editor</li>
          <li>• Tailwind CSS</li>
          <li>• Zustand State Management</li>
        </ul>
      </div>
      <p className="text-xs text-ide-text-muted">
        Built with ❤️ using Rust + Electron + React
      </p>
    </div>
  )
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-ide-bg rounded-lg border border-ide-border">
      <span className="text-sm text-ide-text">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-ide-accent' : 'bg-ide-border'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
