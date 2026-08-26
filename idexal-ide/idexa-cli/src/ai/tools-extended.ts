/**
 * Extended AI Tools — additional capabilities for the agentic tool loop.
 * These tools give the AI deeper project awareness and more powerful actions.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export type ToolExecutor = (args: Record<string, any>) => Promise<string>;

// ── Tool definitions ──────────────────────────────────────────

export const extendedTools: { definition: ToolDefinition; executor: ToolExecutor }[] = [
  // 1. Analyze project structure and dependencies
  {
    definition: {
      type: 'function',
      function: {
        name: 'analyze_project',
        description: 'Analyze the project structure, dependencies, and configuration. Returns a comprehensive overview of the project type, key files, dependencies, and architecture.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project root path (default: cwd)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      const root = args.path || process.cwd();
      const lines: string[] = [];
      lines.push(`Project: ${path.basename(root)}`);
      lines.push(`Path: ${root}`);

      // Detect project type
      const configFiles = [
        'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py',
        'pom.xml', 'build.gradle', 'Makefile', 'CMakeLists.txt', 'Gemfile',
        'composer.json', 'pubspec.yaml', 'mix.exs', 'Package.swift',
      ];
      const foundConfigs = configFiles.filter(f => fs.existsSync(path.join(root, f)));
      lines.push(`Config files: ${foundConfigs.join(', ') || 'none detected'}`);

      // Detect project type
      if (foundConfigs.includes('package.json')) {
        lines.push('Type: Node.js/TypeScript');
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
          lines.push(`Name: ${pkg.name}`);
          lines.push(`Version: ${pkg.version}`);
          lines.push(`Description: ${pkg.description || '(none)'}`);
          const deps = Object.keys(pkg.dependencies || {});
          const devDeps = Object.keys(pkg.devDependencies || {});
          lines.push(`Dependencies: ${deps.length} (${deps.slice(0, 10).join(', ')}${deps.length > 10 ? '...' : ''})`);
          lines.push(`Dev Dependencies: ${devDeps.length} (${devDeps.slice(0, 10).join(', ')}${devDeps.length > 10 ? '...' : ''})`);

          // Detect frameworks
          const frameworks = [];
          if (deps.includes('react')) frameworks.push('React');
          if (deps.includes('vue')) frameworks.push('Vue');
          if (deps.includes('angular') || devDeps.includes('@angular/cli')) frameworks.push('Angular');
          if (deps.includes('next')) frameworks.push('Next.js');
          if (deps.includes('nuxt')) frameworks.push('Nuxt');
          if (deps.includes('express')) frameworks.push('Express');
          if (deps.includes('fastify')) frameworks.push('Fastify');
          if (deps.includes('tailwindcss') || devDeps.includes('tailwindcss')) frameworks.push('Tailwind CSS');
          if (devDeps.includes('typescript')) frameworks.push('TypeScript');
          if (devDeps.includes('vitest')) frameworks.push('Vitest');
          if (devDeps.includes('jest')) frameworks.push('Jest');
          if (devDeps.includes('eslint')) frameworks.push('ESLint');
          if (devDeps.includes('prettier')) frameworks.push('Prettier');
          if (devDeps.includes('playwright') || devDeps.includes('@playwright/test')) frameworks.push('Playwright');
          if (frameworks.length > 0) lines.push(`Frameworks: ${frameworks.join(', ')}`);

          // Detect scripts
          const scripts = Object.keys(pkg.scripts || {});
          if (scripts.length > 0) lines.push(`Scripts: ${scripts.join(', ')}`);
        } catch { /* ignore parse errors */ }
      } else if (foundConfigs.includes('Cargo.toml')) {
        lines.push('Type: Rust');
        try {
          const toml = fs.readFileSync(path.join(root, 'Cargo.toml'), 'utf-8');
          const nameMatch = toml.match(/name\s*=\s*"([^"]+)"/);
          const verMatch = toml.match(/version\s*=\s*"([^"]+)"/);
          if (nameMatch) lines.push(`Name: ${nameMatch[1]}`);
          if (verMatch) lines.push(`Version: ${verMatch[1]}`);
        } catch { /* ignore */ }
      } else if (foundConfigs.includes('go.mod')) {
        lines.push('Type: Go');
      } else if (foundConfigs.includes('pyproject.toml') || foundConfigs.includes('setup.py')) {
        lines.push('Type: Python');
      }

      // Count files by language
      const langCounts: Record<string, number> = {};
      const langMap: Record<string, string> = {
        '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
        '.rs': 'Rust', '.py': 'Python', '.go': 'Go', '.java': 'Java',
        '.cpp': 'C++', '.c': 'C', '.rb': 'Ruby', '.php': 'PHP',
        '.html': 'HTML', '.css': 'CSS', '.json': 'JSON', '.md': 'Markdown',
        '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML', '.sh': 'Shell',
      };
      const walk = (dir: string, depth: number) => {
        if (depth > 4) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            if (e.isDirectory() && !e.name.startsWith('.') && !['node_modules', 'target', 'dist', 'build', '.git', '__pycache__'].includes(e.name)) {
              walk(path.join(dir, e.name), depth + 1);
            } else if (e.isFile()) {
              const ext = path.extname(e.name).toLowerCase();
              const lang = langMap[ext] || 'Other';
              langCounts[lang] = (langCounts[lang] || 0) + 1;
            }
          }
        } catch { /* ignore */ }
      };
      walk(root, 0);
      const topLangs = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      if (topLangs.length > 0) {
        lines.push(`Languages: ${topLangs.map(([l, c]) => `${l}(${c})`).join(', ')}`);
      }
      const totalFiles = Object.values(langCounts).reduce((a, b) => a + b, 0);
      lines.push(`Total files: ${totalFiles}`);

      // Git info
      try {
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: root }).trim();
        const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8', cwd: root }).trim();
        const remote = execSync('git remote get-url origin', { encoding: 'utf-8', cwd: root }).trim();
        lines.push(`Git branch: ${branch}`);
        lines.push(`Total commits: ${commitCount}`);
        lines.push(`Remote: ${remote}`);
      } catch { /* not a git repo */ }

      return lines.join('\n');
    },
  },

  // 2. Get project tree (shallow or deep)
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_project_tree',
        description: 'Get a directory tree of the project. Shows folder structure up to specified depth.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Root path (default: cwd)' },
            max_depth: { type: 'number', description: 'Max depth (default: 3)' },
            show_files: { type: 'boolean', description: 'Show files (default: true)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      const root = args.path || process.cwd();
      const maxDepth = args.maxDepth || args.max_depth || 3;
      const showFiles = args.showFiles !== undefined ? args.showFiles : (args.show_files !== undefined ? args.show_files : true);
      const ignore = ['node_modules', 'target', 'dist', 'build', '.git', '__pycache__', '.next', 'coverage', '.cache', 'vendor'];

      const walk = (dir: string, depth: number, prefix: string, isLast: boolean): string => {
        if (depth > maxDepth) return '';
        let result = '';
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          const sorted = entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          });
          const filtered = sorted.filter(e => {
            if (e.isDirectory() && ignore.includes(e.name)) return false;
            if (!showFiles && e.isFile()) return false;
            return true;
          });
          for (let i = 0; i < filtered.length; i++) {
            const e = filtered[i];
            const isLastEntry = i === filtered.length - 1;
            const connector = isLastEntry ? '└── ' : '├── ';
            const childPrefix = isLastEntry ? '    ' : '│   ';
            if (e.isDirectory()) {
              result += `${prefix}${connector}📁 ${e.name}/\n`;
              result += walk(path.join(dir, e.name), depth + 1, prefix + childPrefix, isLastEntry);
            } else {
              const size = fs.statSync(path.join(dir, e.name)).size;
              const sizeStr = size > 1048576 ? `${(size / 1048576).toFixed(1)}MB` : size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
              result += `${prefix}${connector}📄 ${e.name} (${sizeStr})\n`;
            }
          }
        } catch {
          result += `${prefix}└── [permission denied]\n`;
        }
        return result;
      };

      return `📁 ${path.basename(root)}/\n${walk(root, 0, '', true)}`;
    },
  },

  // 3. Git diff — show changes
  {
    definition: {
      type: 'function',
      function: {
        name: 'git_diff',
        description: 'Show git diff for the repository. Can show staged, unstaged, or specific file diffs.',
        parameters: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Specific file to diff (optional)' },
            staged: { type: 'boolean', description: 'Show staged changes (default: false)' },
            cwd: { type: 'string', description: 'Repository root (optional)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      try {
        let cmd = 'git diff';
        if (args.staged) cmd += ' --staged';
        if (args.file) cmd += ` -- ${args.file}`;
        const output = execSync(cmd, { encoding: 'utf-8', cwd: args.cwd || process.cwd(), timeout: 15000, maxBuffer: 512 * 1024 });
        return output || '(no changes)';
      } catch (err: any) {
        return `ERROR: ${err.message}`;
      }
    },
  },

  // 4. Git log — commit history
  {
    definition: {
      type: 'function',
      function: {
        name: 'git_log',
        description: 'Show recent git commit history with details.',
        parameters: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of commits to show (default: 10)' },
            file: { type: 'string', description: 'Filter by file path (optional)' },
            cwd: { type: 'string', description: 'Repository root (optional)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      try {
        const count = args.count || 10;
        let cmd = `git log --oneline --decorate -${count}`;
        if (args.file) cmd += ` -- ${args.file}`;
        const output = execSync(cmd, { encoding: 'utf-8', cwd: args.cwd || process.cwd(), timeout: 10000 });
        return output || '(no commits)';
      } catch (err: any) {
        return `ERROR: ${err.message}`;
      }
    },
  },

  // 5. Git commit — stage and commit
  {
    definition: {
      type: 'function',
      function: {
        name: 'git_commit',
        description: 'Stage all changes and create a git commit with the given message.',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Commit message' },
            files: { type: 'array', items: { type: 'string' }, description: 'Specific files to stage (optional, defaults to all)' },
            cwd: { type: 'string', description: 'Repository root (optional)' },
          },
          required: ['message'],
        },
      },
    },
    executor: async (args) => {
      try {
        const cwd = args.cwd || process.cwd();
        if (args.files && args.files.length > 0) {
          execSync(`git add ${args.files.map((f: string) => `"${f}"`).join(' ')}`, { encoding: 'utf-8', cwd });
        } else {
          execSync('git add -A', { encoding: 'utf-8', cwd });
        }
        execSync(`git commit -m "${args.message.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', cwd });
        const log = execSync('git log --oneline -1', { encoding: 'utf-8', cwd });
        return `Committed successfully!\n${log.trim()}`;
      } catch (err: any) {
        return `ERROR: ${err.stderr || err.message}`;
      }
    },
  },

  // 6. Run tests
  {
    definition: {
      type: 'function',
      function: {
        name: 'run_tests',
        description: 'Run the project tests. Auto-detects test framework (jest, vitest, cargo test, pytest, go test).',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Test file pattern or name filter (optional)' },
            cwd: { type: 'string', description: 'Project root (optional)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      const cwd = args.cwd || process.cwd();
      const pattern = args.pattern || '';

      // Detect test framework
      if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
        const cmd = pattern ? `cargo test ${pattern}` : 'cargo test';
        try {
          return execSync(cmd, { encoding: 'utf-8', cwd, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
        } catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      if (fs.existsSync(path.join(cwd, 'go.mod'))) {
        try {
          return execSync(pattern ? `go test -run ${pattern} ./...` : 'go test ./...', { encoding: 'utf-8', cwd, timeout: 120000 });
        } catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      if (fs.existsSync(path.join(cwd, 'pyproject.toml')) || fs.existsSync(path.join(cwd, 'setup.py'))) {
        try {
          return execSync(pattern ? `pytest -k ${pattern}` : 'pytest', { encoding: 'utf-8', cwd, timeout: 120000 });
        } catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      // Node.js: try vitest, then jest
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
        const hasVitest = pkg.devDependencies?.vitest || pkg.dependencies?.vitest;
        const hasJest = pkg.devDependencies?.jest || pkg.dependencies?.jest;
        const testCmd = pkg.scripts?.test || (hasVitest ? 'vitest run' : hasJest ? 'jest' : null);
        if (testCmd) {
          const cmd = pattern ? `${testCmd} -- ${pattern}` : testCmd;
          return execSync(cmd, { encoding: 'utf-8', cwd, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
        }
      } catch (err: any) { return err.stdout + '\n' + err.stderr; }
      return 'No test framework detected. Install jest, vitest, pytest, or add cargo test.';
    },
  },

  // 7. Run build
  {
    definition: {
      type: 'function',
      function: {
        name: 'run_build',
        description: 'Build the project. Auto-detects build system (npm, cargo, go, make).',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Override build command (optional)' },
            cwd: { type: 'string', description: 'Project root (optional)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      const cwd = args.cwd || process.cwd();
      if (args.command) {
        try {
          return execSync(args.command, { encoding: 'utf-8', cwd, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
        } catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
        try { return execSync('cargo build --release', { encoding: 'utf-8', cwd, timeout: 300000 }); }
        catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      if (fs.existsSync(path.join(cwd, 'go.mod'))) {
        try { return execSync('go build ./...', { encoding: 'utf-8', cwd, timeout: 120000 }); }
        catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      if (fs.existsSync(path.join(cwd, 'package.json'))) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
          const buildScript = pkg.scripts?.build || 'npm run build';
          return execSync(buildScript, { encoding: 'utf-8', cwd, timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
        } catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      if (fs.existsSync(path.join(cwd, 'Makefile'))) {
        try { return execSync('make', { encoding: 'utf-8', cwd, timeout: 120000 }); }
        catch (err: any) { return err.stdout + '\n' + err.stderr; }
      }
      return 'No build system detected.';
    },
  },

  // 8. Find definitions (function, class, struct, etc.)
  {
    definition: {
      type: 'function',
      function: {
        name: 'find_definitions',
        description: 'Find function, class, struct, type, or interface definitions across the codebase.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the definition to find' },
            type: { type: 'string', description: 'Type filter: function, class, struct, type, interface, enum, trait, impl (optional)' },
            path: { type: 'string', description: 'Directory to search in (default: cwd)' },
          },
          required: ['name'],
        },
      },
    },
    executor: async (args) => {
      const patterns: Record<string, string> = {
        function: `(function\\s+${args.name}|fn\\s+${args.name}|def\\s+${args.name}|func\\s+${args.name})`,
        class: `(class\\s+${args.name})`,
        struct: `(struct\\s+${args.name})`,
        type: `(type\\s+${args.name})`,
        interface: `(interface\\s+${args.name})`,
        enum: `(enum\\s+${args.name})`,
        trait: `(trait\\s+${args.name})`,
        impl: `(impl\\s+${args.name})`,
      };
      const pattern = args.type && patterns[args.type]
        ? patterns[args.type]
        : `(function\\s+${args.name}|fn\\s+${args.name}|def\\s+${args.name}|func\\s+${args.name}|class\\s+${args.name}|struct\\s+${args.name}|interface\\s+${args.name}|enum\\s+${args.name}|trait\\s+${args.name})`;
      try {
        const cmd = `rg -n "${pattern}" --type-not json --type-not yaml -g '!node_modules' -g '!target' -g '!dist'`;
        return execSync(cmd, { encoding: 'utf-8', cwd: args.path || process.cwd(), timeout: 15000, maxBuffer: 512 * 1024 });
      } catch (err: any) {
        return err.stdout || '(no definitions found)';
      }
    },
  },

  // 9. Find references / usages
  {
    definition: {
      type: 'function',
      function: {
        name: 'find_references',
        description: 'Find all references/usages of a symbol across the codebase.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Symbol name to find references for' },
            path: { type: 'string', description: 'Directory to search in (default: cwd)' },
          },
          required: ['name'],
        },
      },
    },
    executor: async (args) => {
      try {
        const cmd = `rg -n "\\b${args.name}\\b" -g '!node_modules' -g '!target' -g '!dist' -g '!*.min.js'`;
        return execSync(cmd, { encoding: 'utf-8', cwd: args.path || process.cwd(), timeout: 15000, maxBuffer: 512 * 1024 });
      } catch (err: any) {
        return err.stdout || '(no references found)';
      }
    },
  },

  // 10. Read dependency file (package.json, Cargo.toml, etc.)
  {
    definition: {
      type: 'function',
      function: {
        name: 'read_dependencies',
        description: 'Read and analyze the project dependencies from the manifest file (package.json, Cargo.toml, go.mod, requirements.txt, etc.)',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project root path (default: cwd)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      const root = args.path || process.cwd();
      const lines: string[] = [];

      // Node.js
      if (fs.existsSync(path.join(root, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
        lines.push('=== Dependencies ===');
        const deps = Object.entries(pkg.dependencies || {});
        const devDeps = Object.entries(pkg.devDependencies || {});
        lines.push(`\nProduction (${deps.length}):`);
        deps.forEach(([name, ver]) => lines.push(`  ${name}: ${ver}`));
        lines.push(`\nDevelopment (${devDeps.length}):`);
        devDeps.forEach(([name, ver]) => lines.push(`  ${name}: ${ver}`));
        if (pkg.peerDependencies) {
          lines.push(`\nPeer Dependencies:`);
          Object.entries(pkg.peerDependencies).forEach(([name, ver]) => lines.push(`  ${name}: ${ver}`));
        }
        return lines.join('\n');
      }
      // Rust
      if (fs.existsSync(path.join(root, 'Cargo.toml'))) {
        const content = fs.readFileSync(path.join(root, 'Cargo.toml'), 'utf-8');
        return `=== Cargo.toml ===\n${content}`;
      }
      // Go
      if (fs.existsSync(path.join(root, 'go.mod'))) {
        const content = fs.readFileSync(path.join(root, 'go.mod'), 'utf-8');
        return `=== go.mod ===\n${content}`;
      }
      // Python
      if (fs.existsSync(path.join(root, 'requirements.txt'))) {
        const content = fs.readFileSync(path.join(root, 'requirements.txt'), 'utf-8');
        return `=== requirements.txt ===\n${content}`;
      }
      if (fs.existsSync(path.join(root, 'pyproject.toml'))) {
        const content = fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf-8');
        return `=== pyproject.toml ===\n${content}`;
      }
      return 'No dependency manifest found.';
    },
  },

  // 11. Find TODOs and FIXMEs
  {
    definition: {
      type: 'function',
      function: {
        name: 'find_todos',
        description: 'Find all TODO, FIXME, HACK, and XXX comments across the codebase.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory to search in (default: cwd)' },
            type: { type: 'string', description: 'Filter: todo, fixme, hack, or all (default: all)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      const filter = args.type === 'todo' ? 'TODO' : args.type === 'fixme' ? 'FIXME' : args.type === 'hack' ? 'HACK' : 'TODO|FIXME|HACK|XXX';
      try {
        const cmd = `rg -n "(//|\\#|/\\*|--|;).*(TODO|FIXME|HACK|XXX)" -i -g '!node_modules' -g '!target' -g '!dist'`;
        const output = execSync(cmd, { encoding: 'utf-8', cwd: args.path || process.cwd(), timeout: 15000, maxBuffer: 512 * 1024 });
        const count = output.split('\n').filter(l => l.trim()).length;
        return `Found ${count} TODO/FIXME/HACK comments:\n\n${output}`;
      } catch (err: any) {
        return err.stdout || '(none found)';
      }
    },
  },

  // 12. Dependency graph (what imports what)
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_imports',
        description: 'Get all imports/requires in a file, or find what imports a specific module.',
        parameters: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'File to analyze imports from (optional)' },
            module: { type: 'string', description: 'Find files that import this module (optional)' },
            path: { type: 'string', description: 'Directory to search in (default: cwd)' },
          },
          required: [],
        },
      },
    },
    executor: async (args) => {
      if (args.file) {
        try {
          const content = fs.readFileSync(args.file, 'utf-8');
          const lines = content.split('\n');
          const imports = lines
            .map((l, i) => ({ line: i + 1, text: l.trim() }))
            .filter(({ text }) =>
              text.startsWith('import ') ||
              text.startsWith('from ') ||
              text.startsWith('use ') ||
              text.startsWith('require(') ||
              text.startsWith('import {') ||
              text.startsWith("import '") ||
              text.startsWith('import("')
            );
          if (imports.length === 0) return 'No imports found.';
          return `Imports in ${args.file} (${imports.length}):\n${imports.map(i => `  L${i.line}: ${i.text}`).join('\n')}`;
        } catch (err: any) {
          return `ERROR: ${err.message}`;
        }
      }
      if (args.module) {
        try {
          const cmd = `rg -l "import.*${args.module}|require.*${args.module}|use.*${args.module}" -g '!node_modules' -g '!target' -g '!dist'`;
          const output = execSync(cmd, { encoding: 'utf-8', cwd: args.path || process.cwd(), timeout: 15000 });
          return `Files that import '${args.module}':\n${output || '(none found)'}`;
        } catch (err: any) {
          return err.stdout || '(none found)';
        }
      }
      return 'Provide either file or module parameter.';
    },
  },
];
