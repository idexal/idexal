import React, { useState, useMemo } from 'react'
import {
  FaFileAlt, FaCopy, FaCheck, FaDownload, FaCode, FaGlobe, FaLock, FaEye, FaChevronDown, FaChevronRight, FaPlus, FaTrash, FaExternalLinkAlt, FaLayerGroup, FaArrowRight, FaBolt
} from '../Icon'

interface APIEndpoint {
  method: string
  path: string
  summary: string
  description: string
  tags: string[]
  parameters: { name: string; in: string; type: string; required: boolean; description: string }[]
  requestBody?: { contentType: string; schema: string; example: string }
  responses: { status: string; description: string; schema: string }[]
  security: string[]
}

const MOCK_ENDPOINTS: APIEndpoint[] = [
  {
    method: 'GET', path: '/api/users', summary: 'List all users', description: 'Returns a paginated list of all users in the system.',
    tags: ['Users'], parameters: [
      { name: 'limit', in: 'query', type: 'integer', required: false, description: 'Max items to return (default 20)' },
      { name: 'offset', in: 'query', type: 'integer', required: false, description: 'Pagination offset' },
    ],
    responses: [
      { status: '200', description: 'Successful response', schema: '{ data: User[], total: number }' },
      { status: '401', description: 'Unauthorized', schema: '{ error: string }' },
    ], security: ['bearerAuth'],
  },
  {
    method: 'GET', path: '/api/users/{id}', summary: 'Get user by ID', description: 'Returns a single user by their unique identifier.',
    tags: ['Users'], parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'User ID' },
    ],
    responses: [
      { status: '200', description: 'User found', schema: '{ data: User }' },
      { status: '404', description: 'User not found', schema: '{ error: string }' },
    ], security: ['bearerAuth'],
  },
  {
    method: 'POST', path: '/api/users', summary: 'Create a new user', description: 'Creates a new user with the provided data.',
    tags: ['Users'], parameters: [],
    requestBody: { contentType: 'application/json', schema: '{ name: string, email: string, role?: string }', example: '{ "name": "Alice", "email": "alice@example.com" }' },
    responses: [
      { status: '201', description: 'User created', schema: '{ data: User }' },
      { status: '400', description: 'Validation error', schema: '{ errors: ValidationError[] }' },
    ], security: ['bearerAuth'],
  },
  {
    method: 'PUT', path: '/api/users/{id}', summary: 'Update a user', description: 'Updates an existing user.',
    tags: ['Users'], parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'User ID' },
    ],
    requestBody: { contentType: 'application/json', schema: '{ name?: string, email?: string }', example: '{ "name": "Alice Updated" }' },
    responses: [
      { status: '200', description: 'User updated', schema: '{ data: User }' },
    ], security: ['bearerAuth'],
  },
  {
    method: 'DELETE', path: '/api/users/{id}', summary: 'Delete a user', description: 'Permanently deletes a user.',
    tags: ['Users'], parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'User ID' },
    ],
    responses: [
      { status: '204', description: 'User deleted', schema: '' },
    ], security: ['bearerAuth', 'adminRole'],
  },
  {
    method: 'POST', path: '/api/auth/login', summary: 'Authenticate user', description: 'Returns a JWT token for the provided credentials.',
    tags: ['Auth'], parameters: [],
    requestBody: { contentType: 'application/json', schema: '{ email: string, password: string }', example: '{ "email": "alice@example.com", "password": "secret" }' },
    responses: [
      { status: '200', description: 'Login successful', schema: '{ token: string, user: User }' },
      { status: '401', description: 'Invalid credentials', schema: '{ error: string }' },
    ], security: [],
  },
  {
    method: 'GET', path: '/api/posts', summary: 'List posts', description: 'Returns all published posts.',
    tags: ['Posts'], parameters: [
      { name: 'status', in: 'query', type: 'string', required: false, description: 'Filter by status: published, draft' },
    ],
    responses: [
      { status: '200', description: 'Posts list', schema: '{ data: Post[] }' },
    ], security: [],
  },
  {
    method: 'GET', path: '/api/health', summary: 'Health check', description: 'Returns service health status and uptime.',
    tags: ['System'], parameters: [],
    responses: [
      { status: '200', description: 'Service healthy', schema: '{ status: "ok", uptime: number, version: string }' },
    ], security: [],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-600', POST: 'bg-blue-600', PUT: 'bg-yellow-600', DELETE: 'bg-red-600', PATCH: 'bg-purple-600',
}

function generateOpenAPI(endpoints: APIEndpoint[]): string {
  const spec: Record<string, unknown> = {
    openapi: '3.0.3',
    info: { title: 'Idexal API', version: '1.0.0', description: 'Auto-generated API documentation' },
    servers: [{ url: 'http://localhost:3000', description: 'Development' }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        adminRole: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths: {} as Record<string, unknown>,
  }

  endpoints.forEach(ep => {
    const paths = spec.paths as Record<string, Record<string, unknown>>
    if (!paths[ep.path]) paths[ep.path] = {}
    paths[ep.path][ep.method.toLowerCase()] = {
      summary: ep.summary,
      description: ep.description,
      tags: ep.tags,
      parameters: ep.parameters.map(p => ({ name: p.name, in: p.in, required: p.required, description: p.description, schema: { type: p.type } })),
      ...(ep.requestBody ? { requestBody: { required: true, content: { [ep.requestBody.contentType]: { schema: { type: 'object' }, example: JSON.parse(ep.requestBody.example) } } } } : {}),
      responses: Object.fromEntries(ep.responses.map(r => [r.status, { description: r.description, content: r.schema ? { 'application/json': { schema: { type: 'object' } } } : undefined }])),
      security: ep.security.map(s => ({ [s]: [] })),
    }
  })

  return JSON.stringify(spec, null, 2)
}

export default function APIDocGeneratorPanel({ onClose }: { onClose: () => void }) {
  const [endpoints, setEndpoints] = useState(MOCK_ENDPOINTS)
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [activeTab, setActiveTab] = useState<'endpoints' | 'docs' | 'schemas'>('endpoints')
  const [copied, setCopied] = useState(false)
  const [filterTag, setFilterTag] = useState<string>('All')
  const [filterMethod, setFilterMethod] = useState<string>('All')

  const tags = useMemo(() => ['All', ...new Set(endpoints.flatMap(e => e.tags))], [endpoints])
  const methods = useMemo(() => ['All', ...new Set(endpoints.map(e => e.method))], [endpoints])

  const filtered = useMemo(() => {
    return endpoints.filter(e => {
      if (filterTag !== 'All' && !e.tags.includes(filterTag)) return false
      if (filterMethod !== 'All' && e.method !== filterMethod) return false
      return true
    })
  }, [endpoints, filterTag, filterMethod])

  const openAPISpec = useMemo(() => generateOpenAPI(endpoints), [endpoints])

  const copySpec = () => {
    navigator.clipboard?.writeText(openAPISpec)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadSpec = () => {
    const blob = new Blob([openAPISpec], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openapi-spec.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaFileAlt size={16} className="text-sky-400" />
          <span className="text-sm font-semibold">API Documentation</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copySpec} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Copy OpenAPI spec">
            {copied ? <FaCheck size={14} className="text-green-400" /> : <FaCopy size={14} />}
          </button>
          <button onClick={downloadSpec} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Download spec">
            <FaDownload size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'endpoints' as const, label: `Endpoints (${endpoints.length})` }, { key: 'docs' as const, label: 'OpenAPI Spec' }, { key: 'schemas' as const, label: 'Schemas' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-sky-400 text-sky-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'endpoints' && (
          <div>
            <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
              <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs">
                {methods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="flex items-center gap-1">
                {tags.map(t => (
                  <button key={t} onClick={() => setFilterTag(t)} className={`px-2 py-0.5 text-xs rounded ${filterTag === t ? 'bg-sky-600 text-white' : 'text-ide-text-secondary'}`}>{t}</button>
                ))}
              </div>
            </div>
            {filtered.map((ep, i) => (
              <div key={i} onClick={() => setSelectedEndpoint(selectedEndpoint === ep ? null : ep)} className="border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2">
                  {selectedEndpoint === ep ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  <span className={`px-2 py-0.5 text-xs text-white rounded ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                  <span className="text-xs font-mono flex-1">{ep.path}</span>
                  <span className="text-xs text-ide-text-secondary">{ep.summary}</span>
                  {ep.security.length > 0 && <FaLock size={10} className="text-yellow-400" />}
                </div>
                {selectedEndpoint === ep && (
                  <div className="px-6 pb-3 space-y-2">
                    <div className="text-xs">{ep.description}</div>
                    {ep.parameters.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-sky-400 mb-1">Parameters</div>
                        {ep.parameters.map(p => (
                          <div key={p.name} className="text-xs flex items-center gap-2 py-0.5">
                            <span className="font-mono text-green-400">{p.name}</span>
                            <span className="text-ide-text-secondary">({p.in}{p.required ? ', required' : ''})</span>
                            <span className="text-purple-400">{p.type}</span>
                            <span className="text-ide-text-secondary">— {p.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {ep.requestBody && (
                      <div>
                        <div className="text-xs font-semibold text-sky-400 mb-1">Request Body</div>
                        <pre className="bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono">{ep.requestBody.example}</pre>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-sky-400 mb-1">Responses</div>
                      {ep.responses.map(r => (
                        <div key={r.status} className="flex items-center gap-2 text-xs py-0.5">
                          <span className={`font-mono ${r.status.startsWith('2') ? 'text-green-400' : r.status.startsWith('4') ? 'text-yellow-400' : 'text-red-400'}`}>{r.status}</span>
                          <span className="text-ide-text-secondary">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-sky-400">OpenAPI 3.0 Specification</span>
              <button onClick={downloadSpec} className="text-xs text-sky-400 flex items-center gap-1"><FaDownload size={10} /> Export JSON</button>
            </div>
            <pre className="bg-ide-bg-secondary/30 border border-ide-border rounded p-3 text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap">{openAPISpec}</pre>
          </div>
        )}

        {activeTab === 'schemas' && (
          <div className="p-3 space-y-3">
            {[
              { name: 'User', fields: [{ name: 'id', type: 'string', required: true }, { name: 'name', type: 'string', required: true }, { name: 'email', type: 'string', required: true }, { name: 'avatar', type: 'string', required: false }, { name: 'role', type: 'string', required: false }, { name: 'createdAt', type: 'DateTime', required: true }] },
              { name: 'Post', fields: [{ name: 'id', type: 'string', required: true }, { name: 'title', type: 'string', required: true }, { name: 'content', type: 'string', required: true }, { name: 'author', type: 'User', required: true }, { name: 'status', type: 'enum: draft, published', required: true }, { name: 'tags', type: 'string[]', required: false }] },
              { name: 'Auth', fields: [{ name: 'token', type: 'string', required: true }, { name: 'user', type: 'User', required: true }, { name: 'expiresIn', type: 'number', required: true }] },
            ].map(schema => (
              <div key={schema.name} className="border border-ide-border/50 rounded">
                <div className="px-3 py-2 bg-ide-bg-secondary/30 text-xs font-semibold text-sky-400">type {schema.name}</div>
                {schema.fields.map(f => (
                  <div key={f.name} className="flex items-center gap-2 px-3 py-1 border-t border-ide-border/30 text-xs">
                    <span className="font-mono text-green-400 w-24">{f.name}</span>
                    <span className="font-mono text-purple-400">{f.type}</span>
                    {f.required && <span className="text-red-400">*</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
