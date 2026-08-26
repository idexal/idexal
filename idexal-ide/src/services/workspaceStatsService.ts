/**
 * Workspace Statistics Service
 * Tracks and computes project metrics for the statistics dashboard
 */

export interface FileStats {
  totalFiles: number
  totalLines: number
  byLanguage: Record<string, { files: number; lines: number }>
  largestFiles: Array<{ path: string; lines: number }>
  recentlyModified: Array<{ path: string; timestamp: number }>
}

export interface GitStats {
  totalCommits: number
  contributors: Array<{ name: string; commits: number }>
  recentActivity: Array<{ date: string; commits: number }>
  branches: number
}

export interface ProjectMetrics {
  files: FileStats
  git: GitStats
  activity: {
    commandsRun: number
    aiRequests: number
    filesOpened: number
    sessionDuration: number
  }
}

class WorkspaceStatsService {
  private fileStats: FileStats = {
    totalFiles: 0,
    totalLines: 0,
    byLanguage: {},
    largestFiles: [],
    recentlyModified: [],
  }

  private gitStats: GitStats = {
    totalCommits: 0,
    contributors: [],
    recentActivity: [],
    branches: 0,
  }

  private activity = {
    commandsRun: 0,
    aiRequests: 0,
    filesOpened: 0,
    sessionStart: Date.now(),
  }

  private listeners: Set<() => void> = new Set()

  // ── File Statistics ─────────────────────────────────────

  updateFileStats(files: Array<{ path: string; lines: number; language: string; modified?: number }>) {
    const byLanguage: Record<string, { files: number; lines: number }> = {}
    let totalLines = 0

    for (const file of files) {
      totalLines += file.lines
      if (!byLanguage[file.language]) {
        byLanguage[file.language] = { files: 0, lines: 0 }
      }
      byLanguage[file.language].files++
      byLanguage[file.language].lines += file.lines
    }

    this.fileStats = {
      totalFiles: files.length,
      totalLines,
      byLanguage,
      largestFiles: [...files].sort((a, b) => b.lines - a.lines).slice(0, 10),
      recentlyModified: files
        .filter(f => f.modified)
        .sort((a, b) => (b.modified || 0) - (a.modified || 0))
        .slice(0, 10)
        .map(f => ({ path: f.path, timestamp: f.modified || 0 })),
    }

    this.notify()
  }

  // ── Git Statistics ──────────────────────────────────────

  updateGitStats(stats: Partial<GitStats>) {
    this.gitStats = { ...this.gitStats, ...stats }
    this.notify()
  }

  // ── Activity Tracking ───────────────────────────────────

  recordCommand() {
    this.activity.commandsRun++
    this.notify()
  }

  recordAIRequest() {
    this.activity.aiRequests++
    this.notify()
  }

  recordFileOpen() {
    this.activity.filesOpened++
    this.notify()
  }

  // ── Getters ─────────────────────────────────────────────

  getFileStats(): FileStats {
    return { ...this.fileStats }
  }

  getGitStats(): GitStats {
    return { ...this.gitStats }
  }

  getActivity() {
    return {
      ...this.activity,
      sessionDuration: Date.now() - this.activity.sessionStart,
    }
  }

  getMetrics(): ProjectMetrics {
    return {
      files: this.getFileStats(),
      git: this.getGitStats(),
      activity: this.getActivity(),
    }
  }

  // ── Language Breakdown ──────────────────────────────────

  getLanguageBreakdown(): Array<{ language: string; files: number; lines: number; percentage: number }> {
    const total = this.fileStats.totalLines || 1
    return Object.entries(this.fileStats.byLanguage)
      .map(([language, stats]) => ({
        language,
        ...stats,
        percentage: (stats.lines / total) * 100,
      }))
      .sort((a, b) => b.lines - a.lines)
  }

  // ── Activity Timeline ───────────────────────────────────

  getActivityTimeline(hours: number = 24): Array<{ hour: number; commands: number; aiRequests: number }> {
    // Generate hourly breakdown
    const timeline = Array.from({ length: hours }, (_, i) => ({
      hour: i,
      commands: 0,
      aiRequests: 0,
    }))

    // This would need access to command history and AI request logs
    // For now, return the structure
    return timeline
  }

  // ── Subscriptions ───────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    this.listeners.forEach(l => l())
  }
}

export const workspaceStatsService = new WorkspaceStatsService()
export default workspaceStatsService
