/**
 * Collaboration Service — CRDT-based real-time shared editing using Yjs
 *
 * Provides:
 *  - Yjs document per file per session
 *  - Awareness protocol (cursors, selections, user info)
 *  - WebSocket sync via y-websocket
 *  - Undo manager per user
 *  - Session lifecycle (create / join / leave)
 */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// ── Types ──────────────────────────────────────────────
export interface Collaborator {
  id: string
  name: string
  color: string
  cursor?: { line: number; column: number }
  selection?: { startLine: number; startCol: number; endLine: number; endCol: number }
  isActive: boolean
  lastSeen: number
}

export interface Session {
  id: string
  name: string
  hostId: string
  hostName: string
  documentPath: string
  createdAt: number
  collaborators: Collaborator[]
  isActive: boolean
}

export interface CollaborationState {
  sessionId: string | null
  isConnected: boolean
  collaborators: Collaborator[]
  localUser: Collaborator
  undoManager: Y.UndoManager | null
  error?: string
}

// ── User colors palette ────────────────────────────────
const USER_COLORS = [
  '#4285f4', '#ea4335', '#fbbc04', '#34a853',
  '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72',
  '#fcd04f', '#57bb6a', '#ff8bcb', '#a0c4ff',
  '#bdb2ff', '#ffc6ff', '#caffbf', '#fdffb6',
]

const COLOR_NAMES = [
  'Blue', 'Red', 'Yellow', 'Green', 'Orange', 'Cyan',
  'Light Blue', 'Coral', 'Gold', 'Emerald', 'Pink', 'Sky',
  'Lavender', 'Magenta', 'Mint', 'Cream',
]

// ── Singleton state ────────────────────────────────────
let wsProvider: WebsocketProvider | null = null
let ydoc: Y.Doc | null = null
let undoManager: Y.UndoManager | null = null
let awareness: any = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const fileTexts = new Map<string, Y.Text>()
const listeners = new Set<(state: CollaborationState) => void>()

let currentState: CollaborationState = {
  sessionId: null,
  isConnected: false,
  collaborators: [],
  localUser: { id: '', name: '', color: '', isActive: true, lastSeen: Date.now() },
  undoManager: null,
}

// ── Helpers ────────────────────────────────────────────
function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function randomColor(): { color: string; colorIndex: number } {
  const idx = Math.floor(Math.random() * USER_COLORS.length)
  return { color: USER_COLORS[idx], colorIndex: idx }
}

function randomName(): string {
  const adjectives = ['Swift', 'Bright', 'Bold', 'Calm', 'Keen', 'Sharp', 'Warm', 'Cool']
  const nouns = ['Fox', 'Eagle', 'Bear', 'Wolf', 'Hawk', 'Owl', 'Lynx', 'Deer']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj} ${noun}`
}

function emit() {
  listeners.forEach(fn => fn({ ...currentState }))
}

function awarenessToCollaborators(): Collaborator[] {
  if (!awareness) return []
  const states = awareness.getStates() as Map<number, any>
  const result: Collaborator[] = []
  states.forEach((state, clientId) => {
    if (clientId === awareness.clientID) return
    result.push({
      id: String(clientId),
      name: state.user?.name || 'Anonymous',
      color: state.user?.color || '#888',
      cursor: state.cursor,
      selection: state.selection,
      isActive: Date.now() - (state.lastSeen || 0) < 30_000,
      lastSeen: state.lastSeen || Date.now(),
    })
  })
  return result
}

// ── Public API ─────────────────────────────────────────

export function getCollaborationState(): CollaborationState {
  return currentState
}

export function onCollaborationChange(fn: (state: CollaborationState) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Create a new collaboration session.
 * Starts a Yjs doc + WebSocket connection on the given room name.
 */
export function createSession(opts: {
  roomName: string
  userName?: string
  documentPath?: string
}): Session {
  const { roomName, userName, documentPath } = opts

  // Cleanup any existing session
  destroySession()

  // Create Yjs document
  ydoc = new Y.Doc()
  const { color, colorIndex } = randomColor()
  const name = userName || randomName()

  // Connect to WebSocket server
  const wsUrl = `ws://localhost:1234`
  wsProvider = new WebsocketProvider(wsUrl, roomName, ydoc, {
    connect: true,
    params: { sessionId: roomName },
  })

  awareness = wsProvider.awareness

  // Set local user info
  awareness.setLocalStateField('user', {
    name,
    color,
    colorIndex,
    joinedAt: Date.now(),
  })

  // Create undo manager for local user
  undoManager = new Y.UndoManager([], {
    trackedOrigins: new Set([ydoc.clientID]),
  })

  const sessionId = generateId()
  const hostId = String(ydoc.clientID)

  const session: Session = {
    id: sessionId,
    name: roomName,
    hostId,
    hostName: name,
    documentPath: documentPath || '',
    createdAt: Date.now(),
    collaborators: [],
    isActive: true,
  }

  // Listen for awareness changes
  awareness.on('change', () => {
    currentState.collaborators = awarenessToCollaborators()
    emit()
  })

  // Listen for connection status
  wsProvider.on('sync', (isSynced: boolean) => {
    currentState.isConnected = isSynced
    emit()
  })

  wsProvider.on('status', ({ status }: { status: string }) => {
    currentState.isConnected = status === 'connected'
    if (status === 'connected') {
      reconnectAttempts = 0
    }
    emit()
  })

  // Auto-reconnect on disconnect
  wsProvider.on('connection-error', () => {
    scheduleReconnect(roomName)
  })

  wsProvider.on('connection-close', () => {
    if (currentState.sessionId) {
      scheduleReconnect(roomName)
    }
  })

  // Watch all text types for undo tracking
  ydoc.on('update', () => {
    if (undoManager) {
      undoManager.addTrackedOrigin(ydoc!.clientID)
    }
  })

  currentState = {
    sessionId,
    isConnected: wsProvider.synced,
    collaborators: awarenessToCollaborators(),
    localUser: {
      id: hostId,
      name,
      color,
      isActive: true,
      lastSeen: Date.now(),
    },
    undoManager,
  }

  emit()
  return session
}

/**
 * Join an existing collaboration session.
 */
export function joinSession(opts: {
  roomName: string
  userName?: string
}): Session {
  return createSession(opts)
}

/**
 * Get or create a Yjs Text type for a specific file path.
 * This is what gets bound to the Monaco editor.
 */
export function getYText(filePath: string): Y.Text {
  if (!ydoc) {
    ydoc = new Y.Doc()
  }
  if (!fileTexts.has(filePath)) {
    const ytext = ydoc.getText(`file:${filePath}`)
    fileTexts.set(filePath, ytext)
    return ytext
  }
  return fileTexts.get(filePath)!
}

/**
 * Bind a Y.Text to a Monaco editor model for real-time sync.
 * Uses y-monaco binding.
 */
export async function bindMonacoToYjs(
  editor: any,
  monaco: any,
  filePath: string,
  initialContent: string,
): Promise<any> {
  const ytext = getYText(filePath)
  const { MonacoBinding } = await import('y-monaco')

  const binding = new MonacoBinding(
    ytext,
    editor.getModel(),
    new Set([editor]),
    null,
  )

  // If the document is empty, seed it with initial content
  if (ytext.toString().length === 0 && initialContent) {
    ytext.insert(0, initialContent)
  }

  return binding
}

/**
 * Update local cursor position for awareness.
 */
export function updateCursor(
  line: number,
  column: number,
  selection?: { startLine: number; startCol: number; endLine: number; endCol: number },
) {
  if (!awareness) return
  awareness.setLocalStateField('cursor', { line, column })
  if (selection) {
    awareness.setLocalStateField('selection', selection)
  }
}

/**
 * Undo last local change.
 */
export function undo() {
  undoManager?.undo()
}

/**
 * Redo last undone change.
 */
export function redo() {
  undoManager?.redo()
}

/**
 * Destroy the current session and clean up all resources.
 */
function scheduleReconnect(roomName: string) {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    currentState.isConnected = false
    currentState.error = 'Max reconnection attempts reached'
    emit()
    return
  }
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
  reconnectAttempts++
  reconnectTimer = setTimeout(() => {
    if (currentState.sessionId && wsProvider) {
      wsProvider.connect()
    }
  }, delay)
}

export function destroySession() {
  // Cancel reconnect
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0

  // Destroy bindings
  fileTexts.clear()

  // Destroy undo manager
  if (undoManager) {
    undoManager.destroy()
    undoManager = null
  }

  // Destroy WebSocket provider
  if (wsProvider) {
    wsProvider.disconnect()
    wsProvider.destroy()
    wsProvider = null
  }

  // Destroy Yjs document
  if (ydoc) {
    ydoc.destroy()
    ydoc = null
  }

  awareness = null

  currentState = {
    sessionId: null,
    isConnected: false,
    collaborators: [],
    localUser: { id: '', name: '', color: '', isActive: true, lastSeen: Date.now() },
    undoManager: null,
  }

  emit()
}

/**
 * Get the underlying Yjs document (for advanced usage).
 */
export function getYDoc(): Y.Doc | null {
  return ydoc
}

/**
 * Get awareness instance.
 */
export function getAwareness(): any {
  return awareness
}

/**
 * Get all file-level Y.Text instances.
 */
export function getFileYTexts(): Map<string, Y.Text> {
  return fileTexts
}

// ── Awareness helpers for cursor decorations ───────────
export function getCollaboratorCursors(): Array<{
  userId: string
  name: string
  color: string
  line: number
  column: number
}> {
  if (!awareness) return []
  const states = awareness.getStates() as Map<number, any>
  const cursors: Array<{
    userId: string
    name: string
    color: string
    line: number
    column: number
  }> = []

  states.forEach((state, clientId) => {
    if (clientId === awareness.clientID) return
    if (state.cursor) {
      cursors.push({
        userId: String(clientId),
        name: state.user?.name || 'Anonymous',
        color: state.user?.color || '#888',
        line: state.cursor.line,
        column: state.cursor.column,
      })
    }
  })

  return cursors
}
