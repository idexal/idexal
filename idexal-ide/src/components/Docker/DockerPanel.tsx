import React, { useState } from 'react'
import {
  FaBox, FaTimes, FaPlay, FaSquare, FaTrash, FaSync, FaDownload, FaChevronDown, FaChevronRight, FaTerminal, FaCode, FaLayerGroup
} from '../Icon'

interface DockerPanelProps {
  onClose?: () => void
}

type DockerView = 'containers' | 'images' | 'compose'

interface DockerContainer {
  id: string
  name: string
  image: string
  status: 'running' | 'stopped' | 'paused' | 'creating'
  ports: string
  created: string
  size: string
}

interface DockerImage {
  id: string
  name: string
  tag: string
  size: string
  created: string
  layers: number
}

const MOCK_CONTAINERS: DockerContainer[] = [
  { id: 'a1b2c3d4e5f6', name: 'idexal-app', image: 'node:20-alpine', status: 'running', ports: '5173:5173, 3000:3000', created: '2 hours ago', size: '182MB' },
  { id: 'f6e5d4c3b2a1', name: 'idexal-db', image: 'postgres:16-alpine', status: 'running', ports: '5432:5432', created: '2 hours ago', size: '245MB' },
  { id: 'b2c3d4e5f6a1', name: 'idexal-redis', image: 'redis:7-alpine', status: 'stopped', ports: '6379:6379', created: '1 day ago', size: '32MB' },
  { id: 'c3d4e5f6a1b2', name: 'idexal-nginx', image: 'nginx:alpine', status: 'paused', ports: '80:80, 443:443', created: '3 days ago', size: '42MB' },
]

const MOCK_IMAGES: DockerImage[] = [
  { id: 'sha256:a1b2c3', name: 'node', tag: '20-alpine', size: '182MB', created: '2 weeks ago', layers: 6 },
  { id: 'sha256:d4e5f6', name: 'postgres', tag: '16-alpine', size: '245MB', created: '1 month ago', layers: 8 },
  { id: 'sha256:g7h8i9', name: 'redis', tag: '7-alpine', size: '32MB', created: '3 weeks ago', layers: 4 },
  { id: 'sha256:j0k1l2', name: 'nginx', tag: 'alpine', size: '42MB', created: '1 month ago', layers: 5 },
  { id: 'sha256:m3n4o5', name: 'python', tag: '3.12-slim', size: '156MB', created: '2 weeks ago', layers: 7 },
  { id: 'sha256:p6q7r8', name: 'rust', tag: '1.77-slim', size: '890MB', created: '1 week ago', layers: 12 },
]

const STATUS_COLORS: Record<DockerContainer['status'], string> = {
  running: 'bg-green-500',
  stopped: 'bg-red-500',
  paused: 'bg-yellow-500',
  creating: 'bg-blue-500 animate-pulse',
}

const STATUS_TEXT: Record<DockerContainer['status'], string> = {
  running: 'Running',
  stopped: 'Stopped',
  paused: 'Paused',
  creating: 'Creating...',
}

export default function DockerPanel({ onClose }: DockerPanelProps) {
  const [view, setView] = useState<DockerView>('containers')
  const [containers, setContainers] = useState<DockerContainer[]>(MOCK_CONTAINERS)
  const [expandedContainer, setExpandedContainer] = useState<string | null>(null)

  const toggleContainer = (id: string) => {
    setExpandedContainer(expandedContainer === id ? null : id)
  }

  const toggleContainerStatus = (id: string) => {
    setContainers((prev: DockerContainer[]) => prev.map((c: DockerContainer) => {
      if (c.id !== id) return c
      if (c.status === 'running') return { ...c, status: 'stopped' as const }
      return { ...c, status: 'running' as const }
    }))
  }

  const removeContainer = (id: string) => {
    setContainers((prev: DockerContainer[]) => prev.filter((c: DockerContainer) => c.id !== id))
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBox className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Docker</span>
          <span className="text-[10px] text-ide-text-muted">
            {containers.filter(c => c.status === 'running').length} running
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted" title="Refresh">
            <FaSync className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
              <FaTimes className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-ide-border">
        {(['containers', 'images', 'compose'] as DockerView[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              view === v ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'containers' && (
          <div className="py-1">
            {containers.length === 0 ? (
              <div className="flex items-center justify-center h-full text-ide-text-muted text-xs">
                <div className="text-center">
                  <FaBox className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div>No containers</div>
                </div>
              </div>
            ) : (
              containers.map(container => (
                <div key={container.id} className="border-b border-ide-border/50">
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-ide-border/30 cursor-pointer"
                    onClick={() => toggleContainer(container.id)}
                  >
                    {expandedContainer === container.id ? <FaChevronDown className="w-3 h-3 text-ide-text-muted" /> : <FaChevronRight className="w-3 h-3 text-ide-text-muted" />}
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[container.status]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ide-text font-medium">{container.name}</div>
                      <div className="text-[10px] text-ide-text-muted">{container.image}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${container.status === 'running' ? 'bg-green-500/10 text-green-400' : container.status === 'stopped' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {STATUS_TEXT[container.status]}
                    </span>
                  </div>

                  {expandedContainer === container.id && (
                    <div className="px-6 pb-2 space-y-2">
                      <div className="text-[10px] text-ide-text-muted">
                        <div><strong>ID:</strong> {container.id}</div>
                        <div><strong>Ports:</strong> {container.ports}</div>
                        <div><strong>Created:</strong> {container.created}</div>
                        <div><strong>Size:</strong> {container.size}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleContainerStatus(container.id)} className={`p-1 rounded ${container.status === 'running' ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`} title={container.status === 'running' ? 'Stop' : 'Start'}>
                          {container.status === 'running' ? <FaSquare className="w-3 h-3" /> : <FaPlay className="w-3 h-3" />}
                        </button>
                        <button className="p-1 rounded text-ide-text-muted hover:bg-ide-border" title="Logs"><FaTerminal className="w-3 h-3" /></button>
                        <button onClick={() => removeContainer(container.id)} className="p-1 rounded text-red-400 hover:bg-red-400/10" title="Remove"><FaTrash className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {view === 'images' && (
          <div className="py-1">
            {MOCK_IMAGES.map(image => (
              <div key={image.id} className="flex items-center gap-2 px-3 py-2 hover:bg-ide-border/30 border-b border-ide-border/50">
                <FaLayerGroup className="w-3.5 h-3.5 text-ide-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-ide-text">
                    <span className="font-medium">{image.name}</span>
                    <span className="text-ide-accent">:{image.tag}</span>
                  </div>
                  <div className="text-[10px] text-ide-text-muted">{image.id} · {image.layers} layers</div>
                </div>
                <span className="text-[10px] text-ide-text-muted">{image.size}</span>
                <span className="text-[10px] text-ide-text-muted">{image.created}</span>
                <button className="p-1 rounded text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100" title="Remove">
                  <FaTrash className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {view === 'compose' && (
          <div className="p-4 space-y-4">
            <div className="bg-ide-bg border border-ide-border rounded-lg p-4">
              <div className="text-xs text-ide-text font-medium mb-2">docker-compose.yml</div>
              <pre className="text-[10px] font-mono text-ide-text-muted overflow-auto">
{`version: '3.8'

services:
  app:
    build: .
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: idexal
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf`}
              </pre>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-ide-success text-white rounded hover:bg-ide-success/80">
                <FaPlay className="w-3 h-3" /> docker-compose up
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-ide-bg border border-ide-border rounded text-ide-text hover:border-ide-accent">
                <FaDownload className="w-3 h-3" /> Pull Images
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
