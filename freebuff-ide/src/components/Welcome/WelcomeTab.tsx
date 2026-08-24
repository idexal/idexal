import React from 'react'
import {
  Rocket, Code, GitBranch, Terminal, MessageSquare, Settings,
  FileText, FolderOpen, Zap, BookOpen, ExternalLink
} from 'lucide-react'

interface WelcomeTabProps {
  onOpenFile?: () => void
  onOpenFolder?: () => void
  onOpenChat?: () => void
  onOpenSettings?: () => void
  onOpenTerminal?: () => void
}

export default function WelcomeTab({
  onOpenFile,
  onOpenFolder,
  onOpenChat,
  onOpenSettings,
  onOpenTerminal,
}: WelcomeTabProps) {
  return (
    <div className="h-full overflow-auto bg-ide-editor">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-ide-accent to-purple-500 flex items-center justify-center">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-ide-text mb-2">
            Welcome to <span className="text-gradient">Idexal IDE</span>
          </h1>
          <p className="text-ide-text-muted">
            Professional Multi-Agent AI-Powered Development Environment
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <QuickAction
            icon={<FileText className="w-5 h-5" />}
            title="New File"
            description="Create a new file"
            shortcut="⌘N"
            onClick={onOpenFile}
          />
          <QuickAction
            icon={<FolderOpen className="w-5 h-5" />}
            title="Open Folder"
            description="Open a project folder"
            shortcut="⌘O"
            onClick={onOpenFolder}
          />
          <QuickAction
            icon={<MessageSquare className="w-5 h-5" />}
            title="AI Assistant"
            description="Chat with AI agents"
            shortcut="⌘⇧A"
            onClick={onOpenChat}
            accent
          />
          <QuickAction
            icon={<Terminal className="w-5 h-5" />}
            title="Terminal"
            description="Open integrated terminal"
            shortcut="⌘`"
            onClick={onOpenTerminal}
          />
        </div>

        {/* Features */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-ide-text mb-4">✨ Features</h2>
          <div className="grid grid-cols-3 gap-4">
            <FeatureCard
              icon="🤖"
              title="Multi-Agent System"
              description="5 specialized AI agents for code, review, debug, architecture, and tests"
            />
            <FeatureCard
              icon="🧠"
              title="Project Context"
              description="AI understands your codebase structure and provides relevant suggestions"
            />
            <FeatureCard
              icon="📝"
              title="Code Generation"
              description="Generate code with one click and apply directly to your files"
            />
            <FeatureCard
              icon="🔍"
              title="Smart Search"
              description="Find files, symbols, and code patterns across your project"
            />
            <FeatureCard
              icon="🎨"
              title="Professional Editor"
              description="Monaco Editor with IntelliSense, minimap, and multi-cursor"
            />
            <FeatureCard
              icon="⚙️"
              title="Fully Configurable"
              description="Customize themes, keybindings, and editor settings"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-ide-text mb-4">⌨️ Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 gap-3">
            <ShortcutItem keys="⌘K" description="Command Palette" />
            <ShortcutItem keys="⌘B" description="Toggle Sidebar" />
            <ShortcutItem keys="⌘⇧A" description="Toggle AI Chat" />
            <ShortcutItem keys="⌘`" description="Toggle Terminal" />
            <ShortcutItem keys="⌘," description="Settings" />
            <ShortcutItem keys="⌘⇧G" description="Git Panel" />
            <ShortcutItem keys="⌘F" description="Find in File" />
            <ShortcutItem keys="⌘/" description="Toggle Comment" />
          </div>
        </div>

        {/* AI Agents */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-ide-text mb-4">🤖 AI Agents</h2>
          <div className="grid grid-cols-5 gap-3">
            <AgentCard icon="💻" name="Code" description="Write & edit code" color="text-ide-accent" />
            <AgentCard icon="🔍" name="Review" description="Code review" color="text-ide-success" />
            <AgentCard icon="🐛" name="Debug" description="Find & fix bugs" color="text-ide-warning" />
            <AgentCard icon="🏗️" name="Architect" description="System design" color="text-purple-400" />
            <AgentCard icon="🧪" name="Test" description="Write tests" color="text-pink-400" />
          </div>
        </div>

        {/* Links */}
        <div className="text-center text-sm text-ide-text-muted">
          <p className="mb-2">Press <kbd className="px-2 py-0.5 bg-ide-surface rounded border border-ide-border">⌘K</kbd> to open Command Palette</p>
          <p>Type <code className="px-1.5 py-0.5 bg-ide-surface rounded">/help</code> in chat for available commands</p>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, title, description, shortcut, onClick, accent }: {
  icon: React.ReactNode
  title: string
  description: string
  shortcut: string
  onClick?: () => void
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
        accent
          ? 'border-ide-accent/50 bg-ide-accent/5 hover:bg-ide-accent/10 hover:border-ide-accent'
          : 'border-ide-border bg-ide-surface hover:border-ide-accent/50 hover:bg-ide-border/30'
      }`}
    >
      <div className={`p-2 rounded-lg ${accent ? 'bg-ide-accent/20 text-ide-accent' : 'bg-ide-bg text-ide-text-muted'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-ide-text">{title}</div>
        <div className="text-xs text-ide-text-muted">{description}</div>
      </div>
      <kbd className="px-2 py-0.5 text-xs bg-ide-bg rounded border border-ide-border text-ide-text-muted">
        {shortcut}
      </kbd>
    </button>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-ide-surface rounded-lg border border-ide-border hover:border-ide-accent/30 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium text-ide-text mb-1">{title}</div>
      <div className="text-xs text-ide-text-muted">{description}</div>
    </div>
  )
}

function ShortcutItem({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-ide-border/30">
      <span className="text-sm text-ide-text">{description}</span>
      <kbd className="px-2 py-0.5 text-xs bg-ide-surface rounded border border-ide-border font-mono text-ide-accent">
        {keys}
      </kbd>
    </div>
  )
}

function AgentCard({ icon, name, description, color }: { icon: string; name: string; description: string; color: string }) {
  return (
    <div className="p-3 bg-ide-surface rounded-lg border border-ide-border hover:border-ide-accent/30 transition-colors text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-sm font-medium ${color}`}>{name}</div>
      <div className="text-xs text-ide-text-muted">{description}</div>
    </div>
  )
}
