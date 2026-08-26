#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    IDEXAL CLI v1.0.0                        ║
 * ║        AI-Powered Multi-Agent IDE Command Line Tool         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   idexal                          Launch the IDE
 *   idexal .                        Open current directory
 *   idexal <path>                   Open specific file or folder
 *   idexal init                     Initialize a new project
 *   idexal ai <prompt>              Send prompt to AI agent
 *   idexal git <command>            Run git operations
 *   idexal serve                    Start dev server
 *   idexal config                   Open configuration
 *   idexal version                  Show version
 *   idexal help                     Show help
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Version ────────────────────────────────────────────────
const VERSION = '1.0.0';
const APP_NAME = 'Idexal';

// ── Colors (ANSI) ──────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

// ── Helpers ────────────────────────────────────────────────
function log(msg) { console.log(msg); }
function logError(msg) { console.error(`${c.red}✖ ${msg}${c.reset}`); }
function logSuccess(msg) { console.log(`${c.green}✔ ${msg}${c.reset}`); }
function logInfo(msg) { console.log(`${c.cyan}ℹ ${msg}${c.reset}`); }
function logWarn(msg) { console.log(`${c.yellow}⚠ ${msg}${c.reset}`); }

function getProjectRoot() {
  // Walk up from cwd to find package.json with idexal-ide
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'idexal-ide' || pkg.name === 'freebuff-ide') {
          return dir;
        }
      } catch {}
    }
    dir = path.dirname(dir);
  }
  // Fallback: assume we're in the project
  return process.cwd();
}

function isElectronAvailable() {
  const root = getProjectRoot();
  return fs.existsSync(path.join(root, 'electron', 'src', 'main.ts'));
}

// ── Banner ─────────────────────────────────────────────────
function showBanner() {
  log(`
${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ${c.white}██╗██████╗ ████████╗${c.cyan}    ███████╗██╗   ██╗███████╗${c.reset}${c.bold}${c.cyan}   ║
║   ${c.white}██║██╔══██╗╚══██╔══╝${c.cyan}    ██╔════╝╚██╗ ██╔╝██╔════╝${c.reset}${c.bold}${c.cyan}   ║
║   ${c.white}██║██████╔╝   ██║${c.cyan}       ███████╗ ╚████╔╝ ███████╗${c.reset}${c.bold}${c.cyan}   ║
║   ${c.white}██║██╔══██╗   ██║${c.cyan}       ╚════██║  ╚██╔╝  ╚════██║${c.reset}${c.bold}${c.cyan}   ║
║   ${c.white}██║██║  ██║   ██║${c.cyan}       ███████║   ██║   ███████║${c.reset}${c.bold}${c.cyan}   ║
║   ${c.white}╚═╝╚═╝  ╚═╝   ╚═╝${c.cyan}       ╚══════╝   ╚═╝   ╚══════╝${c.reset}${c.bold}${c.cyan}   ║
║                                                          ║
║   ${c.white}AI-Powered Multi-Agent Development Environment${c.cyan}        ║
║   ${c.dim}v${VERSION}${c.reset}                                              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝${c.reset}
`);
}

// ── Help ───────────────────────────────────────────────────
function showHelp() {
  showBanner();
  log(`${c.bold}Usage:${c.reset}
  ${c.cyan}idexal${c.reset}                          Launch the IDE (GUI)
  ${c.cyan}idexal .${c.reset}                        Open current directory
  ${c.cyan}idexal <path>${c.reset}                   Open file or folder
  ${c.cyan}idexal init${c.reset}                    Initialize new project
  ${c.cyan}idexal ai <prompt>${c.reset}              Chat with AI agent
  ${c.cyan}idexal git status${c.reset}               Show git status
  ${c.cyan}idexal git log${c.reset}                  Show git log
  ${c.cyan}idexal git diff${c.reset}                 Show git diff
  ${c.cyan}idexal git commit <msg>${c.reset}          Commit changes
  ${c.cyan}idexal serve${c.reset}                    Start dev server
  ${c.cyan}idexal serve --port <n>${c.reset}           Start on specific port
  ${c.cyan}idexal config${c.reset}                   Open config file
  ${c.cyan}idexal config set <key> <value>${c.reset}  Set config value
  ${c.cyan}idexal config get <key>${c.reset}          Get config value
  ${c.cyan}idexal version${c.reset}                  Show version
  ${c.cyan}idexal help${c.reset}                     Show this help

${c.bold}Examples:${c.reset}
  ${c.dim}$ idexal .${c.reset}                       # Open current folder
  ${c.dim}$ idexal src/App.tsx${c.reset}             # Open specific file
  ${c.dim}$ idexal init react-typescript${c.reset}   # Create React+TS project
  ${c.dim}$ idexal ai "add user authentication"${c.reset}  # AI assistance
  ${c.dim}$ idexal git commit "feat: new feature"${c.reset}  # Git commit
  ${c.dim}$ idexal serve --port 3000${c.reset}       # Start on port 3000

${c.bold}Config:${c.reset}
  ${c.dim}~/.idexal/config.json${c.reset}    Global configuration
  ${c.dim}./.idexal.json${c.reset}           Project configuration

${c.bold}Docs:${c.reset}
  ${c.cyan}https://github.com/idexal/idexal-ide${c.reset}
`);
}

// ── Launch Electron App ────────────────────────────────────
function launchIDE(targetPath) {
  const root = getProjectRoot();

  if (isElectronAvailable()) {
    // Check if node_modules exists
    if (!fs.existsSync(path.join(root, 'node_modules'))) {
      logInfo('Installing dependencies...');
      execSync('npm install', { cwd: root, stdio: 'inherit' });
    }

    logInfo(`Launching ${APP_NAME} IDE...`);
    const electron = spawn('npx', ['electron', '.', targetPath || ''].filter(Boolean), {
      cwd: root,
      stdio: 'ignore',
      detached: true,
    });
    electron.unref();
    logSuccess(`${APP_NAME} IDE launched (PID: ${electron.pid})`);
  } else {
    // Fallback: open in browser via Vite
    logInfo(`Starting ${APP_NAME} dev server...`);
    const port = 5173;
    const vite = spawn('npx', ['vite', '--port', String(port)], {
      cwd: root,
      stdio: 'inherit',
    });
    logSuccess(`${APP_NAME} IDE running at http://localhost:${port}`);
    logInfo('Press Ctrl+C to stop');
  }
}

// ── Serve ──────────────────────────────────────────────────
function serve(port = 5173) {
  const root = getProjectRoot();

  if (!fs.existsSync(path.join(root, 'node_modules'))) {
    logInfo('Installing dependencies...');
    execSync('npm install', { cwd: root, stdio: 'inherit' });
  }

  logInfo(`Starting ${APP_NAME} dev server on port ${port}...`);
  const vite = spawn('npx', ['vite', '--port', String(port), '--host'], {
    cwd: root,
    stdio: 'inherit',
  });

  logSuccess(`${APP_NAME} dev server running at http://localhost:${port}`);
  logInfo('Press Ctrl+C to stop');

  process.on('SIGINT', () => { vite.kill(); process.exit(0); });
}

// ── Init Project ───────────────────────────────────────────
function initProject(template) {
  const templates = {
    'react': 'React + TypeScript',
    'react-typescript': 'React + TypeScript',
    'rust': 'Rust + TypeScript',
    'fullstack': 'Full-stack (React + Rust)',
    'default': 'React + TypeScript',
  };

  const templateName = templates[template] || templates['default'];
  logInfo(`Initializing ${templateName} project...`);

  // Create project structure
  const dirs = [
    'src/components',
    'src/hooks',
    'src/services',
    'src/stores',
    'src/utils',
    'src/styles',
    'electron/src',
    'public',
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
    logSuccess(`Created ${dir}/`);
  });

  // Create package.json
  const pkg = {
    name: 'my-idexal-project',
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      test: 'vitest',
      'idexal': 'idexal',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      zustand: '^4.4.0',
      'lucide-react': '^0.300.0',
    },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@vitejs/plugin-react': '^4.2.0',
      typescript: '^5.3.0',
      vite: '^5.0.0',
      vitest: '^1.0.0',
    },
  };

  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  logSuccess('Created package.json');

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
    },
    include: ['src'],
  };

  fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
  logSuccess('Created tsconfig.json');

  // Create vite.config.ts
  fs.writeFileSync('vite.config.ts', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
})`);
  logSuccess('Created vite.config.ts');

  // Create src/App.tsx
  fs.writeFileSync('src/App.tsx', `import React from 'react'

export default function App() {
  const [count, setCount] = React.useState(0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Idexal IDE</h1>
      <p>AI-Powered Multi-Agent Development Environment</p>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  )
}`);
  logSuccess('Created src/App.tsx');

  // Create src/main.tsx
  fs.writeFileSync('src/main.tsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`);
  logSuccess('Created src/main.tsx');

  // Create index.html
  fs.writeFileSync('index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Idexal Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
  logSuccess('Created index.html');

  // Create README.md
  fs.writeFileSync('README.md', `# My Idexal Project

Created with Idexal IDE v${VERSION}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Commands

- \`npm run dev\` - Start dev server
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
- \`idexal\` - Launch Idexal IDE
- \`idexal ai "prompt"\` - Chat with AI agent
`);
  logSuccess('Created README.md');

  log('');
  logSuccess(`${c.bold}Project initialized successfully!${c.reset}`);
  log('');
  log(`  ${c.dim}Next steps:${c.reset}`);
  log(`  ${c.cyan}cd .${c.reset}`);
  log(`  ${c.cyan}npm install${c.reset}`);
  log(`  ${c.cyan}idexal${c.reset}                    # Launch IDE`);
  log(`  ${c.cyan}npm run dev${c.reset}               # Or just start dev server`);
  log('');
}

// ── Git Operations ─────────────────────────────────────────
function gitCommand(args) {
  const root = getProjectRoot();
  const cmd = args.join(' ');

  try {
    const output = execSync(`git ${cmd}`, { cwd: root, encoding: 'utf-8', stdio: 'pipe' });
    log(output);
    return output;
  } catch (error) {
    logError(`Git error: ${error.message}`);
    return null;
  }
}

// ── AI Command ─────────────────────────────────────────────
function aiCommand(prompt) {
  log('');
  log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
  log(`${c.bold}${c.cyan}║           ${APP_NAME} AI Agent                        ║${c.reset}`);
  log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}`);
  log('');
  log(`${c.dim}Prompt: ${c.white}${prompt}${c.reset}`);
  log('');

  // Check for API key
  const configPath = path.join(os.homedir(), '.idexal', 'config.json');
  let apiKey = '';
  let provider = 'openai';

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      apiKey = config.ai?.apiKey || '';
      provider = config.ai?.provider || 'openai';
    } catch {}
  }

  if (!apiKey) {
    logWarn('No AI provider configured. Set up with:');
    log(`  ${c.cyan}idexal config set ai.apiKey <your-key>${c.reset}`);
    log(`  ${c.cyan}idexal config set ai.provider openai${c.reset}`);
    log('');
    logInfo('Launching IDE for AI chat...');
    launchIDE();
    return;
  }

  logInfo(`Using ${provider} API...`);

  // Dynamic import for fetch (Node 18+)
  const https = require('https');
  const url = require('url');

  const endpoints = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
  };

  const body = provider === 'anthropic'
    ? JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
    : JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      });

  const headers = provider === 'anthropic'
    ? {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
    : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };

  const endpoint = url.parse(endpoints[provider]);
  const reqOptions = {
    hostname: endpoint.hostname,
    port: 443,
    path: endpoint.path,
    method: 'POST',
    headers,
  };

  log(`${c.bold}AI Response:${c.reset}`);
  log(`${c.dim}${'─'.repeat(50)}${c.reset}`);

  const req = https.request(reqOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        let content = '';
        if (provider === 'anthropic') {
          content = json.content?.[0]?.text || 'No response';
        } else {
          content = json.choices?.[0]?.message?.content || 'No response';
        }
        log(content);
        log(`${c.dim}${'─'.repeat(50)}${c.reset}`);
        logSuccess('AI response received');
      } catch (e) {
        logError(`Failed to parse AI response: ${e.message}`);
        log(data);
      }
    });
  });

  req.on('error', (e) => {
    logError(`AI request failed: ${e.message}`);
  });

  req.write(body);
  req.end();
}

// ── Config Operations ──────────────────────────────────────
function configCommand(args) {
  const configDir = path.join(os.homedir(), '.idexal');
  const configPath = path.join(configDir, 'config.json');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  if (args.length === 0) {
    // Show config
    log(`${c.bold}${c.cyan}${APP_NAME} Configuration${c.reset}`);
    log(`${c.dim}${'─'.repeat(40)}${c.reset}`);
    log(JSON.stringify(config, null, 2));
    log('');
    log(`${c.dim}Config file: ${configPath}${c.reset}`);
    return;
  }

  const sub = args[0];

  if (sub === 'set' && args.length >= 3) {
    const key = args[1];
    const value = args.slice(2).join(' ');
    const keys = key.split('.');
    let obj = config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    // Try to parse as JSON, otherwise keep as string
    try { obj[keys[keys.length - 1]] = JSON.parse(value); } catch { obj[keys[keys.length - 1]] = value; }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logSuccess(`Set ${key} = ${value}`);
  } else if (sub === 'get' && args.length >= 2) {
    const key = args[1];
    const keys = key.split('.');
    let obj = config;
    for (const k of keys) {
      obj = obj?.[k];
    }
    if (obj !== undefined) {
      log(typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj));
    } else {
      logWarn(`Key "${key}" not found in config`);
    }
  } else if (sub === 'path') {
    log(configPath);
  } else if (sub === 'open') {
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec(`start "" "${configPath}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${configPath}"`);
    } else {
      exec(`xdg-open "${configPath}"`);
    }
  } else {
    logError(`Unknown config command: ${sub}`);
    log(`  idexal config                  Show config`);
    log(`  idexal config set <key> <val>  Set value`);
    log(`  idexal config get <key>        Get value`);
    log(`  idexal config path             Show config path`);
    log(`  idexal config open             Open config file`);
  }
}

// ── Version ────────────────────────────────────────────────
function showVersion() {
  log(`${c.bold}${c.cyan}${APP_NAME} CLI${c.reset} ${c.dim}v${VERSION}${c.reset}`);
  log(`${c.dim}AI-Powered Multi-Agent Development Environment${c.reset}`);

  // Check if IDE is installed
  const root = getProjectRoot();
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      log(`${c.dim}IDE: v${pkg.version}${c.reset}`);
    } catch {}
  }

  // Check Node.js version
  log(`${c.dim}Node: ${process.version}${c.reset}`);
  log(`${c.dim}Platform: ${process.platform} ${process.arch}${c.reset}`);
}

// ── Main CLI Parser ────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);

  // No arguments - launch IDE
  if (!cmd) {
    launchIDE();
    return;
  }

  // Parse commands
  switch (cmd) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case 'version':
    case '--version':
    case '-v':
      showVersion();
      break;

    case 'serve':
    case 'dev':
      const portIdx = rest.indexOf('--port');
      const port = portIdx !== -1 ? parseInt(rest[portIdx + 1]) || 5173 : 5173;
      serve(port);
      break;

    case 'init':
      initProject(rest[0]);
      break;

    case 'ai':
      if (rest.length === 0) {
        logError('Please provide a prompt');
        log(`  ${c.cyan}idexal ai "add user authentication"${c.reset}`);
      } else {
        aiCommand(rest.join(' '));
      }
      break;

    case 'git':
      if (rest.length === 0) {
        gitCommand(['status']);
      } else {
        gitCommand(rest);
      }
      break;

    case 'config':
      configCommand(rest);
      break;

    case 'open':
      launchIDE(rest[0]);
      break;

    case 'status':
      showVersion();
      log('');
      const root = getProjectRoot();
      log(`${c.bold}Project:${c.reset} ${root}`);
      log(`${c.bold}Electron:${c.reset} ${isElectronAvailable() ? c.green + 'Available' : c.yellow + 'Not found'}`);

      // Check git
      try {
        const branch = execSync('git branch --show-current', { cwd: root, encoding: 'utf-8', stdio: 'pipe' }).trim();
        log(`${c.bold}Git:${c.reset} ${c.green}On branch ${branch}${c.reset}`);
      } catch {
        log(`${c.bold}Git:${c.reset} ${c.yellow}Not a git repository${c.reset}`);
      }
      break;

    case 'update':
      logInfo('Updating Idexal IDE...');
      try {
        execSync('git pull', { cwd: getProjectRoot(), stdio: 'inherit' });
        execSync('npm install', { cwd: getProjectRoot(), stdio: 'inherit' });
        logSuccess('Updated successfully!');
      } catch (e) {
        logError(`Update failed: ${e.message}`);
      }
      break;

    default:
      // If path starts with . or / or looks like a file, open it
      if (cmd.startsWith('.') || cmd.startsWith('/') || cmd.startsWith('~') || cmd.includes('/') || cmd.includes('\\')) {
        const targetPath = path.resolve(cmd);
        if (fs.existsSync(targetPath)) {
          launchIDE(targetPath);
        } else {
          logError(`Path not found: ${cmd}`);
        }
      } else {
        logError(`Unknown command: ${cmd}`);
        log(`  Run ${c.cyan}idexal help${c.reset} for available commands`);
      }
      break;
  }
}

main();
