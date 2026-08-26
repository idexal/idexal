import { fileSystemService, FileEntry, detectLanguage } from './fileSystemService'

export interface AgentContext {
  projectInfo: string
  relevantFiles: string[]
}

class ProjectContextService {
  private analysis: { rootPath: string; name: string; languages: Map<string, number>; structure: FileEntry[]; keyFiles: string[]; totalFiles: number } | null = null
  private rootPath: string = '/mock/project'

  async analyzeProject(rootPath: string) {
    this.rootPath = rootPath
    const result = await fileSystemService.readDir(rootPath)
    if (!result.success || !result.tree) {
      throw new Error(result.error || 'Failed to read directory')
    }
    const structure = result.tree
    const languages = new Map<string, number>()
    const keyFiles: string[] = []
    let totalFiles = 0

    const analyzeNode = (entries: FileEntry[]) => {
      for (const node of entries) {
        if (node.type === 'file') {
          totalFiles++
          const lang = detectLanguage(node.path)
          languages.set(lang, (languages.get(lang) || 0) + 1)
          if (this.isKeyFile(node.name)) {
            keyFiles.push(node.path)
          }
        }
        if (node.children) analyzeNode(node.children)
      }
    }
    analyzeNode(structure)

    this.analysis = { rootPath, name: rootPath.split('/').pop() || rootPath, languages, structure, keyFiles, totalFiles }
    return this.analysis
  }

  async getProjectSummary(): Promise<string> {
    if (!this.analysis) await this.analyzeProject(this.rootPath)
    if (!this.analysis) return 'No project loaded'

    const langStats = Array.from(this.analysis.languages.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `${lang}: ${count} files`)
      .join(', ')

    return `Project: ${this.analysis.name}\nFiles: ${this.analysis.totalFiles}\nLanguages: ${langStats}\nKey files: ${this.analysis.keyFiles.slice(0, 8).join(', ')}`
  }

  async getAgentContext(query: string): Promise<AgentContext> {
    if (!this.analysis) await this.analyzeProject(this.rootPath)
    if (!this.analysis) return { projectInfo: 'No project loaded', relevantFiles: [] }
    return { projectInfo: await this.getProjectSummary(), relevantFiles: this.findRelevantFiles(query) }
  }

  private findRelevantFiles(query: string): string[] {
    if (!this.analysis) return []
    const queryLower = query.toLowerCase()
    const scored: Array<{ path: string; score: number }> = []

    const scoreEntries = (entries: FileEntry[]) => {
      for (const node of entries) {
        if (node.type === 'file') {
          let score = 0
          const name = node.name.toLowerCase()
          const nodePath = node.path.toLowerCase()
          const words = queryLower.split(/\s+/)
          if (words.some(w => name.includes(w))) score += 10
          if (words.some(w => nodePath.includes(w))) score += 5
          if (this.isKeyFile(node.name)) score += 3
          if (nodePath.includes('/src/') || nodePath.includes('/components/')) score += 2
          if (score > 0) scored.push({ path: node.path, score })
        }
        if (node.children) scoreEntries(node.children)
      }
    }
    scoreEntries(this.analysis.structure)
    return scored.sort((a, b) => b.score - a.score).map(s => s.path).slice(0, 10)
  }

  private isKeyFile(name: string): boolean {
    return ['package.json', 'Cargo.toml', 'tsconfig.json', 'README.md', 'App.tsx', 'main.tsx', 'lib.rs', 'mod.rs', '.env', 'Dockerfile', 'docker-compose.yml'].includes(name)
  }

  clearCache() { this.analysis = null }
}

export const projectContextService = new ProjectContextService()
export default projectContextService
