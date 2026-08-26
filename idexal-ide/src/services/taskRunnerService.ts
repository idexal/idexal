/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                 TASK RUNNER SERVICE v1.0                        ║
 * ║              Package.json Scripts Execution                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export interface Task {
  id: string
  name: string
  command: string
  script?: string
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  output: string
  startTime?: number
  endTime?: number
  exitCode?: number
}

export interface PackageJson {
  name?: string
  version?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const isElectron = !!(window as any).electronAPI?.isElectron
const electronAPI = isElectron ? (window as any).electronAPI : null

class TaskRunnerService {
  private tasks: Map<string, Task> = new Map()
  private counter = 0
  private listeners: Set<() => void> = new Set()

  // ── Scripts Detection ──────────────────────────────────────

  async detectScripts(): Promise<Record<string, string>> {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.readFile('package.json')
        if (result.success) {
          const pkg: PackageJson = JSON.parse(result.content)
          return pkg.scripts || {}
        }
      } catch {}
    }
    return {}
  }

  async getPackageJson(): Promise<PackageJson | null> {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.readFile('package.json')
        if (result.success) return JSON.parse(result.content)
      } catch {}
    }
    return null
  }

  // ── Task Execution ─────────────────────────────────────────

  async runScript(name: string, command: string, cwd?: string): Promise<Task> {
    const task: Task = {
      id: `task-${++this.counter}`,
      name,
      command,
      script: command,
      status: 'running',
      output: '',
      startTime: Date.now(),
    }
    this.tasks.set(task.id, task)
    this.notify()

    if (isElectron && electronAPI) {
      try {
        // Create a terminal for this task
        const termResult = await electronAPI.terminalCreate(cwd)
        if (!termResult.success || !termResult.id) {
          throw new Error(termResult.error || 'Failed to create terminal')
        }
        const termId = termResult.id

        // Subscribe to terminal output
        const unsub = electronAPI.onTerminalOutput((id: string, data: string) => {
          if (id === termId) {
            task.output += data
            this.notify()
          }
        })

        const unsubExit = electronAPI.onTerminalExit((id: string, code: number | null) => {
          if (id === termId) {
            task.status = code === 0 ? 'completed' : 'failed'
            task.exitCode = code || 0
            task.endTime = Date.now()
            unsub()
            unsubExit()
            electronAPI.terminalKill(termId)
            this.notify()
          }
        })

        // Send the command
        await electronAPI.terminalWrite(termId, command + '\n')

        // Timeout safety
        setTimeout(() => {
          if (task.status === 'running') {
            task.status = 'failed'
            task.output += '\n[Timed out after 60s]'
            task.exitCode = 124
            task.endTime = Date.now()
            unsub()
            unsubExit()
            electronAPI.terminalKill(termId)
            this.notify()
          }
        }, 60000)
      } catch (error: any) {
        task.output = error.message || 'Execution failed'
        task.status = 'failed'
        task.exitCode = 1
        task.endTime = Date.now()
      }
    } else {
      // Browser mock
      task.output = `$ ${command}\n\n[Simulated output for: ${name}]\n\n> ${command}\n\nDone.`
      task.status = 'completed'
      task.exitCode = 0
      task.endTime = Date.now()
    }

    this.notify()
    return task
  }

  async runCommand(command: string, cwd?: string): Promise<Task> {
    return this.runScript('custom', command, cwd)
  }

  cancelTask(id: string) {
    const task = this.tasks.get(id)
    if (task && task.status === 'running') {
      task.status = 'cancelled'
      task.endTime = Date.now()
      this.notify()
    }
  }

  // ── Common Tasks ───────────────────────────────────────────

  getCommonTasks(): { name: string; command: string; icon: string }[] {
    return [
      { name: 'Install', command: 'npm install', icon: '📦' },
      { name: 'Dev', command: 'npm run dev', icon: '▶️' },
      { name: 'Build', command: 'npm run build', icon: '🔨' },
      { name: 'Test', command: 'npm test', icon: '🧪' },
      { name: 'Lint', command: 'npm run lint', icon: '🔍' },
      { name: 'Type Check', command: 'npm run typecheck', icon: '📝' },
      { name: 'Clean', command: 'rm -rf node_modules dist', icon: '🧹' },
      { name: 'Format', command: 'npx prettier --write .', icon: '✨' },
    ]
  }

  // ── Accessors ──────────────────────────────────────────────

  getTask(id: string): Task | undefined { return this.tasks.get(id) }
  getAllTasks(): Task[] { return Array.from(this.tasks.values()) }
  getRecentTasks(count: number = 10): Task[] {
    return this.getAllTasks().sort((a, b) => (b.startTime || 0) - (a.startTime || 0)).slice(0, count)
  }

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }
}

export const taskRunnerService = new TaskRunnerService()
export default taskRunnerService
