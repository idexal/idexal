/**
 * CollaborativeCursors — Renders remote user cursors and selections
 * as Monaco editor decorations. Updates in real-time via Yjs awareness.
 */

import { useEffect, useRef, useCallback } from 'react'
import { getCollaboratorCursors, onCollaborationChange } from '../../services/collaborationService'

const CURSOR_STYLE = 'cursor-collaborative'
const SELECTION_STYLE = 'selection-collaborative'

/**
 * Attach collaborative cursor decorations to a Monaco editor instance.
 * Call this once after the editor mounts. Returns a cleanup function.
 */
export function useCollaborativeCursors(
  editor: any,
  monaco: any,
  enabled: boolean,
): () => void {
  const decorationsRef = useRef<any[]>([])

  const updateDecorations = useCallback(() => {
    if (!editor || !monaco || !enabled) return

    const cursors = getCollaboratorCursors()
    const newDecorations: any[] = []

    cursors.forEach((cursor) => {
      // Cursor line decoration (the little vertical bar)
      newDecorations.push({
        range: new monaco.Range(
          cursor.line,
          cursor.column,
          cursor.line,
          cursor.column + 1,
        ),
        options: {
          className: CURSOR_STYLE,
          beforeContentClassName: `cursor-line-${cursor.color.replace('#', '')}`,
          stickiness: 1, // NeverStickiness
          hoverMessage: { value: `**${cursor.name}** (cursor)` },
          after: {
            content: cursor.name,
            inlineClassName: `cursor-label-${cursor.color.replace('#', '')}`,
          },
        },
      })

      // Selection highlight (if the collaborator has a selection)
      // For now we only render the cursor line
    })

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    )
  }, [editor, monaco, enabled])

  useEffect(() => {
    if (!enabled) return

    // Initial render
    updateDecorations()

    // Subscribe to awareness changes
    const unsub = onCollaborationChange(() => {
      updateDecorations()
    })

    // Also update on cursor move (throttled)
    const disposable = editor?.onDidChangeCursorPosition?.(() => {
      // Don't need to re-render decorations on local cursor change,
      // but awareness changes from other users will trigger via the subscription
    })

    return () => {
      unsub()
      disposable?.dispose()
      // Clear decorations on cleanup
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, [])
        decorationsRef.current = []
      }
    }
  }, [editor, monaco, enabled, updateDecorations])

  return () => {
    if (editor && decorationsRef.current.length > 0) {
      editor.deltaDecorations(decorationsRef.current, [])
      decorationsRef.current = []
    }
  }
}

/**
 * Inject collaborative cursor CSS styles into the document head.
 * Call once at app startup.
 */
export function injectCollaborativeCursorStyles(): void {
  if (document.getElementById('collab-cursor-styles')) return

  const style = document.createElement('style')
  style.id = 'collab-cursor-styles'
  style.textContent = `
    /* Remote cursor line indicator */
    .cursor-collaborative {
      border-left: 2px solid currentColor;
      margin-left: -1px;
    }

    /* Dynamic cursor colors - generated for each user */
    ${generateCursorColorCSS()}

    /* Remote cursor name label */
    .cursor-label-red,
    .cursor-label-blue,
    .cursor-label-green,
    .cursor-label-yellow,
    .cursor-label-orange,
    .cursor-label-cyan,
    .cursor-label-pink,
    .cursor-label-purple {
      position: relative;
      top: -1.2em;
      left: 2px;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 3px 3px 3px 0;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
      line-height: 1.2;
    }
  `
  document.head.appendChild(style)
}

function generateCursorColorCSS(): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    '4285f4': { bg: '#4285f4', fg: '#fff' },
    'ea4335': { bg: '#ea4335', fg: '#fff' },
    'fbbc04': { bg: '#fbbc04', fg: '#000' },
    '34a853': { bg: '#34a853', fg: '#fff' },
    'ff6d01': { bg: '#ff6d01', fg: '#fff' },
    '46bdc6': { bg: '#46bdc6', fg: '#fff' },
    '7baaf7': { bg: '#7baaf7', fg: '#000' },
    'f07b72': { bg: '#f07b72', fg: '#fff' },
    'fcd04f': { bg: '#fcd04f', fg: '#000' },
    '57bb6a': { bg: '#57bb6a', fg: '#fff' },
    'ff8bcb': { bg: '#ff8bcb', fg: '#000' },
    'a0c4ff': { bg: '#a0c4ff', fg: '#000' },
    'bdb2ff': { bg: '#bdb2ff', fg: '#000' },
    'ffc6ff': { bg: '#ffc6ff', fg: '#000' },
    'caffbf': { bg: '#caffbf', fg: '#000' },
    'fdffb6': { bg: '#fdffb6', fg: '#000' },
  }

  let css = ''
  for (const [hex, { bg, fg }] of Object.entries(colors)) {
    css += `
      .cursor-line-${hex} { border-left-color: ${bg} !important; }
      .cursor-label-${hex} {
        background: ${bg} !important;
        color: ${fg} !important;
      }
    `
  }
  return css
}
