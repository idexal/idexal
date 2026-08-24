import React, { useState, useMemo } from 'react'
import {
  Play, Copy, Check, Download, History, Settings, Loader2,
  ChevronDown, ChevronRight, Search, Code, Braces, AlertCircle
} from 'lucide-react'

interface GraphQLRequest {
  id: string
  name: string
  query: string
  variables: string
  headers: Record<string, string>
  timestamp: Date
}

interface GraphQLField {
  name: string
  type: string
  description: string
  isRequired: boolean
  args?: { name: string; type: string }[]
}

const MOCK_SCHEMA: Record<string, GraphQLField[]> = {
  Query: [
    { name: 'user', type: 'User', description: 'Get a user by ID', isRequired: true, args: [{ name: 'id', type: 'ID!' }] },
    { name: 'users', type: '[User!]!', description: 'Get all users', isRequired: false, args: [{ name: 'limit', type: 'Int' }, { name: 'offset', type: 'Int' }] },
    { name: 'post', type: 'Post', description: 'Get a post by ID', isRequired: false, args: [{ name: 'id', type: 'ID!' }] },
    { name: 'posts', type: '[Post!]!', description: 'Get all posts', isRequired: false, args: [{ name: 'status', type: 'PostStatus' }] },
    { name: 'comments', type: '[Comment!]!', description: 'Get comments for a post', isRequired: false, args: [{ name: 'postId', type: 'ID!' }] },
  ],
  User: [
    { name: 'id', type: 'ID!', description: 'User ID', isRequired: true },
    { name: 'name', type: 'String!', description: 'User name', isRequired: true },
    { name: 'email', type: 'String!', description: 'User email', isRequired: true },
    { name: 'avatar', type: 'String', description: 'Avatar URL', isRequired: false },
    { name: 'posts', type: '[Post!]!', description: 'User posts', isRequired: false },
    { name: 'createdAt', type: 'DateTime!', description: 'Creation date', isRequired: true },
  ],
  Post: [
    { name: 'id', type: 'ID!', description: 'Post ID', isRequired: true },
    { name: 'title', type: 'String!', description: 'Post title', isRequired: true },
    { name: 'content', type: 'String!', description: 'Post content', isRequired: true },
    { name: 'author', type: 'User!', description: 'Post author', isRequired: true },
    { name: 'status', type: 'PostStatus!', description: 'Post status', isRequired: true },
    { name: 'comments', type: '[Comment!]!', description: 'Post comments', isRequired: false },
    { name: 'tags', type: '[String!]!', description: 'Post tags', isRequired: false },
    { name: 'createdAt', type: 'DateTime!', description: 'Creation date', isRequired: true },
  ],
  Comment: [
    { name: 'id', type: 'ID!', description: 'Comment ID', isRequired: true },
    { name: 'text', type: 'String!', description: 'Comment text', isRequired: true },
    { name: 'author', type: 'User!', description: 'Comment author', isRequired: true },
    { name: 'createdAt', type: 'DateTime!', description: 'Creation date', isRequired: true },
  ],
}

const SAMPLE_QUERIES: GraphQLRequest[] = [
  { id: '1', name: 'Get User', query: `query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n    email\n    avatar\n    posts {\n      id\n      title\n    }\n  }\n}`, variables: '{\n  "id": "1"\n}', headers: {}, timestamp: new Date(Date.now() - 300000) },
  { id: '2', name: 'Get All Posts', query: `query GetPosts {\n  posts(status: PUBLISHED) {\n    id\n    title\n    author {\n      name\n      avatar\n    }\n    tags\n    createdAt\n  }\n}`, variables: '{}', headers: {}, timestamp: new Date(Date.now() - 600000) },
  { id: '3', name: 'Create Post', query: `mutation CreatePost($input: CreatePostInput!) {\n  createPost(input: $input) {\n    id\n    title\n    status\n  }\n}`, variables: '{\n  "input": {\n    "title": "New Post",\n    "content": "Hello World",\n    "tags": ["graphql", "api"]\n  }\n}', headers: {}, timestamp: new Date(Date.now() - 900000) },
]

const MOCK_RESPONSE = {
  data: {
    user: {
      id: "1",
      name: "Alice Chen",
      email: "alice@example.com",
      avatar: "https://api.dicebear.com/avataaars/alice.svg",
      posts: [
        { id: "101", title: "Getting Started with GraphQL" },
        { id: "102", title: "Advanced Schema Design" },
      ]
    }
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ago`
}

export default function GraphQLExplorerPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query)
  const [variables, setVariables] = useState(SAMPLE_QUERIES[0].variables)
  const [response, setResponse] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [responseTime, setResponseTime] = useState(0)
  const [activeTab, setActiveTab] = useState<'query' | 'schema' | 'history'>('query')
  const [schemaType, setSchemaType] = useState('Query')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState(SAMPLE_QUERIES)
  const [endpoint, setEndpoint] = useState('http://localhost:4000/graphql')

  const runQuery = async () => {
    setIsRunning(true)
    const start = Date.now()
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500))
    setResponse(JSON.stringify(MOCK_RESPONSE, null, 2))
    setResponseTime(Date.now() - start)
    setIsRunning(false)

    const newEntry: GraphQLRequest = {
      id: String(Date.now()),
      name: 'Query ' + (history.length + 1),
      query,
      variables,
      headers: {},
      timestamp: new Date(),
    }
    setHistory(prev => [newEntry, ...prev].slice(0, 20))
  }

  const copyResponse = () => {
    navigator.clipboard?.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Braces size={16} className="text-pink-400" />
          <span className="text-sm font-semibold">GraphQL Explorer</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Endpoint */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
        <span className="text-xs text-ide-text-secondary">Endpoint:</span>
        <input
          type="text"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
        />
        <button
          onClick={runQuery}
          disabled={isRunning}
          className="px-3 py-1 bg-pink-600 hover:bg-pink-500 rounded text-xs flex items-center gap-1"
        >
          {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
          Run
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'query' as const, label: 'Query', icon: Code },
          { key: 'schema' as const, label: 'Schema', icon: Braces },
          { key: 'history' as const, label: 'History', icon: History },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs border-b-2 flex-1 justify-center ${
              activeTab === tab.key
                ? 'border-pink-400 text-pink-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'query' && (
          <>
            {/* Query + Variables */}
            <div className="flex-1 flex flex-col border-r border-ide-border">
              {/* Query Editor */}
              <div className="flex-1 overflow-hidden">
                <div className="px-3 py-1 text-xs text-ide-text-secondary bg-ide-bg-secondary/30 border-b border-ide-border">Query</div>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono p-3 outline-none resize-none"
                  spellCheck={false}
                />
              </div>
              {/* Variables */}
              <div className="h-1/3 border-t border-ide-border overflow-hidden">
                <div className="px-3 py-1 text-xs text-ide-text-secondary bg-ide-bg-secondary/30 border-b border-ide-border">Variables</div>
                <textarea
                  value={variables}
                  onChange={e => setVariables(e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono p-3 outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Response */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-1 text-xs bg-ide-bg-secondary/30 border-b border-ide-border flex items-center justify-between">
                <span className="text-ide-text-secondary">Response</span>
                {responseTime > 0 && (
                  <span className="text-green-400">{responseTime}ms</span>
                )}
                {response && (
                  <button onClick={copyResponse} className="text-ide-text-secondary hover:text-ide-text">
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto p-3">
                {response ? (
                  <pre className="text-xs font-mono text-ide-text whitespace-pre-wrap">{response}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-ide-text-secondary text-xs">
                    Run a query to see the response
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'schema' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Types List */}
            <div className="w-1/3 border-r border-ide-border overflow-y-auto">
              <div className="p-2">
                {Object.keys(MOCK_SCHEMA).map(type => (
                  <button
                    key={type}
                    onClick={() => setSchemaType(type)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded mb-1 ${
                      schemaType === type ? 'bg-pink-600/20 text-pink-400' : 'text-ide-text-secondary hover:bg-ide-bg-secondary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto p-3">
              <h3 className="text-sm font-semibold text-pink-400 mb-2">type {schemaType} {'{'}</h3>
              {MOCK_SCHEMA[schemaType]?.map(field => (
                <div key={field.name} className="ml-4 mb-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-ide-text font-mono">{field.name}</span>
                    {field.args && field.args.length > 0 && (
                      <span className="text-ide-text-secondary">
                        ({field.args.map(a => `${a.name}: ${a.type}`).join(', ')})
                      </span>
                    )}
                    <span className="text-ide-text-secondary">: </span>
                    <span className="text-pink-400">{field.type}</span>
                  </div>
                  <div className="text-xs text-ide-text-secondary/60 ml-2">{field.description}</div>
                </div>
              ))}
              <span className="text-sm text-ide-text-secondary">{'}'}</span>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto">
            {history.map(item => (
              <div
                key={item.id}
                onClick={() => { setQuery(item.query); setVariables(item.variables); setActiveTab('query') }}
                className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/30 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{item.name}</span>
                  <span className="text-xs text-ide-text-secondary">{timeAgo(item.timestamp)}</span>
                </div>
                <pre className="text-xs text-ide-text-secondary mt-1 truncate max-h-8 overflow-hidden">{item.query.split('\n')[0]}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
