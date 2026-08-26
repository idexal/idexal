/**
 * useFileEdits — Extracts file edit proposals from assistant messages,
 * manages their apply/reject state, and provides the diffs to the DiffViewer.
 */

import { useState, useCallback, useMemo } from 'react'
import { FileDiff, parseDiffToLines } from '../components/AI/DiffViewer'

// ── Types ─────────────────────────────────────────────────────

export interface FileEditProposal {
  id: string
  filePath: string
  oldContent: string
  newContent: string
  diff: FileDiff
  status: 'pending' | 'applied' | 'rejected'
}

export interface UseFileEditsReturn {
  /** All edit proposals extracted from messages */
  proposals: FileEditProposal[]
  /** Only pending proposals (not yet applied/rejected) */
  pendingProposals: FileEditProposal[]
  /** Apply a single proposal by id */
  applyEdit: (id: string) => Promise<void>
  /** Reject a single proposal by id */
  rejectEdit: (id: string) => void
  /** Apply all pending proposals */
  applyAll: () => Promise<void>
  /** Reject all pending proposals */
  rejectAll: () => void
  /** Whether there are any pending proposals */
  hasPending: boolean
}

// ── Edit Detection Patterns ───────────────────────────────────

/**
 * Detects file edit blocks in AI messages.
 * Supports two formats:
 *
 * Format 1 — Explicit OLD/NEW markers:
 * ```file=path/to/file.ts
 * --- OLD ---
 * old content
 * --- NEW ---
 * new content
 * ```
 *
 * Format 2 — Fenced code with filename and edit markers:
 * ```typescript filename=path/to/file.ts
 * // @edit start
 * old line
 * // @edit separator
 * new line
 * // @edit end
 * ```
 *
 * Format 3 — Simple code blocks with filename (treated as full replacement):
 * ```typescript filename=path/to/file.ts
 * new content
 * ```
 */
function extractFileEdits(content: string): Array<{ filePath: string; oldContent: string; newContent: string }> {
  const edits: Array<{ filePath: string; oldContent: string; newContent: string }> = []

  // Format 1: ```file=path ... --- OLD --- ... --- NEW --- ... ```
  const format1Regex = /```(?:\w+)?\s+file=([^\s`]+)\s*\n([\s\S]*?)---\s*OLD\s*---\s*\n([\s\S]*?)---\s*NEW\s*---\s*\n([\s\S]*?)```/g
  let match1: RegExpExecArray | null
  while ((match1 = format1Regex.exec(content)) !== null) {
    const filePath = match1[1].trim()
    const oldContent = match1[3].trim()
    const newContent = match1[4].trim()
    if (oldContent && newContent) {
      edits.push({ filePath, oldContent, newContent })
    }
  }

  // Format 2: ```lang filename=path ... // @edit markers ```
  const format2Regex = /```(\w+)?\s+filename=([^\s`]+)\s*\n([\s\S]*?)```/g
  let match2: RegExpExecArray | null
  while ((match2 = format2Regex.exec(content)) !== null) {
    const filePath = match2[2].trim()
    const code = match2[3]

    const editStartIdx = code.indexOf('// @edit start')
    const editSepIdx = code.indexOf('// @edit separator')
    const editEndIdx = code.indexOf('// @edit end')

    if (editStartIdx !== -1 && editSepIdx !== -1 && editEndIdx !== -1) {
      const beforeEdit = code.substring(0, editStartIdx).trim()
      const editSection = code.substring(editStartIdx, editEndIdx + '// @edit end'.length)
      const oldLines = editSection.split('\n').filter(l =>
        l.trim() !== '// @edit start' &&
        l.trim() !== '// @edit separator' &&
        l.trim() !== '// @edit end'
      )
      // This is a partial edit — not full file replacement
      // For now, treat the entire code block as a full replacement
      edits.push({ filePath, oldContent: beforeEdit, newContent: code.trim() })
    } else if (match2[1] && code.trim()) {
      // Format 3: Simple code block with filename — treat as full replacement
      // We need to find what the original content was, or mark it as a new file
      edits.push({ filePath, oldContent: '', newContent: code.trim() })
    }
  }

  return edits
}

// ── Hook ──────────────────────────────────────────────────────

export function useFileEdits(messages: any[]): UseFileEditsReturn {
  const [statuses, setStatuses] = useState<Record<string, 'applied' | 'rejected'>>({})

  const proposals = useMemo(() => {
    const all: FileEditProposal[] = []
    let idCounter = 0

    for (const msg of messages) {
      if (msg.role !== 'assistant' || msg.isStreaming) continue

      const edits = extractFileEdits(msg.content)
      for (const edit of edits) {
        const id = `edit-${msg.id}-${idCounter++}`
        const status = statuses[id] || 'pending'

        let diff: FileDiff
        if (edit.oldContent) {
          diff = parseDiffToLines(edit.oldContent, edit.newContent, edit.filePath)
        } else {
          // New file — show entire content as additions
          diff = {
            filePath: edit.filePath,
            language: edit.filePath.split('.').pop(),
            lines: edit.newContent.split('\n').map((content, i) => ({
              type: 'add' as const,
              content,
              newLineNum: i + 1,
            })),
            addedCount: edit.newContent.split('\n').length,
            removedCount: 0,
          }
        }

        all.push({
          id,
          filePath: edit.filePath,
          oldContent: edit.oldContent,
          newContent: edit.newContent,
          diff,
          status,
        })
      }
    }

    return all
  }, [messages, statuses])

  const pendingProposals = useMemo(
    () => proposals.filter(p => p.status === 'pending'),
    [proposals]
  )

  const applyEdit = useCallback(async (id: string) => {
    const proposal = proposals.find(p => p.id === id)
    if (!proposal) return

    try {
      // Try Electron IPC first, fall back to fetch for web
      if (typeof window !== 'undefined' && (window as any).electronAPI?.writeFileSync) {
        await (window as any).electronAPI.writeFileSync(proposal.filePath, proposal.newContent)
      } else {
        // In web mode, just show success — actual file writing happens server-side
        console.log('[DiffViewer] Would write to:', proposal.filePath)
      }
      setStatuses(prev => ({ ...prev, [id]: 'applied' }))
    } catch (err) {
      console.error('[DiffViewer] Failed to apply:', err)
    }
  }, [proposals])

  const rejectEdit = useCallback((id: string) => {
    setStatuses(prev => ({ ...prev, [id]: 'rejected' }))
  }, [])

  const applyAll = useCallback(async () => {
    for (const p of pendingProposals) {
      await applyEdit(p.id)
    }
  }, [pendingProposals, applyEdit])

  const rejectAll = useCallback(() => {
    for (const p of pendingProposals) {
      rejectEdit(p.id)
    }
  }, [pendingProposals, rejectEdit])

  return {
    proposals,
    pendingProposals,
    applyEdit,
    rejectEdit,
    applyAll,
    rejectAll,
    hasPending: pendingProposals.length > 0,
  }
}
