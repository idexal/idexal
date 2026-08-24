import React from 'react'
import { Loader2, CheckCircle, AlertCircle, Brain } from 'lucide-react'

interface AgentThinkingProps {
  thinking: string[]
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'error'
}

export default function AgentThinking({ thinking, status }: AgentThinkingProps) {
  if (thinking.length === 0 && status === 'idle') return null

  return (
    <div className="p-3 bg-ide-bg/50 rounded-lg border border-ide-border mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Brain className={`w-4 h-4 ${status === 'thinking' ? 'text-ide-accent animate-pulse' : status === 'completed' ? 'text-ide-success' : 'text-ide-text-muted'}`} />
        <span className="text-xs font-medium text-ide-text-muted">
          {status === 'thinking' ? 'Thinking...' :
           status === 'executing' ? 'Executing...' :
           status === 'completed' ? 'Completed' :
           status === 'error' ? 'Error' : 'Thinking Process'}
        </span>
        {status === 'thinking' && <Loader2 className="w-3 h-3 text-ide-accent animate-spin" />}
      </div>
      <div className="space-y-1">
        {thinking.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-ide-text-muted animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            {status === 'completed' ? (
              <CheckCircle className="w-3.5 h-3.5 text-ide-success mt-0.5 flex-shrink-0" />
            ) : status === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-ide-error mt-0.5 flex-shrink-0" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-ide-accent mt-1.5 flex-shrink-0" />
            )}
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
