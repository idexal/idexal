/**
 * File System Service - Works with both Electron IPC and browser fallback
 */

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileEntry[]
}

export interface FileOperationResult {
  success: boolean
  content?: string
  error?: string
}

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron

// Mock file tree for browser development
const MOCK_PROJECT_TREE: FileEntry[] = [
  {
    name: 'src', type: 'directory', path: 'src',
    children: [
      {
        name: 'components', type: 'directory', path: 'src/components',
        children: [
          {
            name: 'AI', type: 'directory', path: 'src/components/AI',
            children: [
              { name: 'ChatPanel.tsx', type: 'file', path: 'src/components/AI/ChatPanel.tsx' },
              { name: 'MarkdownRenderer.tsx', type: 'file', path: 'src/components/AI/MarkdownRenderer.tsx' },
              { name: 'StreamingMessage.tsx', type: 'file', path: 'src/components/AI/StreamingMessage.tsx' },
            ],
          },
          {
            name: 'Editor', type: 'directory', path: 'src/components/Editor',
            children: [
              { name: 'EditorArea.tsx', type: 'file', path: 'src/components/Editor/EditorArea.tsx' },
              { name: 'MonacoEditor.tsx', type: 'file', path: 'src/components/Editor/MonacoEditor.tsx' },
              { name: 'TabBar.tsx', type: 'file', path: 'src/components/Editor/TabBar.tsx' },
            ],
          },
          {
            name: 'Layout', type: 'directory', path: 'src/components/Layout',
            children: [
              { name: 'CommandPalette.tsx', type: 'file', path: 'src/components/Layout/CommandPalette.tsx' },
              { name: 'Sidebar.tsx', type: 'file', path: 'src/components/Layout/Sidebar.tsx' },
              { name: 'StatusBar.tsx', type: 'file', path: 'src/components/Layout/StatusBar.tsx' },
              { name: 'TitleBar.tsx', type: 'file', path: 'src/components/Layout/TitleBar.tsx' },
            ],
          },
          {
            name: 'Terminal', type: 'directory', path: 'src/components/Terminal',
            children: [
              { name: 'TerminalPanel.tsx', type: 'file', path: 'src/components/Terminal/TerminalPanel.tsx' },
            ],
          },
        ],
      },
      {
        name: 'hooks', type: 'directory', path: 'src/hooks',
        children: [
          { name: 'useAgent.ts', type: 'file', path: 'src/hooks/useAgent.ts' },
          { name: 'useTerminal.ts', type: 'file', path: 'src/hooks/useTerminal.ts' },
        ],
      },
      {
        name: 'services', type: 'directory', path: 'src/services',
        children: [
          { name: 'aiService.ts', type: 'file', path: 'src/services/aiService.ts' },
          { name: 'fileSystemService.ts', type: 'file', path: 'src/services/fileSystemService.ts' },
          { name: 'gitService.ts', type: 'file', path: 'src/services/gitService.ts' },
          { name: 'themeService.ts', type: 'file', path: 'src/services/themeService.ts' },
        ],
      },
      {
        name: 'stores', type: 'directory', path: 'src/stores',
        children: [
          { name: 'editorStore.ts', type: 'file', path: 'src/stores/editorStore.ts' },
          { name: 'agentStore.ts', type: 'file', path: 'src/stores/agentStore.ts' },
          { name: 'memoryStore.ts', type: 'file', path: 'src/stores/memoryStore.ts' },
          { name: 'settingsStore.ts', type: 'file', path: 'src/stores/settingsStore.ts' },
        ],
      },
      { name: 'App.tsx', type: 'file', path: 'src/App.tsx' },
      { name: 'main.tsx', type: 'file', path: 'src/main.tsx' },
      { name: 'styles', type: 'directory', path: 'src/styles', children: [
        { name: 'globals.css', type: 'file', path: 'src/styles/globals.css' },
      ]},
    ],
  },
  {
    name: 'rust-engine', type: 'directory', path: 'rust-engine',
    children: [
      { name: 'Cargo.toml', type: 'file', path: 'rust-engine/Cargo.toml' },
      {
        name: 'src', type: 'directory', path: 'rust-engine/src',
        children: [
          { name: 'lib.rs', type: 'file', path: 'rust-engine/src/lib.rs' },
          { name: 'agent.rs', type: 'file', path: 'rust-engine/src/agent.rs' },
          { name: 'memory.rs', type: 'file', path: 'rust-engine/src/memory.rs' },
        ],
      },
    ],
  },
  {
    name: 'electron', type: 'directory', path: 'electron',
    children: [
      { name: 'main.ts', type: 'file', path: 'electron/src/main.ts' },
      { name: 'preload.ts', type: 'file', path: 'electron/src/preload.ts' },
    ],
  },
  { name: 'package.json', type: 'file', path: 'package.json' },
  { name: 'tsconfig.json', type: 'file', path: 'tsconfig.json' },
  { name: 'vite.config.ts', type: 'file', path: 'vite.config.ts' },
  { name: 'README.md', type: 'file', path: 'README.md' },
]

// Language detection
const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  rs: 'rust', py: 'python', go: 'go', java: 'java', cpp: 'cpp',
  c: 'c', h: 'c', cs: 'csharp', rb: 'ruby', php: 'php',
  swift: 'swift', kt: 'kotlin', scala: 'scala',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  md: 'markdown', html: 'html', css: 'css', scss: 'scss',
  xml: 'xml', sql: 'sql', sh: 'shell', bash: 'shell',
  dockerfile: 'dockerfile', makefile: 'makefile',
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const basename = filePath.split('/').pop()?.toLowerCase() || ''

  if (basename === 'dockerfile') return 'dockerfile'
  if (basename === 'makefile') return 'makefile'
  return LANGUAGE_MAP[ext] || 'plaintext'
}

// Normalize path for cross-platform
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/')
}

// Get the Electron API
function getElectronAPI() {
  return isElectron ? (window as any).electronAPI : null
}

class FileSystemService {
  private fileCache: Map<string, string> = new Map()
  private openFolderPath: string | null = null

  // Open folder dialog
  async openFolder(): Promise<string | null> {
    const api = getElectronAPI()
    if (api) {
      const result = await api.openFolder()
      if (result.success) {
        this.openFolderPath = result.folderPath
        this.clearCache()
        return result.folderPath
      }
      return null
    }

    // Browser fallback - use mock
    this.openFolderPath = '/mock/project'
    return this.openFolderPath
  }

  // Open file dialog
  async openFile(): Promise<{ filePath: string; content: string } | null> {
    const api = getElectronAPI()
    if (api) {
      const result = await api.openFile()
      if (result.success) {
        this.fileCache.set(normalizePath(result.filePath), result.content)
        return { filePath: result.filePath, content: result.content }
      }
      return null
    }

    return null
  }

  // Read file
  async readFile(filePath: string): Promise<FileOperationResult> {
    const normalizedPath = normalizePath(filePath)

    // Check cache
    if (this.fileCache.has(normalizedPath)) {
      return { success: true, content: this.fileCache.get(normalizedPath) }
    }

    const api = getElectronAPI()
    if (api) {
      const result = await api.readFile(filePath)
      if (result.success) {
        this.fileCache.set(normalizedPath, result.content)
      }
      return result
    }

    // Browser fallback - return mock content
    const mockContent = this.getMockContent(filePath)
    this.fileCache.set(normalizedPath, mockContent)
    return { success: true, content: mockContent }
  }

  // Write file
  async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
    const api = getElectronAPI()
    if (api) {
      const result = await api.writeFile(filePath, content)
      if (result.success) {
        this.fileCache.set(normalizePath(filePath), content)
      }
      return result
    }

    // Browser fallback
    this.fileCache.set(normalizePath(filePath), content)
    return { success: true }
  }

  // Read directory
  async readDir(dirPath: string): Promise<FileEntry[]> {
    const api = getElectronAPI()
    if (api) {
      const result = await api.readDir(dirPath)
      if (result.success) {
        return result.tree
      }
      return []
    }

    // Browser fallback
    if (dirPath === '/mock/project' || !dirPath) {
      return MOCK_PROJECT_TREE
    }
    return []
  }

  // Save file dialog
  async saveFile(content: string): Promise<string | null> {
    const api = getElectronAPI()
    if (api) {
      const result = await api.saveFile(content)
      if (result.success) {
        this.fileCache.set(normalizePath(result.path), content)
        return result.path
      }
      return null
    }

    return null
  }

  // Watch file
  watchFile(filePath: string, callback: (eventType: string) => void): void {
    const api = getElectronAPI()
    if (api) {
      api.watchFile(filePath)
      api.onFileChanged((eventType: string, changedPath: string) => {
        if (normalizePath(changedPath) === normalizePath(filePath)) {
          // Invalidate cache
          this.fileCache.delete(normalizePath(filePath))
          callback(eventType)
        }
      })
    }
  }

  // Clear cache
  clearCache(): void {
    this.fileCache.clear()
  }

  // Get all files recursively (for QuickOpen)
  async getAllFiles(dirPath?: string): Promise<{ name: string; path: string; language: string }[]> {
    const tree = await this.readDir(dirPath || this.openFolderPath || '/mock/project')
    const files: { name: string; path: string; language: string }[] = []

    const flatten = (entries: FileEntry[]) => {
      for (const entry of entries) {
        if (entry.type === 'file') {
          files.push({
            name: entry.name,
            path: entry.path,
            language: detectLanguage(entry.path),
          })
        } else if (entry.children) {
          flatten(entry.children)
        }
      }
    }

    flatten(tree)
    return files
  }

  // Get mock content for browser preview
  private getMockContent(filePath: string): string {
    const filename = filePath.split('/').pop() || ''
    const ext = filename.split('.').pop() || ''

    const mockContents: Record<string, string> = {
      'App.tsx': `import React, { useState } from 'react'\n\nexport default function App() {\n  const [count, setCount] = useState(0)\n  return (\n    <div>\n      <h1>Hello Idexal</h1>\n      <button onClick={() => setCount(c => c + 1)}>\n        Count: {count}\n      </button>\n    </div>\n  )\n}`,
      'package.json': JSON.stringify({ name: 'idexal-ide', version: '1.0.0', description: 'AI-Powered IDE' }, null, 2),
      'README.md': `# Idexal IDE\n\nAI-Powered Multi-Agent Development Environment`,
    }

    return mockContents[filename] || `// ${filename}\n// File content placeholder`
  }

  // Get open folder path
  getOpenFolderPath(): string | null {
    return this.openFolderPath
  }

  // Check if Electron is available
  isElectron(): boolean {
    return isElectron
  }
}

export const fileSystemService = new FileSystemService()
export default fileSystemService
