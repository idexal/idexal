export type Role = 'super' | 'admin' | 'manager' | 'developer' | 'team' | 'user'
export type UserStatus = 'active' | 'banned' | 'pending'

export interface MockUser {
  id: number
  name: string
  email: string
  plan: 'Free' | 'Pro' | 'Team' | 'Enterprise'
  status: UserStatus
  role: Role
  joined: string
  country: string
  apiCalls: number
  storageGb: number
}

export interface Invoice {
  id: string
  user: string
  amount: number
  date: string
  method: 'Visa •••• 4242' | 'PayPal' | 'Crypto'
  status: 'paid' | 'failed' | 'refunded'
}

export type ProviderKind = 'AI' | 'Embedding' | 'Search' | 'Rerank'

export interface AIModel {
  id: string
  chat: boolean
  embedding: boolean
  costPer1k: number
  active: boolean
}

export interface Provider {
  id: string
  name: string
  kind: ProviderKind
  status: 'connected' | 'error' | 'disabled'
  models: string[]
  usage30d: number
  cost: number
  fallback?: string[]
  apiKeyMasked: string
  latencyMs: number
  history: { day: string; calls: number }[]
}

export interface BlogPost {
  slug: string
  title: string
  titleAr: string
  excerpt: string
  excerptAr: string
  body: string[]
  bodyAr: string[]
  date: string
  category: 'Product' | 'Engineering' | 'Tutorials'
  readMinutes: number
  author: string
}

export interface Ticket {
  id: string
  subject: string
  requester: string
  assignee: string
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'pending' | 'resolved'
  ageHours: number
}

export interface TeamMemberPerf {
  name: string
  tickets: number
  avgTimeH: number
  rating: number
  online: boolean
}

export interface Task {
  id: number
  title: string
  done: boolean
  priority: 'low' | 'medium' | 'high'
  due: string
}

export interface ApiKeyItem {
  id: string
  name: string
  masked: string
  created: string
  lastUsed: string
  requests: number
}

export interface PluginItem {
  id: string
  name: string
  installs: number
  rating: number
  revenue: number
  status: 'live' | 'review' | 'draft'
}
