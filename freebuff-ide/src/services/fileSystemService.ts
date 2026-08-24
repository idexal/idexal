export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  children?: FileEntry[]
}

export type { FileEntry as FileTreeItem }

export interface FileResult {
  success: boolean
  content?: string
  error?: string
  filePath?: string
  size?: number
  modified?: string
}

export interface DirResult {
  success: boolean
  tree?: FileEntry[]
  error?: string
}

export interface SearchResult {
  success: boolean
  results?: Array<{ path: string; name: string; extension: string }>
  error?: string
}

// Check if running in Electron
const isElectron = !!(window as any).electronAPI?.isElectron
const electronAPI = isElectron ? (window as any).electronAPI : null

// ============================================================
// MOCK DATA (fallback for browser mode)
// ============================================================

const MOCK_TREE: FileEntry[] = [
  {
    name: 'src',
    path: '/mock/project/src',
    type: 'directory',
    children: [
      {
        name: 'components',
        path: '/mock/project/src/components',
        type: 'directory',
        children: [
          { name: 'Button.tsx', path: '/mock/project/src/components/Button.tsx', type: 'file', extension: '.tsx' },
          { name: 'Modal.tsx', path: '/mock/project/src/components/Modal.tsx', type: 'file', extension: '.tsx' },
        ],
      },
      {
        name: 'hooks',
        path: '/mock/project/src/hooks',
        type: 'directory',
        children: [
          { name: 'useAuth.ts', path: '/mock/project/src/hooks/useAuth.ts', type: 'file', extension: '.ts' },
          { name: 'useTheme.ts', path: '/mock/project/src/hooks/useTheme.ts', type: 'file', extension: '.ts' },
        ],
      },
      {
        name: 'services',
        path: '/mock/project/src/services',
        type: 'directory',
        children: [
          { name: 'api.ts', path: '/mock/project/src/services/api.ts', type: 'file', extension: '.ts' },
          { name: 'auth.ts', path: '/mock/project/src/services/auth.ts', type: 'file', extension: '.ts' },
        ],
      },
      {
        name: 'stores',
        path: '/mock/project/src/stores',
        type: 'directory',
        children: [
          { name: 'appStore.ts', path: '/mock/project/src/stores/appStore.ts', type: 'file', extension: '.ts' },
          { name: 'userStore.ts', path: '/mock/project/src/stores/userStore.ts', type: 'file', extension: '.ts' },
        ],
      },
      { name: 'App.tsx', path: '/mock/project/src/App.tsx', type: 'file', extension: '.tsx' },
      { name: 'main.tsx', path: '/mock/project/src/main.tsx', type: 'file', extension: '.tsx' },
      { name: 'index.css', path: '/mock/project/src/index.css', type: 'file', extension: '.css' },
    ],
  },
  {
    name: 'public',
    path: '/mock/project/public',
    type: 'directory',
    children: [
      { name: 'index.html', path: '/mock/project/public/index.html', type: 'file', extension: '.html' },
    ],
  },
  { name: 'package.json', path: '/mock/project/package.json', type: 'file', extension: '.json' },
  { name: 'tsconfig.json', path: '/mock/project/tsconfig.json', type: 'file', extension: '.json' },
  { name: 'vite.config.ts', path: '/mock/project/vite.config.ts', type: 'file', extension: '.ts' },
  { name: 'README.md', path: '/mock/project/README.md', type: 'file', extension: '.md' },
]

const MOCK_FILES: Record<string, string> = {
  '/mock/project/src/App.tsx': `import React from 'react'
import { Button } from './components/Button'

export function App() {
  const [count, setCount] = React.useState(0)

  return (
    <div className="app">
      <h1>Idexal IDE</h1>
      <p>AI-Powered Multi-Agent Development Environment</p>
      <Button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </Button>
    </div>
  )
}`,
  '/mock/project/src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
  '/mock/project/package.json': `{
  "name": "idexal-ide",
  "version": "1.0.0"
}`,
  '/mock/project/README.md': `# Idexal IDE\nAI-Powered Multi-Agent Development Environment`,
}

// ============================================================
// PUBLIC API
// ============================================================

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell',
    dockerfile: 'dockerfile', xml: 'xml', graphql: 'graphql',
  }
  if (filePath.toLowerCase().includes('dockerfile')) return 'dockerfile'
  return langMap[ext] || 'plaintext'
}

export const fileSystemService = {
  async readFile(filePath: string): Promise<FileResult> {
    if (isElectron && electronAPI) {
      return electronAPI.readFile(filePath)
    }
    const content = MOCK_FILES[filePath]
    if (content !== undefined) {
      return { success: true, content }
    }
    return { success: false, error: `File not found: ${filePath}` }
  },

  async writeFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron && electronAPI) {
      return electronAPI.writeFileSync(filePath, content)
    }
    MOCK_FILES[filePath] = content
    return { success: true }
  },

  async readDir(dirPath: string, maxDepth: number = 3): Promise<DirResult> {
    if (isElectron && electronAPI) {
      return electronAPI.readDir(dirPath, maxDepth)
    }
    return { success: true, tree: MOCK_TREE }
  },

  async fileExists(filePath: string): Promise<boolean> {
    if (isElectron && electronAPI) {
      return electronAPI.fileExists(filePath)
    }
    return MOCK_FILES[filePath] !== undefined
  },

  async openFile(): Promise<FileResult> {
    if (isElectron && electronAPI) {
      return electronAPI.openFile()
    }
    return { success: false, error: 'File dialog not available in browser' }
  },

  async openFolder(): Promise<string | null> {
    if (isElectron && electronAPI) {
      const result = await electronAPI.openFolder()
      return result.success ? result.folderPath : null
    }
    // In browser, return the mock root
    return '/mock/project'
  },

  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron && electronAPI) {
      return electronAPI.deleteFile(filePath)
    }
    delete MOCK_FILES[filePath]
    return { success: true }
  },

  async rename(oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron && electronAPI) {
      return electronAPI.rename(oldPath, newPath)
    }
    return { success: false, error: 'Rename not available in browser' }
  },

  async createDirectory(dirPath: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron && electronAPI) {
      return electronAPI.createDirectory(dirPath)
    }
    return { success: false, error: 'Directory creation not available in browser' }
  },

  async searchFiles(dirPath: string, query: string): Promise<SearchResult> {
    if (isElectron && electronAPI) {
      return electronAPI.searchFiles(dirPath, query)
    }
    const results: Array<{ path: string; name: string; extension: string }> = []
    const lowerQuery = query.toLowerCase()
    const searchTree = (items: FileEntry[]) => {
      for (const item of items) {
        if (item.name.toLowerCase().includes(lowerQuery)) {
          results.push({ path: item.path, name: item.name, extension: item.extension || '' })
        }
        if (item.children) searchTree(item.children)
      }
    }
    searchTree(MOCK_TREE)
    return { success: true, results }
  },

  getAllFiles(tree: FileEntry[]): FileEntry[] {
    const files: FileEntry[] = []
    const traverse = (items: FileEntry[]) => {
      for (const item of items) {
        if (item.type === 'file') files.push(item)
        if (item.children) traverse(item.children)
      }
    }
    traverse(tree)
    return files
  },

  // Git operations
  async gitStatus(cwd?: string) {
    if (isElectron && electronAPI) return electronAPI.gitStatus(cwd)
    return { success: false, error: 'Git not available in browser' }
  },
  async gitLog(cwd?: string, maxCount?: number) {
    if (isElectron && electronAPI) return electronAPI.gitLog(cwd, maxCount)
    return { success: false, error: 'Git not available in browser' }
  },
  async gitDiff(cwd?: string, file?: string) {
    if (isElectron && electronAPI) return electronAPI.gitDiff(cwd, file)
    return { success: false, error: 'Git not available in browser' }
  },
  async gitAdd(files: string[], cwd?: string) {
    if (isElectron && electronAPI) return electronAPI.gitAdd(files, cwd)
    return { success: false, error: 'Git not available in browser' }
  },
  async gitCommit(message: string, cwd?: string) {
    if (isElectron && electronAPI) return electronAPI.gitCommit(message, cwd)
    return { success: false, error: 'Git not available in browser' }
  },
  async gitBranches(cwd?: string) {
    if (isElectron && electronAPI) return electronAPI.gitBranches(cwd)
    return { success: false, error: 'Git not available in browser' }
  },
  async gitCheckout(branch: string, cwd?: string) {
    if (isElectron && electronAPI) return electronAPI.gitCheckout(branch, cwd)
    return { success: false, error: 'Git not available in browser' }
  },

  // Command execution
  async execCommand(command: string, cwd?: string, timeout?: number) {
    if (isElectron && electronAPI) return electronAPI.execCommand(command, cwd, timeout)
    return { success: false, error: 'Command execution not available in browser' }
  },

  // Clipboard
  async clipboardRead(): Promise<string> {
    if (isElectron && electronAPI) return electronAPI.clipboardRead()
    return navigator.clipboard.readText()
  },
  async clipboardWrite(text: string): Promise<void> {
    if (isElectron && electronAPI) return electronAPI.clipboardWrite(text)
    return navigator.clipboard.writeText(text)
  },

  // Terminal
  async terminalCreate(cwd?: string) {
    if (isElectron && electronAPI) return electronAPI.terminalCreate(cwd)
    return { success: false, error: 'Terminal not available in browser' }
  },
  async terminalWrite(id: string, data: string) {
    if (isElectron && electronAPI) return electronAPI.terminalWrite(id, data)
    return { success: false, error: 'Terminal not available in browser' }
  },
  async terminalKill(id: string) {
    if (isElectron && electronAPI) return electronAPI.terminalKill(id)
    return { success: false, error: 'Terminal not available in browser' }
  },

  // System info
  async getSystemInfo() {
    if (isElectron && electronAPI) return electronAPI.getSystemInfo()
    return { platform: navigator.platform, arch: 'unknown', nodeVersion: 'N/A', homedir: '~', cpus: navigator.hardwareConcurrency || 1, totalMemory: 0, freeMemory: 0 }
  },
}
