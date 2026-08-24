import React, { useState } from 'react'
import { ChevronRight, File, Folder, Hash } from 'lucide-react'

interface BreadcrumbItem {
  name: string
  path: string
  type: 'file' | 'folder' | 'symbol'
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onItemClick?: (item: BreadcrumbItem) => void
}

export default function Breadcrumb({ items, onItemClick }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 bg-ide-surface border-b border-ide-border text-xs overflow-x-auto">
      {items.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && (
            <ChevronRight className="w-3 h-3 text-ide-text-muted flex-shrink-0" />
          )}
          <button
            onClick={() => onItemClick?.(item)}
            className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-ide-border/50 text-ide-text-muted hover:text-ide-text transition-colors whitespace-nowrap"
          >
            {item.type === 'file' && <File className="w-3 h-3" />}
            {item.type === 'folder' && <Folder className="w-3 h-3" />}
            {item.type === 'symbol' && <Hash className="w-3 h-3" />}
            <span>{item.name}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

// Hook to generate breadcrumbs from file path
export function useBreadcrumbs(filePath: string, symbolName?: string): BreadcrumbItem[] {
  if (!filePath) return []

  const parts = filePath.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1
    items.push({
      name: part,
      path: parts.slice(0, index + 1).join('/'),
      type: isLast ? 'file' : 'folder',
    })
  })

  if (symbolName) {
    items.push({
      name: symbolName,
      path: `${filePath}#${symbolName}`,
      type: 'symbol',
    })
  }

  return items
}
