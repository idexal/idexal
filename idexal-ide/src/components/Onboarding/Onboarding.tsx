import React, { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import {
  FaRocket, FaKey, FaCode, FaTerminal, FaCodeBranch, FaChevronRight, FaChevronLeft, FaCheck, FaStar
} from '../Icon'

interface OnboardingProps {
  onComplete: () => void
}

type Step = 'welcome' | 'provider' | 'apikey' | 'features' | 'shortcuts' | 'done'

const STEPS: Step[] = ['welcome', 'provider', 'apikey', 'features', 'shortcuts', 'done']

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const settings = useSettingsStore()

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      settings.saveSettings()
      onComplete()
    }
  }

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-full max-w-xl bg-ide-surface rounded-xl border border-ide-border shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-ide-bg">
          <div
            className="h-full bg-ide-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 'welcome' && <WelcomeStep />}
          {step === 'provider' && <ProviderStep />}
          {step === 'apikey' && <ApiKeyStep settings={settings} />}
          {step === 'features' && <FeaturesStep />}
          {step === 'shortcuts' && <ShortcutsStep />}
          {step === 'done' && <DoneStep />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 pb-6">
          <button
            onClick={prev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-ide-text-muted hover:text-ide-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-ide-accent' :
                  i < currentStep ? 'bg-ide-success' : 'bg-ide-border'
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-ide-accent text-white rounded-lg hover:bg-ide-accent-hover transition-colors"
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                <FaStar className="w-4 h-4" />
                Get Started
              </>
            ) : (
              <>
                Continue
                <FaChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ide-accent/10 flex items-center justify-center">
        <FaRocket className="w-8 h-8 text-ide-accent" />
      </div>
      <h2 className="text-2xl font-bold text-ide-text mb-2">Welcome to Idexal IDE</h2>
      <p className="text-ide-text-muted max-w-md mx-auto">
        A professional AI-powered development environment with multi-agent collaboration.
        Let's get you set up in just a few steps.
      </p>
    </div>
  )
}

function ProviderStep() {
  const settings = useSettingsStore()

  const providers = [
    { id: 'openai' as const, name: 'OpenAI', desc: 'GPT-4, GPT-4o', icon: '🤖' },
    { id: 'anthropic' as const, name: 'Anthropic', desc: 'Claude 3 Opus', icon: '🧠' },
    { id: 'local' as const, name: 'Local Model', desc: 'Ollama', icon: '💻' },
  ]

  return (
    <div>
      <div className="text-center mb-6">
        <FaCode className="w-10 h-10 text-ide-accent mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ide-text mb-1">Choose AI Provider</h2>
        <p className="text-sm text-ide-text-muted">Select your preferred AI backend</p>
      </div>

      <div className="space-y-3">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => settings.setActiveProvider(p.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
              settings.activeProvider === p.id
                ? 'border-ide-accent bg-ide-accent/10'
                : 'border-ide-border hover:border-ide-accent/50'
            }`}
          >
            <span className="text-2xl">{p.icon}</span>
            <div className="text-left">
              <div className="font-medium text-ide-text">{p.name}</div>
              <div className="text-xs text-ide-text-muted">{p.desc}</div>
            </div>
            {settings.activeProvider === p.id && (
              <FaCheck className="w-5 h-5 text-ide-accent ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ApiKeyStep({ settings }: { settings: any }) {
  return (
    <div>
      <div className="text-center mb-6">
        <FaKey className="w-10 h-10 text-ide-accent mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ide-text mb-1">API Configuration</h2>
        <p className="text-sm text-ide-text-muted">Enter your API key for {settings.activeProvider}</p>
      </div>

      {settings.activeProvider === 'openai' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">API Key</label>
            <input
              type="password"
              value={settings.openaiApiKey}
              onChange={(e) => settings.setOpenAIKey(e.target.value)}
              placeholder="sk-..."
              className="ide-input"
            />
          </div>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">Model</label>
            <select
              value={settings.openaiModel}
              onChange={(e) => settings.setOpenAIModel(e.target.value)}
              className="ide-input"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o">GPT-4o</option>
            </select>
          </div>
        </div>
      )}

      {settings.activeProvider === 'anthropic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">API Key</label>
            <input
              type="password"
              value={settings.anthropicApiKey}
              onChange={(e) => settings.setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="ide-input"
            />
          </div>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">Model</label>
            <select
              value={settings.anthropicModel}
              onChange={(e) => settings.setAnthropicModel(e.target.value)}
              className="ide-input"
            >
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
            </select>
          </div>
        </div>
      )}

      {settings.activeProvider === 'local' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">API URL</label>
            <input
              type="text"
              value={settings.localModelUrl}
              onChange={(e) => settings.setLocalModelUrl(e.target.value)}
              className="ide-input"
            />
          </div>
          <div>
            <label className="block text-xs text-ide-text-muted mb-1">Model Name</label>
            <input
              type="text"
              value={settings.localModelName}
              onChange={(e) => settings.setLocalModelName(e.target.value)}
              className="ide-input"
            />
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ide-text-muted">
        💡 You can skip this and configure later in Settings
      </p>
    </div>
  )
}

function FeaturesStep() {
  const features = [
    { icon: '🤖', title: 'Multi-Agent System', desc: '5 specialized AI agents for different tasks' },
    { icon: '🧠', title: 'Project Context', desc: 'AI understands your codebase structure' },
    { icon: '📝', title: 'FaCode Generation', desc: 'Apply code changes directly from chat' },
    { icon: '🔍', title: 'FaCode Review', desc: 'Get instant feedback on your code' },
    { icon: '🐛', title: 'Bug Detection', desc: 'Find and fix issues automatically' },
    { icon: '🧪', title: 'Test Generation', desc: 'Create comprehensive test suites' },
  ]

  return (
    <div>
      <div className="text-center mb-6">
        <FaStar className="w-10 h-10 text-ide-accent mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ide-text mb-1">Key Features</h2>
        <p className="text-sm text-ide-text-muted">Everything you need for modern development</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <div key={i} className="p-3 bg-ide-bg rounded-lg border border-ide-border">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-medium text-ide-text">{f.title}</div>
            <div className="text-xs text-ide-text-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShortcutsStep() {
  const shortcuts = [
    { keys: '⌘K', desc: 'Command Palette' },
    { keys: '⌘B', desc: 'Toggle Sidebar' },
    { keys: '⌘`', desc: 'Toggle Terminal' },
    { keys: '⌘⇧A', desc: 'Toggle AI Chat' },
    { keys: '⌘,', desc: 'Settings' },
    { keys: '/help', desc: 'Chat Commands' },
  ]

  return (
    <div>
      <div className="text-center mb-6">
        <FaCode className="w-10 h-10 text-ide-accent mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ide-text mb-1">Keyboard Shortcuts</h2>
        <p className="text-sm text-ide-text-muted">Navigate faster with these shortcuts</p>
      </div>

      <div className="space-y-2">
        {shortcuts.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-ide-bg rounded-lg border border-ide-border">
            <span className="text-sm text-ide-text">{s.desc}</span>
            <kbd className="px-3 py-1 bg-ide-surface rounded border border-ide-border font-mono text-xs text-ide-accent">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

function DoneStep() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ide-success/10 flex items-center justify-center">
        <FaCheck className="w-8 h-8 text-ide-success" />
      </div>
      <h2 className="text-2xl font-bold text-ide-text mb-2">You're All Set!</h2>
      <p className="text-ide-text-muted max-w-md mx-auto">
        Idexal IDE is ready to use. Open a project folder and start coding with AI assistance.
      </p>
      <div className="mt-6 p-4 bg-ide-bg rounded-lg border border-ide-border text-left">
        <div className="text-sm font-medium text-ide-text mb-2">Quick Start:</div>
        <ol className="text-xs text-ide-text-muted space-y-1 list-decimal list-inside">
          <li>Open the AI Chat panel (⌘⇧A)</li>
          <li>Select an agent from the dropdown</li>
          <li>Ask me to write, review, or debug code</li>
          <li>Click "Apply" to add changes to your project</li>
        </ol>
      </div>
    </div>
  )
}
