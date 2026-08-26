// ══════════════════════════════════════════════════════════════════════
// LazyPanel — Lazy loading wrapper for heavy panel components
//
// Only renders the component when it becomes visible, reducing
// initial bundle size and improving startup time.
// ══════════════════════════════════════════════════════════════════════

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'

interface LazyPanelProps {
  component: () => Promise<{ default: React.ComponentType<any> }>
  props?: Record<string, any>
  fallback?: React.ReactNode
}

export function LazyPanel({ component, props = {}, fallback }: LazyPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const LazyComponent = lazy(component)

  return (
    <div ref={ref} className="h-full">
      {isVisible ? (
        <Suspense fallback={fallback || <PanelSkeleton />}>
          <LazyComponent {...props} />
        </Suspense>
      ) : (
        fallback || <PanelSkeleton />
      )}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="h-full flex items-center justify-center text-ide-text-muted text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-ide-accent border-t-transparent rounded-full animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  )
}

// ── Lazy-loaded panels ────────────────────────────────────────────────

export const LazyAgentDashboard = () => (
  <LazyPanel component={() => import('../AI/AgentDashboard')} />
)

export const LazyAPIClient = () => (
  <LazyPanel component={() => import('../APIClient/APIClientPanel')} />
)

export const LazyDatabaseViewer = () => (
  <LazyPanel component={() => import('../Database/DatabaseViewer')} />
)

export const LazyDockerPanel = () => (
  <LazyPanel component={() => import('../Docker/DockerPanel')} />
)

export const LazyKubernetesPanel = () => (
  <LazyPanel component={() => import('../KubernetesDashboard/KubernetesDashboardPanel')} />
)

export const LazySecurityScanner = () => (
  <LazyPanel component={() => import('../SecurityScanner/SecurityScannerPanel')} />
)

export const LazyPerformanceProfiler = () => (
  <LazyPanel component={() => import('../PerformanceProfiler/PerformanceProfilerPanel')} />
)
