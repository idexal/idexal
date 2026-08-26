import React, { useState, useMemo } from 'react'
import {
  FaBell, FaCode, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTrash, FaFilter, FaClock, FaTimes, FaCog, FaChevronDown, FaChevronRight
} from '../Icon'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  source: string
  timestamp: Date
  read: boolean
  actions?: { label: string; onClick: string }[]
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'success', title: 'Build Successful', message: 'Project built in 2.3s with no errors', source: 'Task Runner', timestamp: new Date(Date.now() - 120000), read: false },
  { id: '2', type: 'error', title: 'TypeScript Error', message: "Property 'name' does not exist on type 'Props'", source: 'FaCode Intelligence', timestamp: new Date(Date.now() - 300000), read: false },
  { id: '3', type: 'warning', title: 'Outdated Dependencies', message: '3 packages have updates available: react, typescript, vite', source: 'Package Manager', timestamp: new Date(Date.now() - 600000), read: true },
  { id: '4', type: 'info', title: 'Git: New Branch', message: 'Switched to branch feature/new-api', source: 'Git', timestamp: new Date(Date.now() - 900000), read: true },
  { id: '5', type: 'success', title: 'Tests Passed', message: '27/27 tests passed in 1.1s', source: 'Test Runner', timestamp: new Date(Date.now() - 1200000), read: true },
  { id: '6', type: 'error', title: 'Docker: Container Stopped', message: 'Container "idexal-db" exited with code 1', source: 'Docker', timestamp: new Date(Date.now() - 1800000), read: false },
  { id: '7', type: 'info', title: 'Extension Updated', message: 'Git Lens updated to v14.2.0', source: 'Extensions', timestamp: new Date(Date.now() - 3600000), read: true },
  { id: '8', type: 'warning', title: 'Memory Usage High', message: 'IDE memory usage at 78% (1.2GB)', source: 'Performance', timestamp: new Date(Date.now() - 5400000), read: true },
  { id: '9', type: 'success', title: 'Deployment Complete', message: 'Application deployed to staging environment', source: 'DevOps', timestamp: new Date(Date.now() - 7200000), read: true },
  { id: '10', type: 'info', title: 'FaCode Review Complete', message: '3 suggestions found in PR #42', source: 'AI Review', timestamp: new Date(Date.now() - 10800000), read: true },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationCenter({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread' | 'error' | 'warning' | 'success' | 'info'>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread') return !n.read
      if (filter === 'all') return true
      return n.type === filter
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [notifications, filter])

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    errors: notifications.filter(n => n.type === 'error').length,
    warnings: notifications.filter(n => n.type === 'warning').length,
    success: notifications.filter(n => n.type === 'success').length,
    info: notifications.filter(n => n.type === 'info').length,
  }), [notifications])

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'error': return <FaExclamationCircle size={14} className="text-red-400" />
      case 'warning': return <FaExclamationTriangle size={14} className="text-yellow-400" />
      case 'success': return <FaCheckCircle size={14} className="text-green-400" />
      case 'info': return <FaInfoCircle size={14} className="text-blue-400" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBell size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold">Notifications</span>
          {stats.unread > 0 && (
            <span className="text-xs bg-red-500 text-white px-1.5 rounded-full">{stats.unread}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <FaCode size={14} /> : <FaCode size={14} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"
          >
            <FaCog size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-ide-border bg-ide-bg-secondary/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Show notifications for:</span>
          </div>
          {['Errors', 'Warnings', 'Success', 'Info'].map(type => (
            <label key={type} className="flex items-center gap-2 text-xs text-ide-text-secondary cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-purple-500" />
              {type}
            </label>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
        {[
          { key: 'all', label: 'All', count: stats.total },
          { key: 'unread', label: 'Unread', count: stats.unread },
          { key: 'error', label: 'Errors', count: stats.errors },
          { key: 'warning', label: 'Warnings', count: stats.warnings },
          { key: 'success', label: 'Success', count: stats.success },
          { key: 'info', label: 'Info', count: stats.info },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
              filter === f.key
                ? 'bg-purple-600 text-white'
                : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {f.label} {f.count > 0 && `(${f.count})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={markAllRead} className="text-xs text-purple-400 hover:underline whitespace-nowrap">
          Mark all read
        </button>
        <button onClick={clearAll} className="text-xs text-red-400 hover:underline whitespace-nowrap">
          Clear all
        </button>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-ide-text-secondary">
            <FaCode size={24} className="mb-2 opacity-50" />
            <span className="text-xs">No notifications</span>
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              className={`px-3 py-2.5 border-b border-ide-border/50 hover:bg-ide-bg-secondary/30 cursor-pointer transition-colors ${
                !n.read ? 'bg-ide-bg-secondary/20 border-l-2' : 'border-l-2 border-l-transparent'
              } ${
                n.type === 'error' ? 'border-l-red-500' :
                n.type === 'warning' ? 'border-l-yellow-500' :
                n.type === 'success' ? 'border-l-green-500' :
                'border-l-blue-500'
              }`}
              onClick={() => {
                markAsRead(n.id)
                setExpandedId(expandedId === n.id ? null : n.id)
              }}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${!n.read ? 'text-ide-text' : 'text-ide-text-secondary'}`}>
                      {n.title}
                    </span>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-ide-text-secondary mt-0.5">{n.message}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-ide-text-secondary/60 flex items-center gap-0.5">
                      <FaClock size={10} />
                      {timeAgo(n.timestamp)}
                    </span>
                    <span className="text-xs text-ide-text-secondary/60">•</span>
                    <span className="text-xs text-ide-text-secondary/60">{n.source}</span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeNotification(n.id) }}
                  className="p-0.5 hover:bg-red-500/20 rounded text-ide-text-secondary hover:text-red-400 flex-shrink-0"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
