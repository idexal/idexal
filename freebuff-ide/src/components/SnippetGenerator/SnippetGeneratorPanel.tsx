import React, { useState, useMemo } from 'react'
import {
  Wand2, Copy, Check, Code, Search, ChevronDown, ChevronRight,
  Zap, FileText, Layout, Database, Server, Globe, Shield, Cpu
} from 'lucide-react'

interface SnippetTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  language: string
  variables: { name: string; placeholder: string; default: string }[]
  generate: (vars: Record<string, string>) => string
}

const TEMPLATES: SnippetTemplate[] = [
  {
    id: 'react-component', name: 'React Component', description: 'Create a new React functional component',
    category: 'React', icon: '⚛️', language: 'tsx',
    variables: [
      { name: 'name', placeholder: 'ComponentName', default: 'MyComponent' },
      { name: 'withProps', placeholder: 'yes/no', default: 'yes' },
      { name: 'withState', placeholder: 'yes/no', default: 'no' },
    ],
    generate: (v) => `import React${v.withState === 'yes' ? ', { useState } from "react"' : ' from "react"'}\n\ninterface ${v.withProps === 'yes' ? `${v.name}Props {\n  \n}` : '{}'}\n\nexport default function ${v.name}(${v.withProps === 'yes' ? `{  }: ${v.name}Props` : ''}) {\n${v.withState === 'yes' ? '  const [state, setState] = useState(initialState)\n\n  ' : ''}  return (\n    <div>\n      \n    </div>\n  )\n}`,
  },
  {
    id: 'react-hook', name: 'Custom Hook', description: 'Create a custom React hook',
    category: 'React', icon: '🪝', language: 'ts',
    variables: [{ name: 'name', placeholder: 'useMyHook', default: 'useCustomHook' }],
    generate: (v) => `import { useState, useEffect } from "react"\n\nexport function ${v.name}() {\n  const [value, setValue] = useState(null)\n  const [loading, setLoading] = useState(false)\n  const [error, setError] = useState<Error | null>(null)\n\n  useEffect(() => {\n    // Hook logic here\n  }, [])\n\n  return { value, loading, error }\n}`,
  },
  {
    id: 'express-route', name: 'Express Route', description: 'Create an Express.js API route',
    category: 'Backend', icon: '🚀', language: 'ts',
    variables: [
      { name: 'name', placeholder: 'users', default: 'users' },
      { name: 'method', placeholder: 'GET/POST/PUT/DELETE', default: 'GET' },
    ],
    generate: (v) => `import { Router, Request, Response } from "express"\n\nconst router = Router()\n\n// ${v.method} /api/${v.name}\nrouter.${v.method.toLowerCase()}('/${v.name}', async (req: Request, res: Response) => {\n  try {\n    // Implementation here\n    res.json({ data: [] })\n  } catch (error) {\n    res.status(500).json({ error: error.message })\n  }\n})\n\nexport default router`,
  },
  {
    id: 'prisma-model', name: 'Prisma Model', description: 'Create a Prisma database model',
    category: 'Database', icon: '🗄️', language: 'prisma',
    variables: [
      { name: 'name', placeholder: 'User', default: 'User' },
      { name: 'fields', placeholder: 'id, name, email', default: 'id, name, email, createdAt' },
    ],
    generate: (v) => {
      const fields = v.fields.split(',').map(f => f.trim())
      let model = `model ${v.name} {\n`
      fields.forEach(f => {
        if (f === 'id') model += `  id    Int    @id @default(autoincrement())\n`
        else if (f === 'createdAt') model += `  createdAt DateTime @default(now())\n`
        else if (f === 'updatedAt') model += `  updatedAt DateTime @updatedAt\n`
        else model += `  ${f}    String\n`
      })
      model += `}`
      return model
    },
  },
  {
    id: 'zustand-store', name: 'Zustand Store', description: 'Create a Zustand state store',
    category: 'State', icon: '🐻', language: 'ts',
    variables: [
      { name: 'name', placeholder: 'useAppStore', default: 'useAppStore' },
      { name: 'state', placeholder: 'count: number', default: 'count: 0' },
    ],
    generate: (v) => `import { create } from "zustand"\n\ninterface AppState {\n  ${v.state.split(',').map(s => s.trim().replace(/:.*$/, ': ' + (s.includes('string') ? 'string' : s.includes('boolean') ? 'boolean' : 'number'))).join('\n  ')}\n  increment: () => void\n  decrement: () => void\n  reset: () => void\n}\n\nexport const ${v.name} = create<AppState>((set) => ({\n  ${v.state.split(',')[0].trim().split(':')[0].trim()}: ${v.state.includes(':') ? v.state.split(':')[1].trim().split(' ')[0] === 'string' ? '""' : '0' : '0'},\n  increment: () => set((state) => ({ count: state.count + 1 })),\n  decrement: () => set((state) => ({ count: state.count - 1 })),\n  reset: () => set({ count: 0 }),\n}))`,
  },
  {
    id: 'test-file', name: 'Test File', description: 'Create a Vitest test file',
    category: 'Testing', icon: '🧪', language: 'ts',
    variables: [{ name: 'name', placeholder: 'MyFunction', default: 'myFunction' }],
    generate: (v) => `import { describe, it, expect, vi } from "vitest"\nimport { ${v.name} } from "./${v.name.toLowerCase()}"\n\ndescribe("${v.name}", () => {\n  it("should return expected result", () => {\n    const result = ${v.name}()\n    expect(result).toBeDefined()\n  })\n\n  it("should handle edge cases", () => {\n    expect(() => ${v.name}()).not.toThrow()\n  })\n})`,
  },
  {
    id: 'docker-compose', name: 'Docker Compose', description: 'Create a docker-compose.yml service',
    category: 'DevOps', icon: '🐳', language: 'yaml',
    variables: [
      { name: 'name', placeholder: 'app', default: 'app' },
      { name: 'port', placeholder: '3000', default: '3000' },
    ],
    generate: (v) => `version: "3.8"\nservices:\n  ${v.name}:\n    build: .\n    ports:\n      - "${v.port}:${v.port}"\n    environment:\n      - NODE_ENV=production\n    volumes:\n      - .:/app\n      - /app/node_modules\n    restart: unless-stopped`,
  },
  {
    id: 'api-client', name: 'API Client', description: 'Create a typed API client function',
    category: 'Utilities', icon: '🌐', language: 'ts',
    variables: [{ name: 'name', placeholder: 'fetchUsers', default: 'fetchData' }],
    generate: (v) => `interface ApiResponse<T> {\n  data: T\n  status: number\n  message: string\n}\n\nasync function ${v.name}<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {\n  const response = await fetch(url, {\n    headers: {\n      "Content-Type": "application/json",\n      ...options?.headers,\n    },\n    ...options,\n  })\n\n  if (!response.ok) {\n    throw new Error(\`HTTP error! status: \${response.status}\`)\n  }\n\n  return response.json()\n}\n\nexport default ${v.name}`,
  },
  {
    id: 'middleware', name: 'Express Middleware', description: 'Create Express.js middleware',
    category: 'Backend', icon: '🔗', language: 'ts',
    variables: [{ name: 'name', placeholder: 'auth', default: 'authMiddleware' }],
    generate: (v) => `import { Request, Response, NextFunction } from "express"\n\nexport function ${v.name}(req: Request, res: Response, next: NextFunction) {\n  try {\n    const token = req.headers.authorization?.split(" ")[1]\n\n    if (!token) {\n      return res.status(401).json({ error: "No token provided" })\n    }\n\n    // Verify token logic here\n    // const decoded = verifyToken(token)\n    // req.user = decoded\n\n    next()\n  } catch (error) {\n    res.status(401).json({ error: "Invalid token" })\n  }\n}`,
  },
]

const CATEGORIES = ['All', 'React', 'Backend', 'Database', 'State', 'Testing', 'DevOps', 'Utilities']

export default function SnippetGeneratorPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedTemplate, setSelectedTemplate] = useState<SnippetTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return TEMPLATES.filter(t => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [selectedCategory, searchQuery])

  const generatedCode = useMemo(() => {
    if (!selectedTemplate) return ''
    const vars: Record<string, string> = {}
    selectedTemplate.variables.forEach(v => {
      vars[v.name] = variables[v.name] || v.default
    })
    return selectedTemplate.generate(vars)
  }, [selectedTemplate, variables])

  const copyCode = () => {
    navigator.clipboard?.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const selectTemplate = (template: SnippetTemplate) => {
    setSelectedTemplate(template)
    const vars: Record<string, string> = {}
    template.variables.forEach(v => { vars[v.name] = v.default })
    setVariables(vars)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-fuchsia-400" />
          <span className="text-sm font-semibold">Snippet Generator</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Search + Categories */}
      <div className="px-3 py-2 space-y-2 border-b border-ide-border">
        <div className="flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                selectedCategory === cat ? 'bg-fuchsia-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Template List */}
        <div className={`${selectedTemplate ? 'w-1/3 border-r border-ide-border' : 'w-full'} overflow-y-auto`}>
          {filtered.map(template => (
            <div
              key={template.id}
              onClick={() => selectTemplate(template)}
              className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/30 cursor-pointer ${
                selectedTemplate?.id === template.id ? 'bg-fuchsia-500/10 border-l-2 border-l-fuchsia-400' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm">{template.icon}</span>
                <span className="text-xs font-semibold">{template.name}</span>
              </div>
              <div className="text-xs text-ide-text-secondary truncate">{template.description}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1 py-0 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{template.category}</span>
                <span className="px-1 py-0 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{template.language}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Template Editor + Preview */}
        {selectedTemplate && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Variables */}
            <div className="px-3 py-2 border-b border-ide-border space-y-2">
              <div className="text-xs font-semibold text-fuchsia-400">Configure {selectedTemplate.name}</div>
              {selectedTemplate.variables.map(v => (
                <div key={v.name}>
                  <label className="text-xs text-ide-text-secondary">{v.name}</label>
                  <input
                    type="text"
                    value={variables[v.name] || ''}
                    onChange={e => setVariables(prev => ({ ...prev, [v.name]: e.target.value }))}
                    placeholder={v.placeholder}
                    className="w-full mt-0.5 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Generated Code */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 bg-ide-bg-secondary/30 border-b border-ide-border">
                <span className="text-xs text-ide-text-secondary">Generated Code</span>
                <button onClick={copyCode} className="text-xs text-fuchsia-400 flex items-center gap-1">
                  {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-ide-text bg-ide-bg-secondary/10 whitespace-pre-wrap">
                {generatedCode}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
