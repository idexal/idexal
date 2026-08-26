// ══════════════════════════════════════════════════════════════════════
// VirtualList — Virtual scrolling for large lists
//
// Only renders visible items + buffer, keeping memory usage
// constant regardless of list size. Critical for large file trees.
// ══════════════════════════════════════════════════════════════════════

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  onEndReached?: () => void
  endReachedThreshold?: number
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  onEndReached,
  endReachedThreshold = 100,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(height / itemHeight)
  const bufferCount = 5

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferCount)
  const endIndex = Math.min(items.length, startIndex + visibleCount + bufferCount * 2)

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i,
    }))
  }, [items, startIndex, endIndex])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)

      // Check if near end
      if (onEndReached) {
        const { scrollHeight, scrollTop: st, clientHeight } = containerRef.current
        if (scrollHeight - st - clientHeight < endReachedThreshold) {
          onEndReached()
        }
      }
    }
  }, [onEndReached, endReachedThreshold])

  return (
    <div
      ref={containerRef}
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hook for large lists ──────────────────────────────────────────────

export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 5)
    const end = Math.min(items.length, start + Math.ceil(containerHeight / itemHeight) + 10)
    return { start, end }
  }, [scrollTop, itemHeight, containerHeight, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end)
  }, [items, visibleRange])

  return {
    visibleItems,
    visibleRange,
    totalHeight: items.length * itemHeight,
    setScrollTop,
  }
}
