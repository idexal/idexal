import React, { useState, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  timestamp: number
}

interface NotificationState {
  notifications: Notification[]
  add: (notification: Omit<Notification, 'id' | 'timestamp'>) => string
  remove: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  add: (notification) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
    }

    set((state) => ({
      notifications: [...state.notifications, newNotification].slice(-10), // Keep last 10
    }))

    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().remove(id)
      }, notification.duration || 5000)
    }

    return id
  },

  remove: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  clear: () => set({ notifications: [] }),
}))

// Convenience functions
export const notify = {
  info: (title: string, message?: string) =>
    useNotificationStore.getState().add({ type: 'info', title, message }),
  success: (title: string, message?: string) =>
    useNotificationStore.getState().add({ type: 'success', title, message }),
  warning: (title: string, message?: string) =>
    useNotificationStore.getState().add({ type: 'warning', title, message }),
  error: (title: string, message?: string) =>
    useNotificationStore.getState().add({ type: 'error', title, message, duration: 10000 }),
}

// Notification Toast Component
export function NotificationToast() {
  const { notifications, remove } = useNotificationStore()

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onRemove={remove} />
      ))}
    </div>
  )
}

function NotificationItem({ notification, onRemove }: { notification: Notification; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(notification.id), 200)
  }

  const icons = {
    info: <Info className="w-4 h-4 text-ide-accent" />,
    success: <CheckCircle className="w-4 h-4 text-ide-success" />,
    warning: <AlertTriangle className="w-4 h-4 text-ide-warning" />,
    error: <AlertCircle className="w-4 h-4 text-ide-error" />,
  }

  const borderColors = {
    info: 'border-l-ide-accent',
    success: 'border-l-ide-success',
    warning: 'border-l-ide-warning',
    error: 'border-l-ide-error',
  }

  return (
    <div
      className={`bg-ide-surface border border-ide-border ${borderColors[notification.type]} border-l-4 rounded-lg shadow-lg p-3 transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[notification.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ide-text">{notification.title}</div>
          {notification.message && (
            <div className="text-xs text-ide-text-muted mt-0.5">{notification.message}</div>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="text-xs text-ide-accent hover:text-ide-accent-hover mt-1"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button onClick={handleRemove} className="text-ide-text-muted hover:text-ide-text">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Notification Bell Component
export function NotificationBell() {
  const [showPanel, setShowPanel] = useState(false)
  const { notifications, clear } = useNotificationStore()

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="p-1.5 rounded hover:bg-ide-border relative"
      >
        <Bell className="w-4 h-4 text-ide-text-muted" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-ide-accent text-white text-[9px] rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-ide-surface border border-ide-border rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
            <span className="text-sm font-medium text-ide-text">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clear} className="text-xs text-ide-text-muted hover:text-ide-text">
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-ide-text-muted">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-3 py-2 border-b border-ide-border last:border-0">
                  <div className="text-sm text-ide-text">{n.title}</div>
                  {n.message && <div className="text-xs text-ide-text-muted">{n.message}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
