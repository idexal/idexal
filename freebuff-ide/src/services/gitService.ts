/**
 * Git Service - Handles Git operations
 */

export interface GitFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  oldPath?: string
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
  lastCommit?: string
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
  files: string[]
}

export interface GitDiff {
  file: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  oldLine?: number
  newLine?: number
}

class GitService {
  private repoPath: string = ''

  setRepoPath(path: string) {
    this.repoPath = path
  }

  // Simulated Git operations (in production, these would call actual git via IPC)
  async getStatus(): Promise<GitFile[]> {
    // Simulated - in production via Electron IPC
    return [
      { path: 'src/components/NewFeature.tsx', status: 'added' },
      { path: 'src/App.tsx', status: 'modified' },
      { path: 'src/utils/oldHelper.ts', status: 'deleted' },
    ]
  }

  async getBranches(): Promise<GitBranch[]> {
    return [
      { name: 'main', current: true, lastCommit: 'feat: add multi-agent system' },
      { name: 'develop', current: false, lastCommit: 'chore: update dependencies' },
      { name: 'feature/ai-integration', current: false, lastCommit: 'feat: add AI service' },
    ]
  }

  async getCurrentBranch(): Promise<string> {
    return 'main'
  }

  async getDiff(filePath?: string): Promise<GitDiff[]> {
    // Simulated diff data
    return [
      {
        file: filePath || 'src/App.tsx',
        additions: 12,
        deletions: 3,
        hunks: [
          {
            oldStart: 1,
            oldLines: 10,
            newStart: 1,
            newLines: 19,
            lines: [
              { type: 'context', content: "import React, { useEffect, useState } from 'react'", oldLine: 1, newLine: 1 },
              { type: 'context', content: "import { useAgentStore } from './stores/agentStore'", oldLine: 2, newLine: 2 },
              { type: 'add', content: "import { useMemoryStore } from './stores/memoryStore'", newLine: 3 },
              { type: 'remove', content: "import TitleBar from './components/TitleBar'", oldLine: 3 },
              { type: 'add', content: "import TitleBar from './components/Layout/TitleBar'", newLine: 4 },
              { type: 'context', content: "", oldLine: 4, newLine: 5 },
              { type: 'context', content: "function App() {", oldLine: 5, newLine: 6 },
              { type: 'add', content: "  const { initializeAgents } = useAgentStore()", newLine: 7 },
              { type: 'add', content: "  const { setProjectContext } = useMemoryStore()", newLine: 8 },
              { type: 'context', content: "  const [showCommandPalette, setShowCommandPalette] = useState(false)", oldLine: 6, newLine: 9 },
            ],
          },
        ],
      },
    ]
  }

  async commit(message: string, files?: string[]): Promise<string> {
    console.log('Committing:', message, files)
    return 'abc123def456'
  }

  async push(remote?: string, branch?: string): Promise<void> {
    console.log('Pushing to', remote || 'origin', branch || 'main')
  }

  async pull(remote?: string, branch?: string): Promise<void> {
    console.log('Pulling from', remote || 'origin', branch || 'main')
  }

  async createBranch(name: string): Promise<void> {
    console.log('Creating branch:', name)
  }

  async switchBranch(name: string): Promise<void> {
    console.log('Switching to branch:', name)
  }

  async stageFile(path: string): Promise<void> {
    console.log('Staging:', path)
  }

  async unstageFile(path: string): Promise<void> {
    console.log('Unstaging:', path)
  }

  async stageAll(): Promise<void> {
    console.log('Staging all files')
  }

  async discardChanges(path: string): Promise<void> {
    console.log('Discarding changes:', path)
  }

  async getLog(limit: number = 10): Promise<GitCommit[]> {
    return [
      { hash: 'a1b2c3d', message: 'feat: add multi-agent system', author: 'Developer', date: '2024-01-15', files: ['rust-engine/src/agent/'] },
      { hash: 'e4f5g6h', message: 'feat: implement memory system', author: 'Developer', date: '2024-01-14', files: ['rust-engine/src/memory/'] },
      { hash: 'i7j8k9l', message: 'chore: initial project setup', author: 'Developer', date: '2024-01-13', files: ['package.json', 'tsconfig.json'] },
    ]
  }
}

export const gitService = new GitService()
export default gitService
