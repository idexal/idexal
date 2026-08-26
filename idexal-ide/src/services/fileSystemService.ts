export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  children?: FileEntry[]
}

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

import { browserFileService, isFileSystemAccessAvailable, getRootName } from './browserFileService'

const isElectron = !!(window as any).electronAPI?.isElectron
const electronAPI = isElectron ? (window as any).electronAPI : null
const isBrowserFS = !isElectron && isFileSystemAccessAvailable()

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
  '/mock/project/src/App.tsx': `import React from 'react'\nimport { Button } from './components/Button'\n\nexport function App() {\n  const [count, setCount] = React.useState(0)\n\n  return (\n    <div className=\"app\">\n      <h1>Idexal IDE</h1>\n      <p>AI-Powered Multi-Agent Development Environment</p>\n      <Button onClick={() => setCount(c => c + 1)}>\n        Count: {count}\n      </Button>\n    </div>\n  )\n}`,
  '/mock/project/src/main.tsx': `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport { App } from './App'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n)`,
  '/mock/project/package.json': `{\n  "name": "idexal-ide",\n  "version": "1.0.0"\n}`,
  '/mock/project/README.md': `# Idexal IDE\nAI-Powered Multi-Agent Development Environment`,
}

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
    if (isElectron && electronAPI) return electronAPI.readFile(filePath)
    if (isBrowserFS && browserFileService.isAvailable) return browserFileService.readFile(filePath)
    const content = MOCK_FILES[filePath]
    return content !== undefined
      ? { success: true, content }
      : { success: false, error: `File not found: ${filePath}` }
  },

  async writeFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron && electronAPI) return electronAPI.writeFileSync(filePath, content)
    if (isBrowserFS && browserFileService.isAvailable) return browserFileService.writeFile(filePath, content)
    MOCK_FILES[filePath] = content
    return { success: true }
  },

  async readDir(dirPath: string, maxDepth: number = 3): Promise<DirResult> {
    if (isElectron && electronAPI) return electronAPI.readDir(dirPath, maxDepth)
    if (isBrowserFS && browserFileService.isAvailable) return browserFileService.readDir(dirPath, maxDepth)
    return { success: true, tree: MOCK_TREE }
  },

  async fileExists(filePath: string): Promise<boolean> {
    if (isElectron && electronAPI) return electronAPI.fileExists(filePath)
    if (isBrowserFS && browserFileService.isAvailable) {
      const result = await browserFileService.readFile(filePath)
      return result.success
    }
    return MOCK_FILES[filePath] !== undefined
  },

  async openFolder(): Promise<string | null> {
    if (isElectron && electronAPI) {
      const result = await electronAPI.openFolder()
      return result.success ? result.folderPath : null
    }
    if (isFileSystemAccessAvailable()) {
      const opened = await browserFileService.openDirectory()
      return opened ? `/${getRootName()}` : null
    }
    return '/mock/project'
  },

  async searchFiles(dirPath: string, query: string) {
    if (isElectron && electronAPI) return electronAPI.searchFiles(dirPath, query)
    if (isBrowserFS && browserFileService.isAvailable) {
      const results = await browserFileService.searchFiles(query)
      return { success: true, results }
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
}
