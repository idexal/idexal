import React from 'react'
import {
  FaCode, FaTerminal, FaComments, FaCog,
  FaFileAlt, FaFolderOpen, FaRocket, FaBook, FaExternalLinkAlt,
  FaBolt, FaBrain, FaShieldAlt, FaSearch, FaPalette, FaKeyboard,
  FaCubes, FaBug, FaProjectDiagram, FaFlask,
} from '../Icon'

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
    <div className="h-full overflow-auto bg-ide-editor relative">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-ide-brand/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-1/4 w-48 h-48 bg-ide-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-3xl mx-auto p-8 pt-12">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-in-up">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-ide-brand-dark via-ide-accent-dark to-purple-600 p-[2px] shadow-brand-lg">
              <div className="w-full h-full rounded-3xl bg-ide-bg flex items-center justify-center">
                <img src="/icon.png" alt="Idexal IDE" className="w-16 h-16 object-contain rounded-2xl" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ide-success border-2 border-ide-bg flex items-center justify-center">
              <FaRocket className="w-3 h-3 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Welcome to <span className="text-gradient">Idexal IDE</span>
          </h1>
          <p className="text-ide-text-secondary text-base max-w-md mx-auto leading-relaxed">
            Professional Multi-Agent AI-Powered Development Environment.
            <br />
            <span className="text-ide-text-muted text-sm">Build, debug, and deploy — faster than ever.</span>
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-10 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
          <QuickAction
            icon={<FaFileAlt className="w-5 h-5" />}
            title="New File"
            description="Create a new file"
            shortcut="⌘N"
            onClick={onOpenFile}
          />
          <QuickAction
            icon={<FaFolderOpen className="w-5 h-5" />}
            title="Open Folder"
            description="Open a project folder"
            shortcut="⌘O"
            onClick={onOpenFolder}
          />
          <QuickAction
            icon={<FaComments className="w-5 h-5" />}
            title="AI Assistant"
            description="Chat with AI agents"
            shortcut="⌘⇧A"
            onClick={onOpenChat}
            accent
          />
          <QuickAction
            icon={<FaTerminal className="w-5 h-5" />}
            title="Terminal"
            description="Integrated terminal"
            shortcut="⌘`"
            onClick={onOpenTerminal}
          />
        </div>

        {/* Features */}
        <div className="mb-10 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
          <SectionHeader icon={<FaRocket className="w-4 h-4" />} title="Features" />
          <div className="grid grid-cols-3 gap-3">
            <FeatureCard icon={<FaCubes className="w-5 h-5 text-ide-brand-light" />} title="Multi-Agent System" description="5 specialized AI agents for code, review, debug, architecture, and tests" />
            <FeatureCard icon={<FaBrain className="w-5 h-5 text-ide-accent-light" />} title="Project Context" description="AI understands your codebase structure and provides relevant suggestions" />
            <FeatureCard icon={<FaCode className="w-5 h-5 text-ide-success" />} title="FaCode Generation" description="Generate code with one click and apply directly to your files" />
            <FeatureCard icon={<FaSearch className="w-5 h-5 text-ide-info" />} title="Smart Search" description="Find files, symbols, and code patterns across your project" />
            <FeatureCard icon={<FaPalette className="w-5 h-5 text-rose-400" />} title="Professional Editor" description="Monaco Editor with IntelliSense, minimap, and multi-cursor" />
            <FeatureCard icon={<FaCog className="w-5 h-5 text-ide-warning" />} title="Fully Configurable" description="Customize themes, keybindings, and editor settings" />
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mb-10 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
          <SectionHeader icon={<FaKeyboard className="w-4 h-4" />} title="Keyboard Shortcuts" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { keys: '⌘K', description: 'Command Palette' },
              { keys: '⌘B', description: 'Toggle Sidebar' },
              { keys: '⌘⇧A', description: 'Toggle AI Chat' },
              { keys: '⌘`', description: 'Toggle Terminal' },
              { keys: '⌘,', description: 'Settings' },
              { keys: '⌘⇧G', description: 'Git Panel' },
              { keys: '⌘F', description: 'Find in File' },
              { keys: '⌘/', description: 'Toggle Comment' },
            ].map((s) => (
              <div key={s.keys} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-ide-surface-alt/50 transition-colors group">
                <span className="text-sm text-ide-text-muted group-hover:text-ide-text-secondary transition-colors">{s.description}</span>
                <div className="flex items-center gap-0.5">
                  {s.keys.split('').map((k, i) => (
                    <kbd key={i} className="!min-w-0 !h-5 !px-1.5">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agents */}
        <div className="mb-10 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
          <SectionHeader icon={<FaCubes className="w-4 h-4" />} title="AI Agents" />
          <div className="grid grid-cols-5 gap-3">
            {[
              { icon: <FaCode className="w-5 h-5" />, name: 'FaCode', description: 'Write & edit code', color: 'text-ide-brand-light', bg: 'bg-ide-brand-50' },
              { icon: <FaSearch className="w-5 h-5" />, name: 'Review', description: 'FaCode review', color: 'text-ide-success', bg: 'bg-emerald-500/10' },
              { icon: <FaBug className="w-5 h-5" />, name: 'Debug', description: 'Find & fix bugs', color: 'text-ide-warning', bg: 'bg-amber-500/10' },
              { icon: <FaProjectDiagram className="w-5 h-5" />, name: 'Architect', description: 'System design', color: 'text-ide-accent-light', bg: 'bg-violet-500/10' },
              { icon: <FaFlask className="w-5 h-5" />, name: 'Test', description: 'Write tests', color: 'text-rose-400', bg: 'bg-rose-500/10' },
            ].map((a) => (
              <div key={a.name} className="p-3 rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/20 transition-all duration-200 text-center group cursor-pointer hover:shadow-brand-sm">
                <div className={`w-10 h-10 mx-auto rounded-xl ${a.bg} flex items-center justify-center mb-2 ${a.color} transition-transform duration-200 group-hover:scale-110`}>
                  {a.icon}
                </div>
                <div className="text-sm font-medium text-ide-text-secondary">{a.name}</div>
                <div className="text-2xs text-ide-text-dim mt-0.5">{a.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="brand-divider mb-4" />
          <p className="text-xs text-ide-text-dim">
            Press <kbd className="!text-2xs">⌘K</kbd> to open Command Palette
          </p>
          <p className="text-2xs text-ide-text-dim mt-1">
            Type <code className="px-1.5 py-0.5 bg-ide-surface rounded border border-ide-border text-ide-text-dim font-mono">/help</code> in chat for commands
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-sm font-bold text-ide-text-secondary mb-3 flex items-center gap-2">
      <span className="text-ide-brand">{icon}</span>
      {title}
    </h2>
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
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left group ${
        accent
          ? 'border-ide-brand/30 bg-ide-brand-50 hover:bg-ide-brand-100 hover:border-ide-brand/50 hover:shadow-brand-sm'
          : 'border-ide-border bg-ide-surface hover:border-ide-border-light hover:bg-ide-surface-alt hover:shadow-panel'
      }`}
    >
      <div className={`p-2.5 rounded-xl transition-all duration-200 group-hover:scale-110 ${
        accent
          ? 'bg-gradient-to-br from-ide-brand to-ide-accent text-white shadow-brand'
          : 'bg-ide-bg-alt text-ide-text-muted group-hover:text-ide-brand-light group-hover:bg-ide-brand-50'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ide-text-secondary group-hover:text-ide-text transition-colors">{title}</div>
        <div className="text-xs text-ide-text-dim">{description}</div>
      </div>
      <kbd className="!text-2xs !px-1.5 !h-5">{shortcut}</kbd>
    </button>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/20 transition-all duration-200 group cursor-default hover:shadow-panel">
      <div className="mb-2.5 transition-transform duration-200 group-hover:scale-110 group-hover:translate-y-[-2px]">{icon}</div>
      <div className="text-sm font-semibold text-ide-text-secondary mb-1">{title}</div>
      <div className="text-xs text-ide-text-dim leading-relaxed">{description}</div>
    </div>
  )
}
