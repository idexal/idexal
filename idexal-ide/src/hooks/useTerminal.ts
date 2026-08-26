import { useState, useCallback, useRef, useEffect } from 'react'

export interface TerminalSession {
  id: string
  name: string
  history: string[]
  currentDir: string
  isActive: boolean
}

const INITIAL_CWD = '/workspace/idexal-ide'

export function useTerminal() {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: '1',
      name: 'Terminal 1',
      history: [
        '$ Welcome to Idexal IDE Terminal',
        `$ Working directory: ${INITIAL_CWD}`,
        '$ Type "help" for available commands',
        '',
      ],
      currentDir: INITIAL_CWD,
      isActive: true,
    },
  ])
  const [activeSessionId, setActiveSessionId] = useState('1')
  const historyRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find(s => s.id === activeSessionId)

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [activeSession?.history])

  const executeCommand = useCallback((command: string) => {
    if (!command.trim()) return

    const newHistory = [...(activeSession?.history || []), `$ ${command}`]
    const output = simulateCommand(command, activeSession?.currentDir || INITIAL_CWD)

    let newDir = activeSession?.currentDir || INITIAL_CWD

    if (output !== null) {
      if (output === '__CLEAR__') {
        newHistory.length = 0
        newHistory.push('$ Terminal cleared')
      } else if (output === '__CD__') {
        const parts = command.trim().split(/\s+/)
        if (parts.length > 1) {
          const target = parts[1]
          if (target === '..') {
            const segments = newDir.split('/')
            segments.pop()
            newDir = segments.join('/') || '/'
          } else if (target.startsWith('/')) {
            newDir = target
          } else {
            newDir = newDir + '/' + target
          }
          newHistory.push('')
        }
      } else if (output) {
        newHistory.push(...(Array.isArray(output) ? output : [output]))
      }
    }

    setSessions(sessions.map(s =>
      s.id === activeSessionId
        ? { ...s, history: newHistory, currentDir: newDir }
        : s
    ))
  }, [activeSession, activeSessionId, sessions])

  const addSession = useCallback(() => {
    const newSession: TerminalSession = {
      id: String(Date.now()),
      name: `Terminal ${sessions.length + 1}`,
      history: [`$ Welcome to Terminal ${sessions.length + 1}`],
      currentDir: activeSession?.currentDir || INITIAL_CWD,
      isActive: true,
    }
    setSessions([...sessions, newSession])
    setActiveSessionId(newSession.id)
  }, [sessions, activeSession])

  const closeSession = useCallback((id: string) => {
    if (sessions.length === 1) return
    const newSessions = sessions.filter(s => s.id !== id)
    setSessions(newSessions)
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0].id)
    }
  }, [sessions, activeSessionId])

  const clearSession = useCallback(() => {
    setSessions(sessions.map(s =>
      s.id === activeSessionId
        ? { ...s, history: ['$ '] }
        : s
    ))
  }, [sessions, activeSessionId])

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    executeCommand,
    addSession,
    closeSession,
    clearSession,
    historyRef,
  }
}

function simulateCommand(command: string, currentDir: string): string | string[] | null {
  const parts = command.trim().split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)

  switch (cmd) {
    case 'help':
      return [
        '╔══════════════════════════════════════╗',
        '║     Idexal IDE Terminal Commands      ║',
        '╚══════════════════════════════════════╝',
        '',
        'Navigation:',
        '  ls [path]           List directory contents',
        '  cd <path>           Change directory',
        '  pwd                 Print working directory',
        '  cat <file>          Display file contents',
        '',
        'Files:',
        '  mkdir <name>        Create directory',
        '  touch <name>        Create file',
        '  rm <path>           Remove file',
        '  cp <src> <dst>      Copy file',
        '  mv <src> <dst>      Move/rename file',
        '',
        'Git:',
        '  git status          Show working tree status',
        '  git log [--oneline] Show commit log',
        '  git branch          List branches',
        '  git diff            Show changes',
        '',
        'Development:',
        '  npm run dev         Start dev server',
        '  npm test            Run tests',
        '  npm run build       Build project',
        '  cargo build         Build Rust engine',
        '  cargo test          Run Rust tests',
        '',
        'Utilities:',
        '  clear / cls         Clear terminal',
        '  echo <text>         Print text',
        '  date                Show date/time',
        '  whoami              Show user',
        '  env                 Show environment',
        '  which <cmd>         Show command path',
        '  history             Show command history',
        '',
        'Shortcuts:',
        '  Ctrl+L              Clear terminal',
        '  ↑/↓                 Command history',
      ]

    case 'clear':
    case 'cls':
      return '__CLEAR__'

    case 'ls': {
      const target = args[0] || currentDir
      const items = getDirectoryContents(target)
      if (typeof items === 'string') return items
      return items
    }

    case 'cd':
      return args.length === 0 ? `${currentDir}` : '__CD__'

    case 'pwd':
      return currentDir

    case 'echo':
      return args.join(' ') || ''

    case 'date':
      return new Date().toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })

    case 'whoami':
      return 'developer'

    case 'cat':
      if (args.length === 0) return 'cat: missing file operand'
      return getFileContents(args[0])

    case 'mkdir':
      return args.length === 0 ? 'mkdir: missing operand' : null

    case 'touch':
      return args.length === 0 ? 'touch: missing file operand' : null

    case 'rm':
      return args.length === 0 ? 'rm: missing operand' : null

    case 'which':
      return args.length === 0 ? 'which: missing argument' : `/usr/bin/${args[0]}`

    case 'env':
      return [
        'SHELL=/bin/zsh',
        'PATH=/usr/local/bin:/usr/bin:/bin',
        'HOME=/home/developer',
        'EDITOR=idexal',
        'TERM=xterm-256color',
        `PWD=${currentDir}`,
        'NODE_ENV=development',
      ]

    case 'history':
      return ['(history not available in this session)']

    case 'git':
      return simulateGit(args)

    case 'npm':
      return simulateNpm(args)

    case 'cargo':
      return simulateCargo(args)

    case 'node':
      if (args.length === 0) return 'Welcome to Node.js v20.11.0.\nType ".help" for more information.'
      return `> ${args.join(' ')}`

    case 'python':
    case 'python3':
      if (args.length === 0) return 'Python 3.11.0 (main, Oct 24 2023)\n>>>'
      return `>>> ${args.join(' ')}`

    case 'rustc':
      return args.length === 0 ? 'rustc 1.75.0 (82e1608df 2023-12-21)' : null

    case 'curl':
      if (args.length === 0) return 'curl: try \'curl --help\' for more information'
      return `curl: connecting to ${args[0]}... connected.\nHTTP/1.1 200 OK`

    case 'grep':
      return args.length < 2 ? 'grep: missing arguments' : null

    case 'sed':
      return args.length < 2 ? 'sed: no expression' : null

    default:
      return `zsh: command not found: ${cmd}\n\nType "help" for available commands.`
  }
}

function getDirectoryContents(dirPath: string): string[] | string {
  const dirName = dirPath.split('/').pop() || ''

  const MOCK_DIRS: Record<string, string[]> = {
    '': [
      'src/              rust-engine/       electron/',
      'node_modules/     package.json       tsconfig.json',
      'vite.config.ts    tailwind.config.js README.md',
      '.gitignore        index.html         LICENSE',
    ],
    'workspace': [
      'idexal-ide/',
    ],
    'src': [
      'components/       hooks/            services/',
      'stores/           styles/           utils/',
      'App.tsx           main.tsx',
    ],
    'components': [
      'AI/               ActivityBar/      Breadcrumb/',
      'Debug/            Diff/             Editor/',
      'ErrorBoundary/    Git/              Layout/',
      'Notifications/    QuickOpen/        Search/',
      'Settings/         Snippets/         Terminal/',
      'Welcome/',
    ],
    'AI': [
      'ChatPanel.tsx          MarkdownRenderer.tsx',
      'StreamingMessage.tsx',
    ],
    'Editor': [
      'EditorArea.tsx     MonacoEditor.tsx  TabBar.tsx',
    ],
    'Layout': [
      'CommandPalette.tsx  Sidebar.tsx',
      'StatusBar.tsx       TitleBar.tsx',
    ],
    'hooks': [
      'useAgent.ts        useTerminal.ts',
    ],
    'services': [
      'aiService.ts           codeActionService.ts',
      'contextWindowManager.ts  exportImportService.ts',
      'fileSystemService.ts   gitService.ts',
      'keyboardService.ts     pluginService.ts',
      'projectContextService.ts  snippetService.ts',
      'themeService.ts',
    ],
    'stores': [
      'agentStore.ts      editorStore.ts',
      'memoryStore.ts     settingsStore.ts',
    ],
    'rust-engine': [
      'Cargo.toml         build.rs',
      'src/',
    ],
    'electron': [
      'src/',
    ],
    'node_modules': ['(not listing contents)'],
  }

  return MOCK_DIRS[dirName] || MOCK_DIRS['']
}

function getFileContents(filename: string): string {
  const files: Record<string, string> = {
    'package.json': `{
  "name": "idexal-ide",
  "version": "1.0.0",
  "description": "AI-Powered Multi-Agent IDE",
  "scripts": {
    "dev": "concurrently \\"vite\\" \\"wait-on http://localhost:5173 && electron .\\"",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}`,
    'README.md': `# Idexal IDE

AI-Powered Multi-Agent Development Environment built with
Rust + Electron + React + TypeScript.

## Features
- Multi-Agent AI System
- Real-time Code Generation
- Built-in Terminal
- Git Integration
- Monaco Editor

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\``,
    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler"
  }
}`,
  }

  return files[filename] || `// ${filename}\n// (file contents not available in preview)`
}

function simulateGit(args: string[]): string[] {
  const subcmd = args[0]

  if (subcmd === 'status') {
    return [
      'On branch main',
      'Your branch is up to date with \'origin/main\'.',
      '',
      'nothing to commit, working tree clean',
    ]
  }

  if (subcmd === 'log') {
    const oneline = args.includes('--oneline') || args.includes('-1')
    if (oneline) {
      return [
        'a1b2c3d (HEAD -> main) feat: implement AI streaming',
        'e4f5g6h fix: resolve stale closure bug',
        'i7j8k9l refactor: improve context window ordering',
        'm0n1o2p feat: add code action service',
        'q3r4s5t initial project scaffold',
      ]
    }
    return [
      'commit a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
      'Author: Developer <dev@idexal.ai>',
      'Date:   ' + new Date().toUTCString(),
      '',
      '    feat: implement AI streaming',
      '',
      '    - Add SSE streaming for OpenAI responses',
      '    - Add streaming message component',
      '    - Wire up chat panel with streaming',
    ]
  }

  if (subcmd === 'branch') {
    return [
      '* main',
      '  develop',
      '  feature/ai-streaming',
      '  feature/git-integration',
    ]
  }

  if (subcmd === 'diff') {
    return [
      'diff --git a/src/App.tsx b/src/App.tsx',
      'index a1b2c3d..e4f5g6h 100644',
      '--- a/src/App.tsx',
      '+++ b/src/App.tsx',
      '@@ -10,6 +10,8 @@',
      ' import Sidebar from "./components/Layout/Sidebar"',
      ' import EditorArea from "./components/Editor/EditorArea"',
      '+import ChatPanel from "./components/AI/ChatPanel"',
      '+import TerminalPanel from "./components/Terminal/TerminalPanel"',
    ]
  }

  if (subcmd === 'add') {
    return args.length <= 1 ? ['fatal: pathspec \'\' did not match any files'] : []
  }

  if (subcmd === 'commit') {
    const msgIdx = args.indexOf('-m')
    if (msgIdx === -1) return ['hint: use "git commit -m \\"message\\""']
    const msg = args.slice(msgIdx + 1).join(' ').replace(/"/g, '')
    return [
      `[main a1b2c3d] ${msg}`,
      ' 1 file changed, 5 insertions(+), 2 deletions(-)',
    ]
  }

  if (subcmd === 'push') {
    return [
      'Enumerating objects: 5, done.',
      'Counting objects: 100% (5/5), done.',
      'Writing objects: 100% (3/3), 1.2 KiB, done.',
      'To github.com:idexal/ide.git',
      '   a1b2c3d..e4f5g6h  main -> main',
    ]
  }

  if (subcmd === 'pull') {
    return [
      'Already up to date.',
    ]
  }

  return subcmd
    ? [`git: '${subcmd}' is not a git command. See 'git --help'.`]
    : ['usage: git [<command> [<args>]]']
}

function simulateNpm(args: string[]): string[] {
  if (args[0] === 'run' && args[1] === 'dev') {
    return [
      '> idexal-ide@1.0.0 dev',
      '> concurrently "vite" "wait-on http://localhost:5173 && electron ."',
      '',
      '[0]',
      '[0]   VITE v5.0.12  ready in 312 ms',
      '[0]',
      '[0]   ➜  Local:   http://localhost:5173/',
      '[0]   ➜  Network: use --host to expose',
      '[1] Starting Electron...',
    ]
  }

  if (args[0] === 'run' && args[1] === 'build') {
    return [
      '> idexal-ide@1.0.0 build',
      '> vite build',
      '',
      'vite v5.0.12 building for production...',
      '✓ 72 modules transformed.',
      'dist/index.html              0.46 kB │ gzip:  0.30 kB',
      'dist/assets/index-Dkf8H2.js  271.93 kB │ gzip: 86.73 kB',
      'dist/assets/index-dJ3K1.css   26.15 kB │ gzip:  5.24 kB',
      '✓ built in 3.12s',
    ]
  }

  if (args[0] === 'test' || args[0] === 'run' && args[1] === 'test') {
    return [
      '',
      ' ✓ src/__tests__/agentStore.test.ts   (5 tests) 4ms',
      ' ✓ src/__tests__/memoryStore.test.ts   (6 tests) 4ms',
      ' ✓ src/__tests__/editorStore.test.ts   (6 tests) 3ms',
      ' ✓ src/__tests__/utils.test.ts        (12 tests) 3ms',
      ' ✓ src/__tests__/bugfixes.test.ts     (10 tests) 4ms',
      ' ✓ src/__tests__/services.test.ts     (17 tests) 7ms',
      '',
      ' Test Files  6 passed (6)',
      '      Tests  56 passed (56)',
      '   Duration  1.13s',
    ]
  }

  if (args[0] === 'install' || args[0] === 'i') {
    return [
      'added 412 packages, and audited 413 packages in 12s',
      '',
      '56 packages are looking for funding',
      '  run `npm fund` for details',
      '',
      'found 0 vulnerabilities',
    ]
  }

  if (args[0] === 'start') {
    return [
      '> idexal-ide@1.0.0 start',
      '> electron .',
    ]
  }

  return args.length === 0
    ? ['npm v10.2.4']
    : [`npm v10.2.4`]
}

function simulateCargo(args: string[]): string[] {
  if (args[0] === 'build') {
    return [
      '   Compiling idexal-engine v0.1.0 (C:\\workspace\\idexal-ide\\rust-engine)',
      '    Finished release [optimized] target(s) in 45.32s',
    ]
  }

  if (args[0] === 'test') {
    return [
      '   Compiling idexal-engine v0.1.0',
      '    Finished test [unoptimized + debuginfo] target(s) in 8.14s',
      '     Running unittests src\\lib.rs (target\\debug\\deps\\idexal_engine-abc123.exe)',
      '',
      'running 4 tests',
      'test agent::test_agent_creation ... ok',
      'test memory::test_memory_store ... ok',
      'test parser::test_parse_code ... ok',
      'test agent::test_orchestration ... ok',
      '',
      'test result: ok. 4 passed; 0 failed; 0 ignored',
    ]
  }

  if (args[0] === 'run') {
    return ['     Running `target\\release\\idexal-engine`']
  }

  if (args[0] === 'clippy') {
    return [
      '    Finished dev profile [unoptimized + debuginfo] target(s)',
      'warning: 2 warnings emitted',
    ]
  }

  if (args[0] === 'fmt') {
    return []
  }

  return args.length === 0
    ? ['cargo 1.75.0 (1d8b05fdd 2023-11-20)']
    : [`cargo ${args.join(' ')}`]
}
