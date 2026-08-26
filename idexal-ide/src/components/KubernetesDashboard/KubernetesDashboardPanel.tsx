import React, { useState, useMemo } from 'react'
import {
  FaServer, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle, FaSync, FaChevronDown, FaChevronRight, FaBox, FaDatabase, FaGlobe, FaCode, FaTerminal, FaTrash, FaUndo, FaEye
} from '../Icon'

interface K8sResource {
  kind: string
  name: string
  namespace: string
  status: string
  restarts: number
  age: string
  cpu: string
  memory: string
  ready?: string
  selectors?: Record<string, string>
  ports?: string
  clusterIP?: string
  type?: string
}

interface ClusterInfo {
  name: string
  version: string
  provider: string
  nodes: number
  pods: number
  services: number
  namespaces: number
}

const MOCK_CLUSTER: ClusterInfo = {
  name: 'idexal-production',
  version: 'v1.28.3',
  provider: 'AWS EKS',
  nodes: 3,
  pods: 24,
  services: 12,
  namespaces: 5,
}

const MOCK_PODS: K8sResource[] = [
  { kind: 'Pod', name: 'api-server-7d8f9c6b4-x2k9m', namespace: 'production', status: 'Running', restarts: 0, age: '3d', cpu: '120m', memory: '256Mi', ready: '1/1' },
  { kind: 'Pod', name: 'api-server-7d8f9c6b4-y3j8n', namespace: 'production', status: 'Running', restarts: 0, age: '3d', cpu: '95m', memory: '230Mi', ready: '1/1' },
  { kind: 'Pod', name: 'worker-5c4d3e2f1-a1b2c', namespace: 'production', status: 'Running', restarts: 1, age: '2d', cpu: '250m', memory: '512Mi', ready: '1/1' },
  { kind: 'Pod', name: 'redis-6f7g8h9j0-d3e4f', namespace: 'production', status: 'Running', restarts: 0, age: '7d', cpu: '50m', memory: '128Mi', ready: '1/1' },
  { kind: 'Pod', name: 'postgres-1a2b3c4d5-e6f7g', namespace: 'production', status: 'Running', restarts: 0, age: '14d', cpu: '200m', memory: '1Gi', ready: '1/1' },
  { kind: 'Pod', name: 'nginx-proxy-h8i9j0k1-l2m3n', namespace: 'production', status: 'Running', restarts: 0, age: '5d', cpu: '10m', memory: '32Mi', ready: '1/1' },
  { kind: 'Pod', name: 'cron-job-o4p5q6r7-s8t9u', namespace: 'production', status: 'Completed', restarts: 0, age: '1h', cpu: '0m', memory: '0Mi', ready: '0/1' },
  { kind: 'Pod', name: 'monitoring-v1w2x3y4-z5a6b', namespace: 'monitoring', status: 'Running', restarts: 2, age: '1d', cpu: '180m', memory: '384Mi', ready: '1/1' },
]

const MOCK_SERVICES: K8sResource[] = [
  { kind: 'Service', name: 'api-service', namespace: 'production', status: 'Active', restarts: 0, age: '30d', cpu: '-', memory: '-', ports: '8080/TCP', clusterIP: '10.0.1.100', type: 'ClusterIP' },
  { kind: 'Service', name: 'redis-service', namespace: 'production', status: 'Active', restarts: 0, age: '30d', cpu: '-', memory: '-', ports: '6379/TCP', clusterIP: '10.0.1.101', type: 'ClusterIP' },
  { kind: 'Service', name: 'postgres-service', namespace: 'production', status: 'Active', restarts: 0, age: '30d', cpu: '-', memory: '-', ports: '5432/TCP', clusterIP: '10.0.1.102', type: 'ClusterIP' },
  { kind: 'Service', name: 'ingress-nginx', namespace: 'ingress', status: 'Active', restarts: 0, age: '60d', cpu: '-', memory: '-', ports: '80, 443', clusterIP: '10.0.0.10', type: 'LoadBalancer' },
  { kind: 'Service', name: 'prometheus', namespace: 'monitoring', status: 'Active', restarts: 0, age: '15d', cpu: '-', memory: '-', ports: '9090/TCP', clusterIP: '10.0.2.50', type: 'ClusterIP' },
]

const MOCK_DEPLOYMENTS: K8sResource[] = [
  { kind: 'Deployment', name: 'api-server', namespace: 'production', status: 'Available', restarts: 0, age: '30d', cpu: '215m', memory: '486Mi', ready: '2/2' },
  { kind: 'Deployment', name: 'worker', namespace: 'production', status: 'Available', restarts: 0, age: '15d', cpu: '250m', memory: '512Mi', ready: '1/1' },
  { kind: 'Deployment', name: 'nginx-proxy', namespace: 'production', status: 'Available', restarts: 0, age: '60d', cpu: '10m', memory: '32Mi', ready: '1/1' },
  { kind: 'Deployment', name: 'monitoring', namespace: 'monitoring', status: 'Progressing', restarts: 2, age: '7d', cpu: '180m', memory: '384Mi', ready: '1/1' },
]

const STATUS_COLORS: Record<string, string> = {
  Running: 'text-green-400', Active: 'text-green-400', Available: 'text-green-400',
  Completed: 'text-blue-400', Pending: 'text-yellow-400', Progressing: 'text-yellow-400',
  Failed: 'text-red-400', CrashLoopBackOff: 'text-red-400',
}

export default function KubernetesDashboardPanel({ onClose }: { onClose: () => void }) {
  const [pods] = useState(MOCK_PODS)
  const [services] = useState(MOCK_SERVICES)
  const [deployments] = useState(MOCK_DEPLOYMENTS)
  const [activeTab, setActiveTab] = useState<'pods' | 'deployments' | 'services' | 'cluster'>('pods')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [namespace, setNamespace] = useState('All')

  const namespaces = useMemo(() => ['All', ...new Set([...pods, ...services, ...deployments].map(r => r.namespace))], [pods, services, deployments])

  const filtered = useMemo(() => {
    const items = activeTab === 'pods' ? pods : activeTab === 'deployments' ? deployments : services
    return items.filter(r => namespace === 'All' || r.namespace === namespace)
  }, [activeTab, pods, services, deployments, namespace])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaServer size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold">Kubernetes</span>
          <span className="text-xs text-green-400">● {MOCK_CLUSTER.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><FaSync size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Cluster Info */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Nodes', value: MOCK_CLUSTER.nodes, color: 'text-indigo-400' },
          { label: 'Pods', value: MOCK_CLUSTER.pods, color: 'text-green-400' },
          { label: 'Services', value: MOCK_CLUSTER.services, color: 'text-blue-400' },
          { label: 'Namespaces', value: MOCK_CLUSTER.namespaces, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Namespace filter */}
      <div className="flex items-center border-b border-ide-border">
        <div className="flex flex-1">
          {[{ key: 'pods' as const, label: `Pods (${pods.length})` }, { key: 'deployments' as const, label: `Deploy (${deployments.length})` }, { key: 'services' as const, label: `Services (${services.length})` }, { key: 'cluster' as const, label: 'Cluster' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1.5 text-xs border-b-2 ${activeTab === tab.key ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={namespace} onChange={e => setNamespace(e.target.value)} className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-0.5 text-xs mr-2">
          {namespaces.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'cluster' ? (
          <div className="p-3 space-y-3">
            {[
              { label: 'Cluster Name', value: MOCK_CLUSTER.name },
              { label: 'Version', value: MOCK_CLUSTER.version },
              { label: 'Provider', value: MOCK_CLUSTER.provider },
              { label: 'Endpoint', value: 'https://idexal-production.eks.amazonaws.com' },
              { label: 'DNS', value: 'idexal.internal' },
              { label: 'Region', value: 'us-east-1' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-ide-text-secondary">{item.label}</span>
                <span className="font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-ide-text-secondary font-semibold border-b border-ide-border">
              <span className="w-4"></span>
              <span className="flex-1">Name</span>
              <span className="w-16">Status</span>
              {activeTab === 'pods' && <><span className="w-8 text-center">Ready</span><span className="w-8 text-center">Restarts</span></>}
              <span className="w-16 text-right">CPU</span>
              <span className="w-16 text-right">Memory</span>
              <span className="w-12 text-right">Age</span>
            </div>
            {filtered.map(item => (
              <div key={item.name}>
                <div onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)} className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer text-xs">
                  {expandedItem === item.name ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                  <span className="flex-1 font-mono truncate">{item.name}</span>
                  <span className={`w-16 ${STATUS_COLORS[item.status] || 'text-ide-text-secondary'}`}>{item.status}</span>
                  {activeTab === 'pods' && (
                    <>
                      <span className="w-8 text-center text-green-400">{item.ready}</span>
                      <span className={`w-8 text-center ${item.restarts > 0 ? 'text-yellow-400' : 'text-ide-text-secondary'}`}>{item.restarts}</span>
                    </>
                  )}
                  <span className="w-16 text-right text-ide-text-secondary">{item.cpu}</span>
                  <span className="w-16 text-right text-ide-text-secondary">{item.memory}</span>
                  <span className="w-12 text-right text-ide-text-secondary">{item.age}</span>
                </div>
                {expandedItem === item.name && (
                  <div className="px-6 pb-2 bg-ide-bg-secondary/10 space-y-1 text-xs">
                    <div><span className="text-ide-text-secondary">Namespace:</span> {item.namespace}</div>
                    {item.ports && <div><span className="text-ide-text-secondary">Ports:</span> {item.ports}</div>}
                    {item.clusterIP && <div><span className="text-ide-text-secondary">ClusterIP:</span> <span className="font-mono">{item.clusterIP}</span></div>}
                    {item.type && <div><span className="text-ide-text-secondary">Type:</span> {item.type}</div>}
                    {activeTab === 'pods' && (
                      <div className="flex gap-1 mt-1">
                        <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"><FaTerminal size={8} /> Logs</button>
                        <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"><FaEye size={8} /> Exec</button>
                        <button className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 flex items-center gap-0.5"><FaUndo size={8} /> Restart</button>
                        <button className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 flex items-center gap-0.5"><FaTrash size={8} /> Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
