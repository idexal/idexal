/**
 * Keyboard Shortcuts Service
 */

export interface KeyboardShortcut {
  id: string
  name: string
  description: string
  shortcut: string
  category: string
  action: string
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  key: string
}

const SHORTCUTS: KeyboardShortcut[] = [
  // File operations
  { id: 'file.save', name: 'Save', description: 'Save current file', shortcut: '⌘S', category: 'File', action: 'save', key: 's', ctrlKey: true },
  { id: 'file.saveAll', name: 'Save All', description: 'Save all files', shortcut: '⌘⇧S', category: 'File', action: 'saveAll', key: 's', ctrlKey: true, shiftKey: true },
  { id: 'file.open', name: 'Open File', description: 'Open a file', shortcut: '⌘O', category: 'File', action: 'open', key: 'o', ctrlKey: true },
  { id: 'file.new', name: 'New File', description: 'Create a new file', shortcut: '⌘N', category: 'File', action: 'new', key: 'n', ctrlKey: true },

  // Edit operations
  { id: 'edit.undo', name: 'Undo', description: 'Undo last action', shortcut: '⌘Z', category: 'Edit', action: 'undo', key: 'z', ctrlKey: true },
  { id: 'edit.redo', name: 'Redo', description: 'Redo last action', shortcut: '⌘⇧Z', category: 'Edit', action: 'redo', key: 'z', ctrlKey: true, shiftKey: true },
  { id: 'edit.find', name: 'Find', description: 'Find in file', shortcut: '⌘F', category: 'Edit', action: 'find', key: 'f', ctrlKey: true },
  { id: 'edit.replace', name: 'Replace', description: 'Find and replace', shortcut: '⌘H', category: 'Edit', action: 'replace', key: 'h', ctrlKey: true },
  { id: 'edit.format', name: 'Format Document', description: 'Format current document', shortcut: '⇧⌥F', category: 'Edit', action: 'format', key: 'f', shiftKey: true, altKey: true },

  // View operations
  { id: 'view.sidebar', name: 'Toggle Sidebar', description: 'Show/hide sidebar', shortcut: '⌘B', category: 'View', action: 'toggleSidebar', key: 'b', ctrlKey: true },
  { id: 'view.terminal', name: 'Toggle Terminal', description: 'Show/hide terminal', shortcut: '⌘`', category: 'View', action: 'toggleTerminal', key: '`', ctrlKey: true },
  { id: 'view.chat', name: 'Toggle AI Chat', description: 'Show/hide AI chat', shortcut: '⌘⇧A', category: 'View', action: 'toggleChat', key: 'a', ctrlKey: true, shiftKey: true },
  { id: 'view.git', name: 'Toggle Git Panel', description: 'Show/hide Git panel', shortcut: '⌘⇧G', category: 'View', action: 'toggleGit', key: 'g', ctrlKey: true, shiftKey: true },

  // Navigation
  { id: 'nav.command', name: 'Command Palette', description: 'Open command palette', shortcut: '⌘K', category: 'Navigation', action: 'commandPalette', key: 'k', ctrlKey: true },
  { id: 'nav.settings', name: 'Settings', description: 'Open settings', shortcut: '⌘,', category: 'Navigation', action: 'settings', key: ',', ctrlKey: true },
  { id: 'nav.goToLine', name: 'Go to Line', description: 'Go to line number', shortcut: '⌘G', category: 'Navigation', action: 'goToLine', key: 'g', ctrlKey: true },

  // Agent operations
  { id: 'agent.send', name: 'Send Message', description: 'Send message to AI agent', shortcut: 'Enter', category: 'Agent', action: 'sendMessage', key: 'Enter' },
  { id: 'agent.newLine', name: 'New Line', description: 'Insert new line', shortcut: '⇧Enter', category: 'Agent', action: 'newLine', key: 'Enter', shiftKey: true },

  // Terminal
  { id: 'terminal.clear', name: 'Clear Terminal', description: 'Clear terminal output', shortcut: '⌘L', category: 'Terminal', action: 'clearTerminal', key: 'l', ctrlKey: true },
  { id: 'terminal.new', name: 'New Terminal', description: 'Create new terminal', shortcut: '⌘⇧`', category: 'Terminal', action: 'newTerminal', key: '`', ctrlKey: true, shiftKey: true },
]

class KeyboardService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private handlers: Map<string, () => void> = new Map()

  constructor() {
    SHORTCUTS.forEach(s => this.shortcuts.set(s.id, s))
  }

  /**
   * Register a handler for a shortcut
   */
  register(shortcutId: string, handler: () => void) {
    this.handlers.set(shortcutId, handler)
  }

  /**
   * Unregister a handler
   */
  unregister(shortcutId: string) {
    this.handlers.delete(shortcutId)
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    for (const [id, shortcut] of this.shortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        const handler = this.handlers.get(id)
        if (handler) {
          event.preventDefault()
          handler()
          return true
        }
      }
    }
    return false
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true
    const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey
    const altMatch = (shortcut as any).altKey ? event.altKey : !event.altKey
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

    return ctrlMatch && shiftMatch && altMatch && keyMatch
  }

  /**
   * Get all shortcuts
   */
  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
  }

  /**
   * Get shortcuts by category
   */
  getByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category)
  }

  /**
   * Get shortcut by ID
   */
  getById(id: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(id)
  }

  /**
   * Search shortcuts
   */
  search(query: string): KeyboardShortcut[] {
    const q = query.toLowerCase()
    return Array.from(this.shortcuts.values()).filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.shortcut.toLowerCase().includes(q)
    )
  }
}

export const keyboardService = new KeyboardService()
export default keyboardService
