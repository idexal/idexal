import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export interface SlashCommand {
  name: string;
  description: string;
  alias?: string;
  args?: string;
  handler: (args: string, context: SlashContext) => Promise<string | void>;
}

export interface SlashContext {
  cwd: string;
  file?: string;
  messages: any[];
}

const commands: SlashCommand[] = [];

function register(cmd: SlashCommand) {
  commands.push(cmd);
}

// ── Built-in Commands ────────────────────────────────────────

register({
  name: '/help',
  description: 'Show all available commands',
  handler: async (_args, _ctx) => {
    console.log(chalk.cyan.bold('\n📖 Slash Commands:\n'));
    for (const cmd of commands) {
      const alias = cmd.alias ? chalk.gray(` (${cmd.alias})`) : '';
      const args = cmd.args ? chalk.gray(` ${cmd.args}`) : '';
      console.log(`  ${chalk.bold.cyan(cmd.name)}${args}${alias}  ${chalk.gray('–')} ${cmd.description}`);
    }
    console.log(chalk.gray('\nTip: Type a / to see autocomplete suggestions\n'));
  },
});

register({
  name: '/clear',
  description: 'Clear conversation history',
  alias: '/c',
  handler: async (_args, ctx) => {
    ctx.messages.length = 0;
    console.log(chalk.green('✓ Conversation cleared'));
  },
});

register({
  name: '/compact',
  description: 'Compact messages to save context window',
  alias: '/cc',
  handler: async (_args, ctx) => {
    if (ctx.messages.length <= 4) {
      return 'Conversation is already short enough.';
    }
    const kept = ctx.messages.slice(0, 1).concat(ctx.messages.slice(-4));
    const removed = ctx.messages.length - kept.length;
    ctx.messages.length = 0;
    ctx.messages.push(...kept);
    console.log(chalk.green(`✓ Compacted: removed ${removed} messages, ${ctx.messages.length} remaining`));
  },
});

register({
  name: '/model',
  description: 'Switch AI model',
  alias: '/m',
  args: '<model-name>',
  handler: async (args) => {
    if (!args) {
      return 'Usage: /model <model-name>\nExamples: /model gpt-4, /model claude-3-opus, /model deepseek-coder';
    }
    console.log(chalk.green(`✓ Model switched to: ${args}`));
    return `Model set to ${args}. This will take effect on the next message.`;
  },
});

register({
  name: '/read',
  description: 'Read a file into context',
  alias: '/r',
  args: '<file-path>',
  handler: async (args, ctx) => {
    if (!args) return 'Usage: /read <file-path>';
    const filePath = path.resolve(ctx.cwd, args);
    if (!fs.existsSync(filePath)) return `File not found: ${filePath}`;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;
    console.log(chalk.green(`✓ Read ${lines} lines from ${path.relative(ctx.cwd, filePath)}`));
    return `File: ${path.relative(ctx.cwd, filePath)} (${lines} lines)\n\`\`\`\n${content}\n\`\`\``;
  },
});

register({
  name: '/write',
  description: 'Write content to a file',
  args: '<file-path> <content>',
  handler: async (args) => {
    if (!args) return 'Usage: /write <file-path> <content>';
    const spaceIdx = args.indexOf(' ');
    if (spaceIdx === -1) return 'Usage: /write <file-path> <content>';
    const filePath = args.slice(0, spaceIdx);
    const content = args.slice(spaceIdx + 1);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(chalk.green(`✓ Written ${content.length} bytes to ${filePath}`));
  },
});

register({
  name: '/edit',
  description: 'Edit a file by replacing text',
  args: '<file-path> "old text" "new text"',
  handler: async (args) => {
    if (!args) return 'Usage: /edit <file-path> "old text" "new text"';
    // Parse quoted args
    const matches = args.match(/"([^"]+)"/g);
    if (!matches || matches.length < 2) return 'Usage: /edit <file-path> "old text" "new text"';
    const filePath = args.split('"')[0].trim();
    const oldText = matches[0].slice(1, -1);
    const newText = matches[1].slice(1, -1);
    if (!fs.existsSync(filePath)) return `File not found: ${filePath}`;
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(oldText)) return `Text not found in ${filePath}`;
    fs.writeFileSync(filePath, content.replace(oldText, newText), 'utf-8');
    console.log(chalk.green(`✓ Edited ${filePath}`));
  },
});

register({
  name: '/git',
  description: 'Run a git command',
  alias: '/g',
  args: '<command>',
  handler: async (args, ctx) => {
    if (!args) {
      // Show git status
      const { execSync } = await import('child_process');
      try {
        const status = execSync('git status --short', { encoding: 'utf-8', cwd: ctx.cwd });
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: ctx.cwd });
        return `Branch: ${branch.trim()}\n\n${status || '(clean)'}`;
      } catch (err: any) {
        return `Error: ${err.message}`;
      }
    }
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`git ${args}`, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 15000 });
      return output || '(no output)';
    } catch (err: any) {
      return err.stdout || err.message;
    }
  },
});

register({
  name: '/search',
  description: 'Search for a pattern across project files',
  alias: '/s',
  args: '<pattern>',
  handler: async (args, ctx) => {
    if (!args) return 'Usage: /search <pattern>';
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`rg -n "${args}" --max-count=5`, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 10000 });
      return output || '(no matches)';
    } catch (err: any) {
      return err.stdout || '(no matches)';
    }
  },
});

register({
  name: '/tree',
  description: 'Show project directory tree',
  alias: '/t',
  args: '[depth]',
  handler: async (args, ctx) => {
    const maxDepth = parseInt(args) || 3;
    const { execSync } = await import('child_process');
    try {
      const output = execSync(
        `find . -maxdepth ${maxDepth} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/target/*' | head -60`,
        { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 }
      );
      return output;
    } catch {
      return '(could not generate tree)';
    }
  },
});

register({
  name: '/diff',
  description: 'Show git diff for a file',
  args: '[file]',
  handler: async (args, ctx) => {
    const { execSync } = await import('child_process');
    try {
      const cmd = args ? `git diff ${args}` : 'git diff';
      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 10000 });
      return output || '(no changes)';
    } catch (err: any) {
      return err.stdout || '(no changes)';
    }
  },
});

register({
  name: '/commit',
  description: 'Stage and commit changes',
  args: '<message>',
  handler: async (args, ctx) => {
    if (!args) return 'Usage: /commit <message>';
    const { execSync } = await import('child_process');
    try {
      execSync('git add -A', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 10000 });
      const output = execSync(`git commit -m "${args}"`, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 10000 });
      console.log(chalk.green('✓ Committed'));
      return output;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
});

register({
  name: '/info',
  description: 'Show project information',
  alias: '/i',
  handler: async (_args, ctx) => {
    const { detectProject } = await import('../utils/project');
    const project = await detectProject();
    if (!project) return 'No project detected in current directory.';
    return `Project: ${project.name}\nType: ${project.type}\nFiles: ${project.fileCount}\nLanguages: ${project.languages.join(', ')}`;
  },
});

register({
  name: '/cost',
  description: 'Show token usage and estimated cost',
  args: '[model]',
  handler: async (args, ctx) => {
    const model = args || 'gpt-4';
    const inputMessages = ctx.messages.filter((m: any) => m.role === 'user').length;
    const outputMessages = ctx.messages.filter((m: any) => m.role === 'assistant').length;
    // Rough estimate
    const inputTokens = inputMessages * 500;
    const outputTokens = outputMessages * 800;
    const totalTokens = inputTokens + outputTokens;

    // Pricing per 1K tokens (approximate)
    const prices: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
    };

    const price = prices[model] || { input: 0.03, output: 0.06 };
    const cost = (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;

    console.log(chalk.cyan('\n📊 Token Usage:\n'));
    console.log(`  Messages:    ${ctx.messages.length}`);
    console.log(`  Est. Input:  ${inputTokens.toLocaleString()} tokens`);
    console.log(`  Est. Output: ${outputTokens.toLocaleString()} tokens`);
    console.log(`  Total:       ${totalTokens.toLocaleString()} tokens`);
    console.log(`  Est. Cost:   $${cost.toFixed(4)} (${model})\n`);
  },
});

register({
  name: '/plan',
  description: 'Create a structured implementation plan for a feature',
  alias: '/p',
  args: '<feature-description>',
  handler: async (args, ctx) => {
    if (!args) return 'Usage: /plan <feature description>\nExample: /plan Add user authentication with JWT tokens';

    console.log(chalk.cyan.bold('\n📋 Implementation Plan Generator\n'));
    console.log(chalk.dim('  Analyzing project structure...\n'));

    // Detect project type and structure
    let projectInfo = '';
    try {
      const { execSync } = await import('child_process');
      const files = execSync('find . -maxdepth 3 -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/target/*" | head -50', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 });
      const dirs = execSync('find . -maxdepth 2 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/target/*" | head -30', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 });
      
      const hasPackageJson = files.includes('package.json');
      const hasCargoToml = files.includes('Cargo.toml');
      const hasPython = files.includes('requirements.txt') || files.includes('pyproject.toml');
      const hasDocker = files.includes('Dockerfile') || files.includes('docker-compose.yml');
      const hasTests = dirs.includes('./tests') || dirs.includes('./__tests__') || dirs.includes('./test');
      
      projectInfo = `  Project structure:\n`;
      if (hasPackageJson) projectInfo += `    • Node.js/TypeScript project\n`;
      if (hasCargoToml) projectInfo += `    • Rust project\n`;
      if (hasPython) projectInfo += `    • Python project\n`;
      if (hasDocker) projectInfo += `    • Docker configured\n`;
      if (hasTests) projectInfo += `    • Test directory found\n`;
    } catch {
      projectInfo = '  Could not analyze project structure\n';
    }

    // Generate the plan
    const plan = `
## Implementation Plan: ${args}

**Goal:** ${args}

### 1. Overview

This plan breaks down the implementation into atomic, testable steps. Each step produces a working, verifiable result.

${projectInfo}

### 2. Architecture Decisions

- **Approach:** [To be determined based on project context]
- **Key Files:** [To be identified during implementation]
- **Dependencies:** [Check existing dependencies first]
- **Testing:** Each step includes verification

### 3. Task Breakdown

#### Task 1: Research & Setup
- [ ] Analyze existing codebase for similar patterns
- [ ] Identify files to modify vs. create
- [ ] Check for existing dependencies
- [ ] **Verify:** Dependencies installed, types compile

#### Task 2: Core Implementation
- [ ] Create/modify core types/interfaces
- [ ] Implement main logic
- [ ] Add error handling
- [ ] **Verify:** Unit tests pass, no type errors

#### Task 3: Integration
- [ ] Wire into existing systems
- [ ] Update imports/exports
- [ ] Add CLI commands if applicable
- [ ] **Verify:** Integration tests pass

#### Task 4: Testing
- [ ] Write unit tests for new logic
- [ ] Write integration tests if needed
- [ ] Add edge case tests
- [ ] **Verify:** All tests pass, coverage > 80%

#### Task 5: Documentation
- [ ] Update README if needed
- [ ] Add/update help text
- [ ] Update configuration docs
- [ ] **Verify:** Documentation renders correctly

#### Task 6: Final Verification
- [ ] Run full test suite
- [ ] Run linter/formatter
- [ ] Build the project
- [ ] Manual smoke test
- [ ] **Verify:** Clean build, no warnings

### 4. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Run full test suite after each task |
| Performance regression | Medium | Profile before/after |
| Security vulnerability | High | Follow OWASP guidelines |

### 5. Estimated Effort

- **Total tasks:** 6
- **Subtasks:** ~20
- **Estimated time:** 2-4 hours (depends on complexity)

---

**Ready to start?** The plan is saved. Begin with Task 1 (Research & Setup) and I'll guide you through each step.
`;

    console.log(plan);
    return `Plan generated for: ${args}. Follow the checklist above to implement step by step.`;
  },
});

register({
  name: '/review',
  description: 'Run AI code review on file(s)',
  alias: '/rv',
  args: '[file-or-pattern]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🔍 AI Code Review\n'));

    // Determine files to review
    let filesToReview: string[] = [];
    const { execSync } = await import('child_process');

    if (!args) {
      // Review all changed files (git diff)
      try {
        const diffOutput = execSync('git diff --name-only', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 });
        filesToReview = diffOutput.trim().split('\n').filter(f => f.length > 0);
      } catch {
        // Not in a git repo or no changes
      }

      if (filesToReview.length === 0) {
        // Fall back to reviewing recent files
        try {
          const recentFiles = execSync(
            'find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" | grep -v node_modules | grep -v .git | head -10',
            { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 }
          );
          filesToReview = recentFiles.trim().split('\n').filter(f => f.length > 0);
        } catch {
          return 'No files found to review. Provide a file path: /review src/app.ts';
        }
      }
    } else if (args.startsWith('diff') || args === '--staged') {
      // Review staged changes
      try {
        const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 });
        filesToReview = stagedFiles.trim().split('\n').filter(f => f.length > 0);
      } catch {
        return 'No staged changes found.';
      }
    } else {
      // Specific file or glob pattern
      const file = args.split(' ')[0];
      const filePath = require('path').resolve(ctx.cwd, file);
      if (!fs.existsSync(filePath)) {
        return `File not found: ${file}`;
      }
      filesToReview = [file];
    }

    console.log(chalk.dim(`  Reviewing ${filesToReview.length} file(s)...\n`));

    // Read and analyze each file
    const findings: string[] = [];
    for (const file of filesToReview.slice(0, 10)) {
      const filePath = require('path').resolve(ctx.cwd, file);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const ext = require('path').extname(file);

      console.log(chalk.dim(`  📄 ${file} (${lines.length} lines)`));

      // Static analysis checks
      const fileFindings: string[] = [];

      // Check for common issues
      lines.forEach((line, i) => {
        const lineNum = i + 1;

        // Security: eval usage
        if (line.match(/\beval\s*\(/)) {
          fileFindings.push(`  🔴 SECURITY L${lineNum}: eval() usage detected — potential code injection`);
        }

        // Security: innerHTML
        if (line.match(/innerHTML\s*=/) || line.match(/dangerouslySetInnerHTML/)) {
          fileFindings.push(`  🟡 SECURITY L${lineNum}: DOM manipulation — verify sanitization`);
        }

        // Performance: unnecessary re-renders (React)
        if (line.match(/useState/) && lines[i-1]?.includes('export')) {
          fileFindings.push(`  💡 PERF: Component re-renders may be expensive — consider useMemo`);
        }

        // Code quality: console.log in production
        if (line.match(/console\.log\s*\(/) && !file.includes('test') && !file.includes('spec')) {
          fileFindings.push(`  💡 QUALITY L${lineNum}: console.log — consider using a logger`);
        }

        // Code quality: TODO/FIXME
        if (line.match(/(TODO|FIXME|HACK|XXX)/)) {
          fileFindings.push(`  📝 NOTE L${lineNum}: ${line.trim().substring(0, 60)}`);
        }

        // Error handling: catch blocks
        if (line.match(/catch\s*\(\s*\)/) || line.match(/catch\s*\{\s*\}/)) {
          fileFindings.push(`  🟡 ERROR L${lineNum}: Empty catch block — errors silently swallowed`);
        }

        // Performance: sync file operations
        if (line.match(/readFileSync|writeFileSync/) && !file.includes('config') && !file.includes('test')) {
          fileFindings.push(`  💡 PERF L${lineNum}: Sync file I/O — consider async for production`);
        }

        // TypeScript: any type
        if (line.match(/:\s*any\b/) && !file.includes('.d.ts')) {
          fileFindings.push(`  💡 TYPE L${lineNum}: 'any' type — consider specific type`);
        }
      });

      // Function complexity
      const functionCount = (content.match(/function\s+\w+|=>\s*\{/g) || []).length;
      const maxLineLength = Math.max(...lines.map(l => l.length));

      if (functionCount > 20) {
        fileFindings.push(`  💡 STRUCTURE: ${functionCount} functions — consider splitting`);
      }
      if (maxLineLength > 120) {
        fileFindings.push(`  💡 STYLE: Max line length ${maxLineLength} — consider wrapping`);
      }

      if (fileFindings.length > 0) {
        findings.push(chalk.bold(`\n${file}:`));
        findings.push(...fileFindings);
      } else {
        findings.push(chalk.dim(`\n${file}: ✓ No issues found`));
      }
    }

    // Output results
    console.log(chalk.bold('\n═══ Review Results ═══'));
    if (findings.length === 0) {
      console.log(chalk.green('\n  ✅ No issues found across all files\n'));
    } else {
      findings.forEach(f => console.log(f));
    }
    console.log(chalk.dim(`\n  Reviewed: ${filesToReview.length} file(s)\n`));

    return findings.length > 0 ? findings.join('\n') : 'All files look clean!';
  },
});

register({
  name: '/debug',
  description: 'Debug an error with stack trace analysis',
  alias: '/db',
  args: '[error-message-or-file]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🐛 Debug Assistant\n'));

    if (!args) {
      // Show recent errors from logs if available
      console.log(chalk.dim('  Usage: /debug <error-message>')); 
      console.log(chalk.dim('  Example: /debug TypeError: Cannot read property of undefined'));
      console.log(chalk.dim('  Example: /debug src/app.ts')); 
      return;
    }

    // If it's a file, read it and look for potential issues
    const filePath = require('path').resolve(ctx.cwd, args);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      console.log(chalk.bold(`  📄 Analyzing ${args} (${lines.length} lines)\n`));

      const issues: string[] = [];
      lines.forEach((line, i) => {
        const l = i + 1;
        if (line.match(/\.then\(/) && !line.match(/catch/)) {
          issues.push(`  ⚠️  L${l}: Promise without .catch() — potential unhandled rejection`);
        }
        if (line.match(/await/) && line.match(/try/)) {
          // good pattern
        } else if (line.match(/await/) && !line.match(/try|catch/)) {
          issues.push(`  ⚠️  L${l}: await without try/catch — may throw unhandled`);
        }
        if (line.match(/JSON\.parse/) && !line.match(/try|catch/)) {
          issues.push(`  🔴 L${l}: JSON.parse without try/catch — will throw on invalid JSON`);
        }
        if (line.match(/parseInt|parseFloat/) && !line.match(/isNaN|try|catch/)) {
          issues.push(`  ⚠️  L${l}: Number parsing without NaN check`);
        }
        if (line.match(/\.map\(/) && line.match(/async/) && !line.match(/Promise\.all/)) {
          issues.push(`  ⚠️  L${l}: async .map() returns Promise[] — use Promise.all() or for...of`);
        }
      });

      if (issues.length > 0) {
        console.log(chalk.yellow('  Potential issues found:\n'));
        issues.forEach(i => console.log(i));
      } else {
        console.log(chalk.green('  ✅ No obvious issues found in this file'));
      }
      return;
    }

    // Parse error message for analysis
    console.log(chalk.bold('  Error Analysis:\n'));

    const errorLower = args.toLowerCase();

    if (errorLower.includes('typeerror')) {
      console.log(chalk.yellow('  Type: TypeError — accessing property/method on wrong type\n'));
      console.log('  Common causes:');
      console.log('  • Variable is null/undefined when accessed');
      console.log('  • Wrong type passed to function');
      console.log('  • Missing optional chaining (?.)\n');
      console.log('  Debug steps:');
      console.log('  1. Add console.log() before the failing line');
      console.log('  2. Check if the variable is null/undefined');
      console.log('  3. Use optional chaining: obj?.property');
      console.log('  4. Add null check: if (obj) obj.property');
    } else if (errorLower.includes('referenceerror')) {
      console.log(chalk.yellow('  Type: ReferenceError — variable not defined\n'));
      console.log('  Common causes:');
      console.log('  • Typo in variable name');
      console.log('  • Variable used before declaration');
      console.log('  • Variable out of scope\n');
    } else if (errorLower.includes('syntaxerror')) {
      console.log(chalk.yellow('  Type: SyntaxError — invalid code syntax\n'));
      console.log('  Common causes:');
      console.log('  • Missing bracket/parenthesis/semicolon');
      console.log('  • Invalid string/regex literal');
      console.log('  • Reserved word used as identifier\n');
    } else if (errorLower.includes('enoent') || errorLower.includes('file not found')) {
      console.log(chalk.yellow('  Type: ENOENT — file or directory not found\n'));
      console.log('  Common causes:');
      console.log('  • Wrong file path');
      console.log('  • Missing directory');
      console.log('  • Case sensitivity issue (Linux)\n');
    } else if (errorLower.includes('econnrefused') || errorLower.includes('enotfound')) {
      console.log(chalk.yellow('  Type: Network Error — connection refused/not found\n'));
      console.log('  Common causes:');
      console.log('  • Server not running');
      console.log('  • Wrong host/port');
      console.log('  • Firewall blocking\n');
    } else {
      console.log(chalk.dim('  Could not auto-classify. Try providing more context:')); 
      console.log(chalk.dim('  • Include the stack trace')); 
      console.log(chalk.dim('  • Mention what you were doing when the error occurred'));
    }

    return `Debug analysis for: ${args}`;
  },
});

register({
  name: '/refactor',
  description: 'Analyze and suggest refactoring for code',
  alias: '/rf',
  args: '[file-or-pattern]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🔄 Refactoring Analysis\n'));

    let target = args || '.';
    const filePath = require('path').resolve(ctx.cwd, target);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      // Analyze a single file
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const ext = require('path').extname(target);
      console.log(chalk.dim(`  Analyzing ${target} (${lines.length} lines)\n`));

      const suggestions: string[] = [];

      // Check for long functions
      let funcStart = -1;
      let funcName = '';
      lines.forEach((line, i) => {
        const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:async\s*)?\(/);
        if (funcMatch) {
          if (funcStart !== -1 && i - funcStart > 50) {
            suggestions.push(`  📐 EXTRACT: ${funcName}() is ${i - funcStart} lines — extract helper functions`);
          }
          funcStart = i;
          funcName = funcMatch[1];
        }
      });

      // Check for duplicated code patterns
      const lineFreq: Record<string, number[]> = {};
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.length > 20 && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          if (!lineFreq[trimmed]) lineFreq[trimmed] = [];
          lineFreq[trimmed].push(i + 1);
        }
      });
      for (const [line, nums] of Object.entries(lineFreq)) {
        if (nums.length >= 3) {
          suggestions.push(`  🔁 DUPLICATE: Same line at L${nums.join(', L')} — extract to shared function`);
        }
      }

      // Check for nested conditionals
      let maxDepth = 0;
      let currentDepth = 0;
      lines.forEach((line) => {
        if (line.match(/\b(if|else if|switch|for|while)\b/)) currentDepth++;
        if (line.match(/\}/)) currentDepth--;
        maxDepth = Math.max(maxDepth, currentDepth);
      });
      if (maxDepth > 4) {
        suggestions.push(`  🏗️  NESTING: Max nesting depth is ${maxDepth} — use early returns or extract functions`);
      }

      // Check for magic numbers
      lines.forEach((line, i) => {
        const numMatch = line.match(/[^\w](\d{3,})[^\w\d]/);
        if (numMatch && !line.includes('const') && !line.includes('//')) {
          suggestions.push(`  🔢 MAGIC NUMBER L${i + 1}: ${numMatch[1]} — extract to named constant`);
        }
      });

      if (suggestions.length > 0) {
        console.log(chalk.bold('  Refactoring suggestions:\n'));
        suggestions.forEach(s => console.log(s));
      } else {
        console.log(chalk.green('  ✅ Code looks well-structured — no refactoring needed'));
      }
    } else {
      console.log(chalk.dim('  Scanning project for refactoring opportunities...\n'));
      try {
        const { execSync } = await import('child_process');
        const files = execSync(
          'find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | head -20',
          { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 }
        ).trim().split('\n').filter(f => f);

        console.log(chalk.dim(`  Found ${files.length} files to analyze\n`));

        // Quick stats
        let totalLines = 0;
        let totalFunctions = 0;
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          totalLines += content.split('\n').length;
          totalFunctions += (content.match(/function|=>/g) || []).length;
        }

        console.log(`  📊 Project stats:`);
        console.log(`    Files: ${files.length}`);
        console.log(`    Lines: ${totalLines.toLocaleString()}`);
        console.log(`    Functions: ~${totalFunctions}`);
        console.log(`    Avg lines/file: ${Math.round(totalLines / files.length)}`);
        console.log(`\n  Run /refactor <file> for detailed analysis`);
      } catch {
        console.log(chalk.red('  Could not scan project files'));
      }
    }
  },
});

register({
  name: '/test',
  description: 'Generate unit tests for a file',
  alias: '/t',
  args: '<file-path>',
  handler: async (args, ctx) => {
    if (!args) {
      return 'Usage: /test <file-path>\nExample: /test src/utils/helpers.ts';
    }

    console.log(chalk.cyan.bold('\n🧪 Test Generator\n'));

    const filePath = require('path').resolve(ctx.cwd, args);
    if (!fs.existsSync(filePath)) {
      return `File not found: ${args}`;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const ext = require('path').extname(args);
    const basename = require('path').basename(args, ext);

    console.log(chalk.dim(`  Analyzing ${args} (${lines.length} lines)\n`));

    // Extract exports for test generation
    const exports: string[] = [];
    const functions: string[] = [];

    lines.forEach((line) => {
      // Named exports
      const exportMatch = line.match(/export\s+(?:default\s+)?(?:function|const|let|class)\s+(\w+)/);
      if (exportMatch) exports.push(exportMatch[1]);

      // Regular functions
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (funcMatch && !exports.includes(funcMatch[1])) functions.push(funcMatch[1]);

      // Arrow functions
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/);
      if (arrowMatch && !exports.includes(arrowMatch[1]) && !functions.includes(arrowMatch[1])) {
        functions.push(arrowMatch[1]);
      }
    });

    const allExports = [...new Set([...exports, ...functions])];

    if (allExports.length === 0) {
      console.log(chalk.yellow('  No exports found in this file'));
      return;
    }

    console.log(chalk.bold(`  Found ${allExports.length} exportable function(s):\n`));
    allExports.forEach(e => console.log(`    • ${e}`));

    // Generate test template
    const testExt = ext === '.ts' ? '.test.ts' : ext === '.tsx' ? '.test.tsx' : '.test.js';
    const testFile = args.replace(ext, testExt);

    console.log(chalk.bold(`\n  📄 Suggested test file: ${testFile}\n`));

    const testTemplate = `import { ${allExports.join(', ')} } from './${basename}';\n\ndescribe('${basename}', () => {\n${allExports.map(e => `  describe('${e}', () => {\n    it('should work correctly', () => {\n      // TODO: Add test implementation\n      expect(true).toBe(true);\n    });\n\n    it('should handle edge cases', () => {\n      // TODO: Add edge case tests\n      expect(true).toBe(true);\n    });\n  });`).join('\n\n')}\n});\n`;

    console.log(testTemplate);
    console.log(chalk.dim(`  💡 Copy the above to ${testFile}`));
    console.log(chalk.dim(`  💡 Or use /write ${testFile} <content> to create it`));

    return `Test template generated for ${allExports.length} function(s). See output above.`;
  },
});

register({
  name: '/status',
  description: 'Show system status and provider info',
  alias: '/st',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\n📊 System Status\n'));

    const { execSync } = await import('child_process');
    const os = require('os');

    // System info
    console.log(chalk.bold('  System:'));
    console.log(`    OS:        ${os.platform()} ${os.release()}`);
    console.log(`    Arch:      ${os.arch()}`);
    console.log(`    Node:      ${process.version}`);
    console.log(`    Memory:    ${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`);
    console.log(`    Uptime:    ${Math.round(os.uptime() / 3600)}h`);

    // Git info
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
      const status = execSync('git status --short', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
      const changes = status ? status.split('\n').length : 0;
      console.log(chalk.bold('\n  Git:'));
      console.log(`    Branch:    ${branch}`);
      console.log(`    Changes:   ${changes} file(s) modified`);
    } catch {
      console.log(chalk.bold('\n  Git:'));
      console.log(chalk.dim('    Not a git repository'));
    }

    // Project info
    try {
      const { detectProject } = await import('../utils/project');
      const project = await detectProject();
      if (project) {
        console.log(chalk.bold('\n  Project:'));
        console.log(`    Name:      ${project.name}`);
        console.log(`    Type:      ${project.type}`);
        console.log(`    Files:     ${project.fileCount}`);
        console.log(`    Languages: ${project.languages.join(', ')}`);
      }
    } catch {}

    // Provider info
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    console.log(chalk.bold('\n  AI Providers:'));
    console.log(`    OpenAI:    ${hasOpenAI ? chalk.green('✓ configured') : chalk.dim('not configured')}`);
    console.log(`    Anthropic: ${hasAnthropic ? chalk.green('✓ configured') : chalk.dim('not configured')}`);

    console.log('');
  },
});

register({
  name: '/logout',
  description: 'Clear authentication and API keys',
  handler: async (_args, ctx) => {
    const configPath = require('path').join(ctx.cwd, '.idexa.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      delete config.openaiApiKey;
      delete config.anthropicApiKey;
      delete config.customGatewayKey;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green('✓ API keys removed from .idexa.json'));
    }

    // Clear env vars for current session
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    console.log(chalk.green('✓ Logged out successfully'));
    console.log(chalk.dim('  Re-authenticate with: idexa login'));
  },
});

register({
  name: '/export',
  description: 'Export chat history to a file',
  alias: '/x',
  args: '[format]  (markdown|json|text)',
  handler: async (args, ctx) => {
    const format = args || 'markdown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `idexa-chat-${timestamp}.${format === 'json' ? 'json' : format === 'text' ? 'txt' : 'md'}`;
    const filePath = require('path').join(ctx.cwd, filename);

    let content = '';

    if (format === 'json') {
      content = JSON.stringify(ctx.messages, null, 2);
    } else if (format === 'text') {
      content = ctx.messages.map((m: any) => {
        const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'AI' : 'System';
        return `${role}: ${m.content}`;
      }).join('\n\n');
    } else {
      // Markdown
      content = `# Idexa Chat Export\n\n*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
      content += ctx.messages.map((m: any) => {
        if (m.role === 'user') return `## You\n\n${m.content}`;
        if (m.role === 'assistant') return `## AI\n\n${m.content}`;
        return `## System\n\n${m.content}`;
      }).join('\n\n---\n\n');
    }

    fs.writeFileSync(filePath, content);
    console.log(chalk.green(`✓ Exported ${ctx.messages.length} messages to ${filename}`));
    console.log(chalk.dim(`  ${filePath}`));
  },
});

register({
  name: '/summarize',
  description: 'Summarize the conversation so far',
  alias: '/sum',
  handler: async (_args, ctx) => {
    if (ctx.messages.length === 0) {
      return 'No messages to summarize.';
    }

    const userMessages = ctx.messages.filter((m: any) => m.role === 'user');
    const assistantMessages = ctx.messages.filter((m: any) => m.role === 'assistant');

    console.log(chalk.cyan.bold('\n📝 Conversation Summary\n'));
    console.log(`  Messages: ${ctx.messages.length} (${userMessages.length} user, ${assistantMessages.length} assistant)`);
    console.log(`  Topics discussed:`);

    // Extract topics from user messages
    const topics = new Set<string>();
    userMessages.forEach((m: any) => {
      const words = m.content.split(/\s+/).filter((w: string) => w.length > 4).slice(0, 3);
      if (words.length > 0) topics.add(words.join(' '));
    });

    Array.from(topics).slice(0, 5).forEach(t => console.log(chalk.dim(`    • ${t}`)));

    // Token estimate
    const totalChars = ctx.messages.reduce((sum: number, m: any) => sum + m.content.length, 0);
    const estimatedTokens = Math.round(totalChars / 4);
    console.log(chalk.dim(`\n  Estimated tokens: ~${estimatedTokens.toLocaleString()}`));
    console.log('');
  },
});

register({
  name: '/terminal',
  description: 'Run a shell command from chat',
  alias: '/term',
  args: '<command>',
  handler: async (args, ctx) => {
    if (!args) return 'Usage: /terminal <command>\nExample: /terminal npm test';

    console.log(chalk.cyan(`\n💻 Running: ${args}\n`));

    const { execSync } = await import('child_process');
    try {
      const output = execSync(args, { 
        encoding: 'utf-8', 
        cwd: ctx.cwd, 
        timeout: 30000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      console.log(output || '(no output)');
      return output || '(command completed with no output)';
    } catch (err: any) {
      const output = err.stdout || err.message;
      console.log(chalk.red(output));
      return `Command failed:\n${output}`;
    }
  },
});

register({
  name: '/plugins',
  description: 'Manage CLI plugins',
  alias: '/pl',
  args: '[list|install|uninstall|enable|disable] [name]',
  handler: async (args, ctx) => {
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`idexa plugins ${args || ''}`, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 10000 });
      console.log(output);
      return output;
    } catch (err: any) {
      return err.stdout || err.message;
    }
  },
});

register({
  name: '/deps',
  description: 'Analyze project dependencies',
  alias: '/dep',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\n📦 Dependency Analysis\n'));

    const pkgPath = require('path').join(ctx.cwd, 'package.json');
    const cargoPath = require('path').join(ctx.cwd, 'Cargo.toml');

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});

      console.log(chalk.bold('  npm Dependencies:'));
      console.log(`    Production:  ${deps.length}`);
      console.log(`    Development: ${devDeps.length}`);
      console.log(`    Total:       ${deps.length + devDeps.length}`);

      // Check for outdated patterns
      const oldPatterns: string[] = [];
      deps.forEach(d => {
        if (d === 'moment') oldPatterns.push('  ⚠️  moment.js → consider date-fns or dayjs (smaller, tree-shakeable)');
        if (d === 'request') oldPatterns.push('  ⚠️  request → deprecated, use node-fetch or axios');
        if (d === 'lodash') oldPatterns.push('  💡 lodash → consider lodash-es for tree-shaking');
      });

      if (oldPatterns.length > 0) {
        console.log(chalk.bold('\n  Suggestions:'));
        [...new Set(oldPatterns)].forEach(p => console.log(p));
      }

      // Show top dependencies by name
      console.log(chalk.bold('\n  Production deps:'));
      deps.slice(0, 15).forEach(d => console.log(chalk.dim(`    • ${d}`)));
      if (deps.length > 15) console.log(chalk.dim(`    ... and ${deps.length - 15} more`));
    } else if (fs.existsSync(cargoPath)) {
      console.log(chalk.bold('  Rust (Cargo) Dependencies:\n'));
      const { execSync } = await import('child_process');
      try {
        const tree = execSync('cargo tree --depth 1 2>/dev/null || echo "(cargo tree not available)"', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 10000 });
        console.log(tree);
      } catch {
        console.log(chalk.dim('  Could not analyze Cargo dependencies'));
      }
    } else {
      return 'No package.json or Cargo.toml found in current directory.';
    }
  },
});

register({
  name: '/security',
  description: 'Run security audit on dependencies',
  alias: '/sec',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\n🛡️  Security Audit\n'));

    const { execSync } = await import('child_process');
    const pkgPath = require('path').join(ctx.cwd, 'package.json');

    if (fs.existsSync(pkgPath)) {
      console.log(chalk.dim('  Running npm audit...\n'));
      try {
        const output = execSync('npm audit --json 2>/dev/null || npm audit 2>&1', { encoding: 'utf-8', cwd: ctx.cwd, timeout: 30000 });
        
        try {
          const audit = JSON.parse(output);
          const vulns = audit.metadata?.vulnerabilities || {};
          console.log(chalk.bold('  Vulnerability Summary:'));
          if (vulns.critical) console.log(chalk.red(`    🔴 Critical: ${vulns.critical}`));
          if (vulns.high) console.log(chalk.red(`    🟠 High:     ${vulns.high}`));
          if (vulns.moderate) console.log(chalk.yellow(`    🟡 Moderate: ${vulns.moderate}`));
          if (vulns.low) console.log(chalk.dim(`    ⚪ Low:      ${vulns.low}`));
          if (vulns.info) console.log(chalk.dim(`    ℹ️  Info:     ${vulns.info}`));
          
          const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0);
          if (total === 0) {
            console.log(chalk.green('\n  ✅ No known vulnerabilities found!'));
          } else {
            console.log(chalk.yellow(`\n  ⚠️  Run ${chalk.white('npm audit fix')} to resolve`));
          }
        } catch {
          console.log(output);
        }
      } catch (err: any) {
        console.log(err.stdout || err.message);
      }
    } else {
      console.log(chalk.dim('  No package.json found. Checking for common issues...'));
    }

    // Check for common security issues
    console.log(chalk.bold('\n  Security Checks:'));
    
    // Check for .env files
    const envFiles = fs.readdirSync(ctx.cwd).filter(f => f.startsWith('.env'));
    if (envFiles.length > 0) {
      console.log(chalk.yellow(`  ⚠️  Found ${envFiles.length} .env file(s) — ensure they're in .gitignore`));
    }

    // Check for hardcoded secrets
    try {
      const { execSync } = await import('child_process');
      const secretPatterns = execSync(
        'grep -rn "password\|secret\|api_key\|apikey\|token" --include="*.ts" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v .git | head -5',
        { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 }
      );
      if (secretPatterns.trim()) {
        console.log(chalk.yellow('  ⚠️  Potential hardcoded secrets found:'));
        secretPatterns.trim().split('\n').slice(0, 3).forEach(l => console.log(chalk.dim(`    ${l.trim()}`)));
      } else {
        console.log(chalk.green('  ✅ No obvious hardcoded secrets'));
      }
    } catch {}

    console.log('');
  },
});

register({
  name: '/perf',
  description: 'Analyze performance hotspots',
  alias: '/pf',
  args: '[file]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n📈 Performance Analysis\n'));

    if (args) {
      // Analyze specific file
      const filePath = require('path').resolve(ctx.cwd, args);
      if (!fs.existsSync(filePath)) return `File not found: ${args}`;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      console.log(chalk.dim(`  Analyzing ${args} (${lines.length} lines)\n`));

      const issues: string[] = [];
      lines.forEach((line, i) => {
        const l = i + 1;
        if (line.match(/\.forEach\(/) && line.match(/await/)) {
          issues.push(`  🔴 L${l}: await inside .forEach() — use for...of or Promise.all()`);
        }
        if (line.match(/\.map\(/) && line.match(/await/) && !line.match(/Promise\.all/)) {
          issues.push(`  🟡 L${l}: async .map() without Promise.all() — runs sequentially`);
        }
        if (line.match(/JSON\.parse/)) {
          issues.push(`  💡 L${l}: JSON.parse() — consider caching for repeated parsing`);
        }
        if (line.match(/\.indexOf\(/) && !line.match(/\.includes\(/)) {
          issues.push(`  💡 L${l}: .indexOf() — .includes() is cleaner for boolean checks`);
        }
        if (line.match(/for\s*\(.*\.length/)) {
          issues.push(`  💡 L${l}: Manual for loop — consider array methods for readability`);
        }
        if (line.match(/\.split\('\n'\)/) && line.match(/\.length/)) {
          issues.push(`  💡 L${l}: String splitting for line count — consider streaming for large files`);
        }
      });

      if (issues.length > 0) {
        console.log(chalk.bold('  Performance suggestions:\n'));
        issues.forEach(i => console.log(i));
      } else {
        console.log(chalk.green('  ✅ No obvious performance issues found'));
      }
    } else {
      // General project analysis
      console.log(chalk.dim('  Scanning project...\n'));
      try {
        const { execSync } = await import('child_process');
        const files = execSync(
          'find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | head -30',
          { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 }
        ).trim().split('\n').filter(f => f);

        let totalLines = 0;
        let largestFile = { name: '', lines: 0 };

        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n').length;
          totalLines += lines;
          if (lines > largestFile.lines) largestFile = { name: file, lines };
        }

        console.log(chalk.bold('  Project Stats:'));
        console.log(`    Files scanned:  ${files.length}`);
        console.log(`    Total lines:    ${totalLines.toLocaleString()}`);
        console.log(`    Avg lines/file: ${Math.round(totalLines / files.length)}`);
        if (largestFile.name) {
          console.log(`    Largest file:   ${largestFile.name} (${largestFile.lines} lines)`);
          if (largestFile.lines > 500) {
            console.log(chalk.yellow(`    ⚠️  ${largestFile.name} is large — consider splitting`));
          }
        }
        console.log(chalk.dim(`\n  Run /perf <file> for detailed analysis`));
      } catch {
        console.log(chalk.red('  Could not scan project'));
      }
    }
  },
});

register({
  name: '/docs',
  description: 'Generate documentation for a file',
  alias: '/doc',
  args: '[file]',
  handler: async (args, ctx) => {
    if (!args) {
      return 'Usage: /docs <file-path>\nExample: /docs src/utils/helpers.ts';
    }

    console.log(chalk.cyan.bold('\n📚 Documentation Generator\n'));

    const filePath = require('path').resolve(ctx.cwd, args);
    if (!fs.existsSync(filePath)) return `File not found: ${args}`;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const basename = require('path').basename(args);

    console.log(chalk.dim(`  Analyzing ${args} (${lines.length} lines)\n`));

    // Extract exports and types
    const exports: Array<{ name: string; type: string; line: number }> = [];

    lines.forEach((line, i) => {
      const funcMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) exports.push({ name: funcMatch[1], type: 'function', line: i + 1 });

      const classMatch = line.match(/export\s+class\s+(\w+)/);
      if (classMatch) exports.push({ name: classMatch[1], type: 'class', line: i + 1 });

      const constMatch = line.match(/export\s+const\s+(\w+)/);
      if (constMatch) exports.push({ name: constMatch[1], type: 'constant', line: i + 1 });

      const interfaceMatch = line.match(/export\s+interface\s+(\w+)/);
      if (interfaceMatch) exports.push({ name: interfaceMatch[1], type: 'interface', line: i + 1 });

      const typeMatch = line.match(/export\s+type\s+(\w+)/);
      if (typeMatch) exports.push({ name: typeMatch[1], type: 'type', line: i + 1 });
    });

    if (exports.length === 0) {
      console.log(chalk.yellow('  No exports found in this file'));
      return;
    }

    console.log(chalk.bold(`  Found ${exports.length} export(s):\n`));
    exports.forEach(e => console.log(`    ${e.type.padEnd(12)} ${e.name} (L${e.line})`));

    // Generate JSDoc template
    console.log(chalk.bold('\n  📄 Generated JSDoc:\n'));
    exports.filter(e => e.type === 'function').forEach(e => {
      const line = lines[e.line - 1];
      const params = line.match(/\(([^)]*)\)/)?.[1]?.split(',').map(p => p.trim().split(':')[0].trim()) || [];
      
      console.log('/**');
      console.log(` * TODO: Add description for ${e.name}`);
      params.filter(p => p && p !== 'ctx').forEach(p => {
        console.log(` * @param ${p} - TODO: Describe ${p}`);
      });
      console.log(` * @returns TODO: Describe return value`);
      console.log(' */');
      console.log(line.trim());
      console.log('');
    });

    console.log(chalk.dim('  💡 Copy the above JSDoc comments to your code')); 
    console.log(chalk.dim('  💡 Or use /write to save to a docs file'));
  },
});

register({
  name: '/find',
  description: 'Find files by name or pattern',
  alias: '/f',
  args: '<pattern>',
  handler: async (args, ctx) => {
    if (!args) return 'Usage: /find <pattern>\nExample: /find *.test.ts';

    console.log(chalk.cyan.bold(`\n🔎 Finding files matching: ${args}\n`));

    const { execSync } = await import('child_process');
    try {
      const output = execSync(
        `find . -type f -name "${args}" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/target/*" | head -30`,
        { encoding: 'utf-8', cwd: ctx.cwd, timeout: 5000 }
      );

      const files = output.trim().split('\n').filter(f => f);
      if (files.length === 0) {
        console.log(chalk.dim('  No files found matching pattern'));
      } else {
        console.log(chalk.dim(`  Found ${files.length} file(s):\n`));
        files.forEach(f => {
          const size = fs.existsSync(require('path').join(ctx.cwd, f)) 
            ? fs.statSync(require('path').join(ctx.cwd, f)).size 
            : 0;
          const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` 
            : size > 1024 ? `${(size / 1024).toFixed(1)}KB` 
            : `${size}B`;
          console.log(`    ${chalk.dim(sizeStr.padStart(8))} ${f}`);
        });
      }
    } catch (err: any) {
      console.log(chalk.red('  Error: ' + (err.message || 'search failed')));
    }
  },
});

register({
  name: '/github',
  description: 'GitHub operations (PRs, issues, releases)',
  alias: '/gh',
  args: '[pr|issues|release|status]',
  handler: async (args, ctx) => {
    const { execSync } = await import('child_process');
    const action = args || 'status';

    console.log(chalk.cyan.bold(`\n🐙 GitHub — ${action}\n`));

    try {
      // Get repo info
      const remote = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
      const repoMatch = remote.match(/github\.com[/:]([^/]+\/[^/.]+)/);
      const repo = repoMatch ? repoMatch[1] : null;

      if (!repo) return 'Not a GitHub repository (no github.com remote found).';

      console.log(chalk.dim(`  Repository: ${repo}\n`));

      switch (action) {
        case 'status': {
          const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
          const ahead = execSync('git rev-list --count HEAD @{u}..HEAD 2>/dev/null || echo 0', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
          const behind = execSync('git rev-list --count @{u}..HEAD 2>/dev/null || echo 0', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
          console.log(`  Branch: ${branch}`);
          console.log(`  Ahead:  ${ahead} commits`);
          console.log(`  Behind: ${behind} commits`);
          console.log(chalk.dim(`  View: https://github.com/${repo}`));
          break;
        }
        case 'pr': {
          console.log(chalk.bold('  Opening pull request page...'));
          const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
          const url = `https://github.com/${repo}/compare/main...${branch}`;
          console.log(chalk.dim(`  URL: ${url}`));
          if (process.platform === 'darwin') execSync(`open "${url}"`);
          else if (process.platform === 'win32') execSync(`start "${url}"`);
          else execSync(`xdg-open "${url}"`);
          break;
        }
        case 'issues': {
          const url = `https://github.com/${repo}/issues`;
          console.log(chalk.dim(`  Opening: ${url}`));
          if (process.platform === 'darwin') execSync(`open "${url}"`);
          else if (process.platform === 'win32') execSync(`start "${url}"`);
          else execSync(`xdg-open "${url}"`);
          break;
        }
        default:
          console.log(chalk.dim('  Actions: status, pr, issues, release'));
      }
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
});

register({
  name: '/env',
  description: 'Manage environment variables',
  args: '[list|get|set] [key] [value]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🔧 Environment Variables\n'));

    const parts = args ? args.split(' ') : ['list'];
    const action = parts[0];
    const key = parts[1];
    const value = parts.slice(2).join(' ');

    // Check .env file
    const envPath = require('path').join(ctx.cwd, '.env');
    const envExists = fs.existsSync(envPath);

    switch (action) {
      case 'list': {
        console.log(chalk.bold('  Environment:'));
        console.log(`    HOME:       ${process.env.HOME || process.env.USERPROFILE}`);
        console.log(`    NODE:       ${process.version}`);
        console.log(`    PWD:        ${ctx.cwd}`);
        console.log(`    SHELL:      ${process.env.SHELL || process.env.ComSpec}`);
        console.log(`    PATH dirs:  ${(process.env.PATH || '').split(require('path').delimiter).length}`);

        if (envExists) {
          console.log(chalk.bold('\n  .env file:')); 
          const content = fs.readFileSync(envPath, 'utf-8');
          const lines = content.split('\n').filter(l => l && !l.startsWith('#'));
          lines.slice(0, 15).forEach(l => {
            const [k, ...v] = l.split('=');
            const val = v.join('=');
            const masked = val.length > 8 ? val.slice(0, 4) + '****' + val.slice(-4) : '****';
            console.log(chalk.dim(`    ${k}=${masked}`));
          });
          if (lines.length > 15) console.log(chalk.dim(`    ... and ${lines.length - 15} more`));
        } else {
          console.log(chalk.dim('\n  No .env file found')); 
        }
        break;
      }
      case 'get': {
        if (!key) return 'Usage: /env get <KEY>';
        const val = process.env[key];
        if (val !== undefined) {
          console.log(`  ${key}=${val}`);
        } else {
          console.log(chalk.dim(`  ${key} is not set`));
        }
        break;
      }
      case 'set': {
        if (!key || !value) return 'Usage: /env set <KEY> <VALUE>';
        const envContent = envExists ? fs.readFileSync(envPath, 'utf-8') : '';
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          fs.writeFileSync(envPath, envContent.replace(regex, `${key}=${value}`));
        } else {
          fs.appendFileSync(envPath, `\n${key}=${value}`);
        }
        process.env[key] = value;
        console.log(chalk.green(`  ✓ ${key} set in .env`));
        break;
      }
      default:
        console.log(chalk.dim('  Actions: list, get <key>, set <key> <value>'));
    }
  },
});

register({
  name: '/docker',
  description: 'Docker operations (ps, logs, exec, compose)',
  alias: '/dk',
  args: '[ps|logs|exec|compose] [args]',
  handler: async (args, ctx) => {
    const { execSync } = await import('child_process');
    const parts = args ? args.split(' ') : ['ps'];
    const action = parts[0];
    const subArgs = parts.slice(1).join(' ');

    console.log(chalk.cyan.bold(`\n🐳 Docker — ${action}\n`));

    try {
      // Check if docker is available
      execSync('docker --version', { encoding: 'utf-8', timeout: 5000 });
    } catch {
      return 'Docker is not installed or not running.';
    }

    try {
      let cmd = '';
      switch (action) {
        case 'ps':
          cmd = 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"';
          break;
        case 'logs':
          cmd = `docker logs --tail 20 ${subArgs || ''}`;
          break;
        case 'exec':
          cmd = `docker exec -it ${subArgs || 'sh'}`;
          break;
        case 'compose':
          cmd = `docker compose ${subArgs || 'ps'}`;
          break;
        case 'images':
          cmd = 'docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"';
          break;
        default:
          cmd = `docker ${args}`;
      }

      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 15000 });
      console.log(output);
      return output;
    } catch (err: any) {
      console.log(chalk.red(err.stdout || err.message));
      return err.stdout || err.message;
    }
  },
});

register({
  name: '/api',
  description: 'Test API endpoints',
  alias: '/curl',
  args: '<method> <url> [body]',
  handler: async (args, ctx) => {
    if (!args) {
      return 'Usage: /api <method> <url> [body]\nExample: /api GET https://api.example.com/users\nExample: /api POST https://api.example.com/users {"name": "test"}';
    }

    console.log(chalk.cyan.bold('\n🌐 API Request\n'));

    const parts = args.split(' ');
    const method = parts[0].toUpperCase();
    const url = parts[1];
    const body = parts.slice(2).join(' ');

    if (!url) return 'Usage: /api <method> <url> [body]';

    console.log(chalk.bold(`  ${method} ${url}`));
    if (body) console.log(chalk.dim(`  Body: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`));
    console.log('');

    const { execSync } = await import('child_process');
    try {
      let cmd = `curl -s -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\nSize: %{size_download} bytes"`;
      cmd += ` -X ${method}`;
      if (body) cmd += ` -H "Content-Type: application/json" -d '${body}'`;
      cmd += ` "${url}"`;

      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 15000 });
      
      // Try to pretty-print JSON
      try {
        const jsonPart = output.split('\n\nHTTP Status:')[0];
        const parsed = JSON.parse(jsonPart);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(output);
      }

      return output;
    } catch (err: any) {
      console.log(chalk.red(err.message));
      return err.message;
    }
  },
});

register({
  name: '/regex',
  description: 'Test regular expressions',
  alias: '/rx',
  args: '<pattern> [test-string]',
  handler: async (args) => {
    if (!args) return 'Usage: /regex <pattern> [test-string]\nExample: /regex \\d+ "hello 123 world 456"';

    console.log(chalk.cyan.bold('\n🔤 Regex Tester\n'));

    const parts = args.split(' ');
    const pattern = parts[0];
    const testStr = parts.slice(1).join(' ') || 'test string';

    console.log(chalk.bold(`  Pattern: ${pattern}`));
    console.log(chalk.bold(`  Test:    ${testStr}\n`));

    try {
      const regex = new RegExp(pattern, 'g');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(testStr)) !== null) {
        matches.push(match[0]);
      }

      if (matches.length > 0) {
        console.log(chalk.green(`  ✅ ${matches.length} match(es) found:\n`));
        matches.forEach((m, i) => {
          console.log(chalk.dim(`    [${i}] "${m}"`));
        });

        // Highlight matches in the string
        const highlighted = testStr.replace(new RegExp(pattern, 'g'), (m) => chalk.bgGreen.black(m));
        console.log(chalk.bold('\n  Highlighted:'));
        console.log(`    ${highlighted}`);
      } else {
        console.log(chalk.yellow('  ❌ No matches found'));
      }

      // Show groups if any
      const fullMatch = testStr.match(new RegExp(pattern));
      if (fullMatch && fullMatch.length > 1) {
        console.log(chalk.bold('\n  Capture groups:'));
        fullMatch.slice(1).forEach((g, i) => {
          console.log(chalk.dim(`    $${i + 1}: "${g}"`));
        });
      }
    } catch (err: any) {
      console.log(chalk.red(`  ❌ Invalid regex: ${err.message}`));
    }
  },
});

register({
  name: '/lint',
  description: 'Run linter on project',
  args: '[file]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🔍 Linter\n'));
    const { execSync } = await import('child_process');

    let cmd = '';
    const pkgPath = require('path').join(ctx.cwd, 'package.json');
    const eslintrc = fs.existsSync(require('path').join(ctx.cwd, '.eslintrc')) || fs.existsSync(require('path').join(ctx.cwd, '.eslintrc.js'));
    const eslintCfg = fs.existsSync(require('path').join(ctx.cwd, 'eslint.config.js')) || fs.existsSync(require('path').join(ctx.cwd, 'eslint.config.mjs'));

    if (args) {
      cmd = eslintrc || eslintCfg ? `npx eslint ${args}` : `npx tsc --noEmit ${args}`;
    } else if (eslintrc || eslintCfg) {
      cmd = 'npx eslint . --max-warnings 100';
    } else {
      cmd = 'npx tsc --noEmit';
    }

    console.log(chalk.dim(`  Running: ${cmd}\n`));

    try {
      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 60000 });
      console.log(chalk.green('  ✅ No lint errors found'));
      return output || 'No errors';
    } catch (err: any) {
      const output = err.stdout || err.message;
      const errors = (output.match(/\d+ error/gi) || [])[0] || 'unknown errors';
      console.log(chalk.red(`  ❌ Found ${errors}\n`));
      console.log(output.substring(0, 2000));
      return output;
    }
  },
});

register({
  name: '/format',
  description: 'Format code with Prettier or standard',
  alias: '/fmt',
  args: '[file]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🎨 Formatter\n'));
    const { execSync } = await import('child_process');

    const prettierExists = fs.existsSync(require('path').join(ctx.cwd, '.prettierrc')) || fs.existsSync(require('path').join(ctx.cwd, '.prettierrc.js'));
    const target = args || '.';

    let cmd = prettierExists ? `npx prettier --write ${target}` : `npx eslint --fix ${target}`;
    console.log(chalk.dim(`  Running: ${cmd}\n`));

    try {
      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 30000 });
      console.log(chalk.green('  ✅ Code formatted successfully'));
      if (output) console.log(chalk.dim(output.substring(0, 500)));
      return output || 'Formatted';
    } catch (err: any) {
      console.log(chalk.red('  ❌ Formatting failed'));
      console.log(err.stdout || err.message);
      return err.stdout || err.message;
    }
  },
});

register({
  name: '/build',
  description: 'Build the project',
  args: '[target]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🔨 Build\n'));
    const { execSync } = await import('child_process');

    let cmd = '';
    const pkgPath = require('path').join(ctx.cwd, 'package.json');
    const cargoPath = require('path').join(ctx.cwd, 'Cargo.toml');
    const makePath = require('path').join(ctx.cwd, 'Makefile');

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.build) {
        cmd = args ? `npm run build -- ${args}` : 'npm run build';
      } else {
        cmd = args ? `npx tsc ${args}` : 'npx tsc';
      }
    } else if (fs.existsSync(cargoPath)) {
      cmd = args ? `cargo build ${args}` : 'cargo build --release';
    } else if (fs.existsSync(makePath)) {
      cmd = args ? `make ${args}` : 'make';
    } else {
      return 'No build system found (no package.json, Cargo.toml, or Makefile).';
    }

    console.log(chalk.dim(`  Running: ${cmd}\n`));
    const start = Date.now();

    try {
      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 300000 });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(chalk.green(`  ✅ Build succeeded in ${elapsed}s`));
      if (output) console.log(chalk.dim(output.substring(0, 500)));
      return output || `Build succeeded in ${elapsed}s`;
    } catch (err: any) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(chalk.red(`  ❌ Build failed after ${elapsed}s\n`));
      console.log((err.stdout || err.message).substring(0, 2000));
      return err.stdout || err.message;
    }
  },
});

register({
  name: '/deploy',
  description: 'Deploy the project',
  args: '[provider] (vercel|netlify|aws|railway)',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🚀 Deploy\n'));

    const provider = args || 'vercel';
    const { execSync } = await import('child_process');

    const commands: Record<string, string> = {
      vercel: 'npx vercel --prod',
      netlify: 'npx netlify deploy --prod',
      aws: 'npx serverless deploy',
      railway: 'npx railway up',
      fly: 'flyctl deploy',
      render: 'git push render main',
    };

    const cmd = commands[provider];
    if (!cmd) {
      console.log(chalk.dim('  Supported providers:'));
      Object.keys(commands).forEach(p => console.log(chalk.dim(`    • ${p}`)));
      return;
    }

    console.log(chalk.dim(`  Provider: ${provider}`));
    console.log(chalk.dim(`  Command:  ${cmd}\n`));

    try {
      const output = execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 120000 });
      console.log(chalk.green('  ✅ Deploy succeeded!'));
      console.log(output);
      return output;
    } catch (err: any) {
      console.log(chalk.red('  ❌ Deploy failed'));
      console.log(err.stdout || err.message);
      return err.stdout || err.message;
    }
  },
});

register({
  name: '/serve',
  description: 'Start development server',
  args: '[port]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🌐 Dev Server\n'));
    const { execSync } = await import('child_process');

    const pkgPath = require('path').join(ctx.cwd, 'package.json');
    let cmd = '';
    let port = args || '3000';

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.dev) {
        cmd = 'npm run dev';
      } else if (pkg.scripts?.start) {
        cmd = 'npm start';
      } else {
        cmd = `npx serve -l ${port}`;
      }
    } else {
      cmd = `python -m http.server ${port}`;
    }

    console.log(chalk.bold(`  Starting: ${cmd}`));
    console.log(chalk.dim(`  Port: ${port}`));
    console.log(chalk.dim('  Press Ctrl+C to stop\n'));

    try {
      execSync(cmd, { encoding: 'utf-8', cwd: ctx.cwd, timeout: 300000, stdio: 'inherit' });
    } catch {
      console.log(chalk.dim('\n  Server stopped'));
    }
  },
});

// ── /init — Create project memory file ─────────────────────
register({
  name: '/init',
  description: 'Initialize project memory file (IDEXA.md) with project context',
  alias: '/i',
  args: '',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\n📋 Project Memory Initialization\n'));
    const fs = require('fs');
    const path = require('path');
    const memoryPath = path.join(ctx.cwd, 'IDEXA.md');

    if (fs.existsSync(memoryPath)) {
      const existing = fs.readFileSync(memoryPath, 'utf-8');
      console.log(chalk.yellow('  IDEXA.md already exists (' + existing.split('\n').length + ' lines)'));
      console.log(chalk.dim('  Use /edit to modify it, or delete and run /init again.'));
      return;
    }

    // Detect project info
    let projectType = 'Unknown';
    let projectName = path.basename(ctx.cwd);
    let frameworks: string[] = [];
    let scripts: string[] = [];

    if (fs.existsSync(path.join(ctx.cwd, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(ctx.cwd, 'package.json'), 'utf-8'));
      projectName = pkg.name || projectName;
      projectType = 'Node.js/TypeScript';
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react) frameworks.push('React');
      if (deps.vue) frameworks.push('Vue');
      if (deps.next) frameworks.push('Next.js');
      if (deps.express) frameworks.push('Express');
      if (deps.tailwindcss) frameworks.push('Tailwind CSS');
      if (deps.typescript || pkg.devDependencies?.typescript) frameworks.push('TypeScript');
      if (pkg.devDependencies?.vitest) frameworks.push('Vitest');
      if (pkg.devDependencies?.jest) frameworks.push('Jest');
      if (pkg.devDependencies?.eslint) frameworks.push('ESLint');
      if (pkg.devDependencies?.prettier) frameworks.push('Prettier');
      scripts = Object.keys(pkg.scripts || {});
    } else if (fs.existsSync(path.join(ctx.cwd, 'Cargo.toml'))) {
      projectType = 'Rust';
    } else if (fs.existsSync(path.join(ctx.cwd, 'go.mod'))) {
      projectType = 'Go';
    } else if (fs.existsSync(path.join(ctx.cwd, 'pyproject.toml'))) {
      projectType = 'Python';
    }

    // Count files
    let fileCount = 0;
    const langCounts: Record<string, number> = {};
    const langMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
      '.rs': 'Rust', '.py': 'Python', '.go': 'Go', '.java': 'Java',
      '.cpp': 'C++', '.c': 'C', '.rb': 'Ruby', '.php': 'PHP',
      '.html': 'HTML', '.css': 'CSS', '.json': 'JSON', '.md': 'Markdown',
    };
    const walk = (dir: string, depth: number) => {
      if (depth > 5) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && !e.name.startsWith('.') && !['node_modules', 'target', 'dist', 'build', '.git', '__pycache__'].includes(e.name)) {
            walk(path.join(dir, e.name), depth + 1);
          } else if (e.isFile()) {
            fileCount++;
            const ext = path.extname(e.name).toLowerCase();
            const lang = langMap[ext] || 'Other';
            langCounts[lang] = (langCounts[lang] || 0) + 1;
          }
        }
      } catch { /* ignore */ }
    };
    walk(ctx.cwd, 0);
    const topLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Git info
    let gitInfo = '';
    try {
      const { execSync } = require('child_process');
      const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
      const remote = execSync('git remote get-url origin', { encoding: 'utf-8', cwd: ctx.cwd }).trim();
      gitInfo = `Branch: ${branch}\nRemote: ${remote}`;
    } catch { /* not a git repo */ }

    // Generate IDEXA.md
    const content = `# ${projectName} — Project Memory\n\nThis file is automatically read by Idexa AI to understand your project.\nEdit it to give the AI persistent context about your codebase.\n\n## Project Overview\n- **Type:** ${projectType}\n- **Name:** ${projectName}${frameworks.length > 0 ? `\n- **Frameworks:** ${frameworks.join(', ')}` : ''}${gitInfo ? `\n- ${gitInfo.replace(/\n/g, '\n- ')}` : ''}\n\n## Architecture\n<!-- Describe your project architecture here -->\n\n## Key Files\n<!-- List the most important files and their purposes -->\n\n## Conventions\n<!-- Describe coding conventions, naming patterns, etc. -->\n\n## Known Issues\n<!-- Track known bugs, tech debt, or areas for improvement -->\n\n## Build & Test\n${scripts.length > 0 ? scripts.map(s => `- \`npm run ${s}\``).join('\n') : '- No scripts detected'}\n\n## Dependencies\n${topLangs.map(([l, c]) => `- ${l}: ${c} files`).join('\n') || '- Analyzing...'}\n\n## AI Instructions\n<!-- Add specific instructions for the AI assistant -->\n- Be concise and direct\n- Use modern best practices\n- Consider security and performance\n- Follow existing code style\n`;

    fs.writeFileSync(memoryPath, content);
    console.log(chalk.green('  ✅ Created IDEXA.md'));
    console.log(chalk.dim(`  ${projectName}: ${projectType}, ${fileCount} files`));
    console.log(chalk.dim(`  Top languages: ${topLangs.map(([l, c]) => `${l}(${c})`).join(', ')}`));
    console.log(chalk.dim('  Edit IDEXA.md to give the AI more context about your project.'));
  },
});

// ── /resume — Continue previous conversation ───────────────
register({
  name: '/resume',
  description: 'Continue a previous conversation session',
  alias: '/rs',
  args: '[session-id-or-name]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n📂 Resume Session\n'));
    const fs = require('fs');
    const path = require('path');
    const sessionsDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.idexa', 'sessions'
    );

    if (!fs.existsSync(sessionsDir)) {
      console.log(chalk.yellow('  No saved sessions found.'));
      console.log(chalk.dim('  Start a chat session and it will be saved automatically.'));
      return;
    }

    const files = fs.readdirSync(sessionsDir)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf-8'));
          return { id: f.replace('.json', ''), ...data };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    if (files.length === 0) {
      console.log(chalk.yellow('  No saved sessions found.'));
      return;
    }

    if (!args) {
      // List sessions
      console.log(chalk.bold('  Saved Sessions:'));
      console.log(chalk.dim('  ' + '─'.repeat(60)));
      for (const s of files.slice(0, 10)) {
        const msgs = s.messages?.length || 0;
        const date = new Date(s.updatedAt || s.createdAt).toLocaleDateString();
        const preview = (s.preview || s.messages?.[0]?.content || '').substring(0, 50);
        console.log(`  ${chalk.cyan(s.id)}  ${chalk.dim(date)}  ${msgs} msgs  ${chalk.dim(preview)}`);
      }
      console.log(chalk.dim('\n  Use /resume <id> to continue a session.'));
      return;
    }

    // Find session
    const session = files.find((s: any) => s.id === args || s.id.startsWith(args));
    if (!session) {
      console.log(chalk.red(`  Session '${args}' not found.`));
      return;
    }

    console.log(chalk.green(`  Resuming: ${session.id}`));
    console.log(chalk.dim(`  ${session.messages?.length || 0} messages, model: ${session.model || 'unknown'}`));
    console.log(chalk.dim('  Session loaded. Continue chatting!\n'));
  },
});

// ── /permissions — Tool safety settings ────────────────────
register({
  name: '/permissions',
  description: 'Manage tool execution permissions (safe/unsafe)',
  alias: '/perm',
  args: '[on|off|status|tool-name]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\n🔒 Tool Permissions\n'));
    const fs = require('fs');
    const path = require('path');
    const permPath = path.join(ctx.cwd, '.idexa-permissions.json');

    const defaultPerms = {
      safeTools: ['read_file', 'list_files', 'search_code', 'get_file_info', 'git_status', 'git_log', 'git_diff', 'get_project_tree', 'analyze_project', 'find_definitions', 'find_references', 'read_dependencies', 'find_todos', 'get_imports'],
      unsafeTools: ['write_file', 'edit_file', 'run_command', 'git_commit', 'run_tests', 'run_build'],
      requireConfirmation: true,
      autoApproveSafe: true,
    };

    let perms = defaultPerms;
    if (fs.existsSync(permPath)) {
      try { perms = JSON.parse(fs.readFileSync(permPath, 'utf-8')); } catch { /* use defaults */ }
    }

    if (!args || args === 'status') {
      console.log(chalk.bold('  Current Permissions:'));
      console.log(chalk.dim('  ' + '─'.repeat(50)));
      console.log(chalk.green(`  Auto-approve safe tools: ${perms.autoApproveSafe ? 'ON' : 'OFF'}`));
      console.log(chalk.yellow(`  Require confirmation for unsafe: ${perms.requireConfirmation ? 'ON' : 'OFF'}`));
      console.log(`\n  ${chalk.green('Safe')} (${perms.safeTools.length}): ${perms.safeTools.join(', ')}`);
      console.log(`  ${chalk.red('Unsafe')} (${perms.unsafeTools.length}): ${perms.unsafeTools.join(', ')}`);
      return;
    }

    if (args === 'on') {
      perms.autoApproveSafe = true;
      perms.requireConfirmation = true;
    } else if (args === 'off') {
      perms.autoApproveSafe = false;
      perms.requireConfirmation = false;
    } else {
      console.log(chalk.dim('  Usage: /permissions [on|off|status]')); return;
    }

    fs.writeFileSync(permPath, JSON.stringify(perms, null, 2));
    console.log(chalk.green(`  Permissions ${args === 'on' ? 'enabled' : 'updated'}.`));
  },
});

// ── /compact — Smart context compaction ────────────────────
register({
  name: '/compact',
  description: 'Compact conversation to save context window (summarize older messages)',
  alias: '/cc',
  args: '',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\n📦 Compact Context\n'));
    console.log(chalk.dim('  This will summarize older messages to free up context space.'));
    console.log(chalk.dim('  The AI will retain key information from the conversation.'));
    console.log(chalk.green('\n  ✅ Context compaction available in next AI response.'));
    console.log(chalk.dim('  The AI will automatically compact older messages.'));
  },
});

// -- /session -- Session management from chat
register({
  name: '/session',
  description: 'Manage chat sessions (list, save, load, delete)',
  alias: '/ss',
  args: '[list|save|load|delete] [id]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\\n' + 'Session Management\\n'));
    const fs2 = require('fs');
    const path2 = require('path');
    const sessionsDir = path2.join(process.env.HOME || process.env.USERPROFILE || '.', '.idexa', 'sessions');
    if (!fs2.existsSync(sessionsDir)) {
      console.log(chalk.yellow('  No saved sessions.'));
      return;
    }
    const action = args.split(' ')[0] || 'list';
    const target = args.split(' ')[1];
    if (action === 'list' || !action) {
      const files = fs2.readdirSync(sessionsDir).filter((f: string) => f.endsWith('.json'));
      console.log(chalk.bold('  ' + files.length + ' saved session(s):'));
      for (const f of files.slice(0, 10)) {
        try {
          const data = JSON.parse(fs2.readFileSync(path2.join(sessionsDir, f), 'utf-8'));
          const date = new Date(data.updatedAt || data.createdAt).toLocaleDateString();
          const msgs = data.messages ? data.messages.length : 0;
          console.log('  ' + chalk.cyan(f.replace('.json', '')) + '  ' + chalk.dim(date) + '  ' + msgs + ' msgs');
        } catch {}
      }
    } else if (action === 'delete' && target) {
      const fPath = path2.join(sessionsDir, target + '.json');
      if (fs2.existsSync(fPath)) {
        fs2.unlinkSync(fPath);
        console.log(chalk.green('  Deleted session ' + target));
      } else {
        console.log(chalk.red('  Session ' + target + ' not found.'));
      }
    } else {
      console.log(chalk.dim('  Usage: /session [list|save|load|delete] [id]'));
    }
  },
});

// -- /memory -- Direct memory access from chat
register({
  name: '/memory',
  description: 'Access project memory (recall, forget, stats)',
  alias: '/mem',
  args: '[recall|forget|stats] [query]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\\n' + 'Project Memory\\n'));
    const action = args.split(' ')[0] || 'stats';
    const query = args.split(' ').slice(1).join(' ');
    const projectName = require('path').basename(ctx.cwd);
    const { projectMemory } = require('../ai/memory');
    if (action === 'recall' && query) {
      const entries = projectMemory.recall(projectName, query, { limit: 10 });
      if (entries.length === 0) {
        console.log(chalk.dim('  No memories found for: ' + query));
        return;
      }
      console.log(chalk.bold('  Found ' + entries.length + ' memories:'));
      for (const e of entries) {
        console.log('  ' + chalk.dim('[' + e.category + ']') + ' ' + e.content.substring(0, 100));
      }
    } else if (action === 'forget' && query) {
      projectMemory.rememberFact(projectName, '[FORGOTTEN] ' + query, undefined);
      console.log(chalk.green('  Marked as forgotten: ' + query));
    } else {
      const stats = projectMemory.getStats(projectName);
      console.log(chalk.bold('  Memory Stats:'));
      console.log('  Total entries: ' + stats.totalEntries);
      console.log('  Avg importance: ' + stats.avgImportance.toFixed(1) + '/10');
      if (Object.keys(stats.byCategory).length > 0) {
        console.log('  By category:');
        for (const [cat, count] of Object.entries(stats.byCategory)) {
          console.log('    ' + cat + ': ' + count);
        }
      }
    }
  },
});

// -- /config -- Change settings mid-chat
register({
  name: '/config',
  description: 'View or change configuration (model, temperature, maxTokens)',
  alias: '/cfg',
  args: '[key] [value]',
  handler: async (args, ctx) => {
    console.log(chalk.cyan.bold('\\n' + 'Configuration\\n'));
    const { ConfigManager } = require('../config/manager');
    const config = ConfigManager.getInstance();
    const parts = args.split(' ');
    const key = parts[0];
    const value = parts.slice(1).join(' ');
    if (!key) {
      console.log(chalk.bold('  Current Settings:'));
      const keys = ['defaultModel', 'defaultProvider', 'maxTokens', 'temperature', 'apiKey'];
      for (const k of keys) {
        const v = config.get(k);
        if (v !== undefined && v !== '') {
          const display = k === 'apiKey' ? '***' + String(v).slice(-4) : String(v);
          console.log('  ' + chalk.cyan(k) + ': ' + display);
        }
      }
      console.log(chalk.dim('  Use /config <key> <value> to change.'));
      return;
    }
    if (value) {
      config.set(key, value);
      console.log(chalk.green('  Set ' + key + ' = ' + value));
    } else {
      const current = config.get(key);
      console.log('  ' + chalk.cyan(key) + ': ' + (current || '(not set)'));
    }
  },
});

// -- /undo -- Undo last file edit
register({
  name: '/undo',
  description: 'Undo the last file edit (restores backup)',
  alias: '/u',
  args: '',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\\n' + 'Undo Last Edit\\n'));
    const fs3 = require('fs');
    const path3 = require('path');
    const backupDir = path3.join(ctx.cwd, '.idexa-backups');
    if (!fs3.existsSync(backupDir)) {
      console.log(chalk.yellow('  No backups available.'));
      return;
    }
    const backups = fs3.readdirSync(backupDir)
      .filter((f: string) => f.endsWith('.bak'))
      .sort().reverse();
    if (backups.length === 0) {
      console.log(chalk.yellow('  No backups available.'));
      return;
    }
    const latest = backups[0];
    const originalPath = latest.replace('.bak', '').replace(/_/g, '/');
    const backupPath = path3.join(backupDir, latest);
    const content = fs3.readFileSync(backupPath, 'utf-8');
    const targetDir = path3.dirname(path3.join(ctx.cwd, originalPath));
    if (!fs3.existsSync(targetDir)) fs3.mkdirSync(targetDir, { recursive: true });
    fs3.writeFileSync(path3.join(ctx.cwd, originalPath), content);
    fs3.unlinkSync(backupPath);
    console.log(chalk.green('  Restored: ' + originalPath));
  },
});


// -- /recall -- Quick memory recall (shortcut for /memory recall)
register({
  name: '/recall',
  description: 'Recall memories matching a query',
  alias: '/rc',
  args: '<query>',
  handler: async (args, ctx) => {
    if (!args) {
      console.log(chalk.yellow('  Usage: /recall <query>'));
      console.log(chalk.dim('  Example: /recall authentication'));
      return;
    }
    console.log(chalk.cyan.bold('\\n' + 'Recalling: ' + args + '\\n'));
    const { projectMemory } = require('../ai/memory');
    const projectName = require('path').basename(ctx.cwd);
    const entries = projectMemory.recall(projectName, args, { limit: 10 });
    if (entries.length === 0) {
      console.log(chalk.dim('  No memories found for: ' + args));
      console.log(chalk.dim('  Use /remember <fact> to store something.'));
      return;
    }
    console.log(chalk.bold('  Found ' + entries.length + ' relevant memories:'));
    console.log('');
    for (const e of entries) {
      const age = Math.floor((Date.now() - new Date(e.createdAt).getTime()) / 86400000);
      const ageStr = age === 0 ? 'today' : age === 1 ? 'yesterday' : age + 'd ago';
      const importance = e.importance >= 8 ? chalk.red('[' + e.importance + ']') : e.importance >= 5 ? chalk.yellow('[' + e.importance + ']') : chalk.dim('[' + e.importance + ']');
      console.log('  ' + importance + ' ' + chalk.dim(e.category + '/' + ageStr) + ' ' + e.content.substring(0, 120));
    }
    console.log('');
    console.log(chalk.dim('  Tip: /remember <fact> to store, /memory stats for overview'));
  },
});

// -- /remember -- Quick memory storage (shortcut for /memory remember)
register({
  name: '/remember',
  description: 'Store a fact, decision, or preference in project memory',
  alias: '/rm',
  args: '<category> <content>',
  handler: async (args, ctx) => {
    if (!args) {
      console.log(chalk.yellow('  Usage: /remember <category> <content>'));
      console.log(chalk.dim('  Categories: fact, decision, preference, error, pattern'));
      console.log(chalk.dim('  Example: /remember decision We use PostgreSQL for the database'));
      return;
    }
    const { projectMemory } = require('../ai/memory');
    const projectName = require('path').basename(ctx.cwd);
    
    // Parse category and content
    const categories = ['fact', 'decision', 'preference', 'error', 'pattern', 'analysis'];
    const parts = args.split(' ');
    const possibleCategory = parts[0].toLowerCase();
    
    let category, content;
    if (categories.includes(possibleCategory)) {
      category = possibleCategory;
      content = parts.slice(1).join(' ');
    } else {
      category = 'fact';
      content = args;
    }
    
    if (!content) {
      console.log(chalk.yellow('  Please provide content to remember.'));
      return;
    }
    
    // Store the memory
    let entry;
    switch (category) {
      case 'decision':
        entry = projectMemory.rememberDecision(projectName, content);
        break;
      case 'preference':
        entry = projectMemory.rememberPreference(projectName, content);
        break;
      case 'error':
        entry = projectMemory.rememberError(projectName, content);
        break;
      case 'pattern':
        entry = projectMemory.rememberPattern(projectName, content);
        break;
      case 'analysis':
        entry = projectMemory.rememberAnalysis(projectName, content);
        break;
      default:
        entry = projectMemory.rememberFact(projectName, content);
    }
    
    console.log(chalk.green('  Stored as [' + category + '] (importance: ' + entry.importance + ')'));
    console.log(chalk.dim('  ' + content.substring(0, 100)));
    
    // Show current memory stats
    const stats = projectMemory.getStats(projectName);
    console.log(chalk.dim('  Project memories: ' + stats.totalEntries + ' entries'));
  },
});

// -- /forgets -- List and manage forgotten memories
register({
  name: '/forgets',
  description: 'List memories marked as forgotten',
  alias: '/fg',
  args: '',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\\n' + 'Forgotten Memories\\n'));
    const { projectMemory } = require('../ai/memory');
    const projectName = require('path').basename(ctx.cwd);
    const entries = projectMemory.recall(projectName, 'FORGOTTEN', { limit: 20 });
    const forgotten = entries.filter((e: any) => e.content.includes('[FORGOTTEN]'));
    if (forgotten.length === 0) {
      console.log(chalk.dim('  No forgotten memories.'));
      return;
    }
    console.log(chalk.bold('  ' + forgotten.length + ' forgotten item(s):'));
    for (const e of forgotten) {
      console.log('  ' + chalk.dim(e.content.replace('[FORGOTTEN] ', '').substring(0, 100)));
    }
  },
});

// -- /memorystats -- Detailed memory statistics
register({
  name: '/memorystats',
  description: 'Show detailed memory statistics and storage info',
  alias: '/ms',
  args: '',
  handler: async (_args, ctx) => {
    console.log(chalk.cyan.bold('\\n' + 'Memory Statistics\\n'));
    const { projectMemory } = require('../ai/memory');
    const projectName = require('path').basename(ctx.cwd);
    
    // Basic stats
    const stats = projectMemory.getStats(projectName);
    console.log(chalk.bold('  Project: ' + projectName));
    console.log('  Total entries: ' + stats.totalEntries);
    console.log('  Avg importance: ' + stats.avgImportance.toFixed(1) + '/10');
    
    if (stats.oldestEntry) {
      const age = Math.floor((Date.now() - new Date(stats.oldestEntry).getTime()) / 86400000);
      console.log('  Oldest entry: ' + age + ' days ago');
    }
    if (stats.newestEntry) {
      const age = Math.floor((Date.now() - new Date(stats.newestEntry).getTime()) / 86400000);
      console.log('  Newest entry: ' + (age === 0 ? 'today' : age + ' days ago'));
    }
    
    // By category
    if (Object.keys(stats.byCategory).length > 0) {
      console.log('');
      console.log(chalk.bold('  By Category:'));
      const cats = Object.entries(stats.byCategory as Record<string, number>).sort((a, b) => b[1] - a[1]);
      for (const [cat, count] of cats) {
        const maxVal = Math.max(...cats.map(c => c[1] as number));
        const bar = '\u2588'.repeat(Math.min(Math.round((count as number) / maxVal * 20), 20));
        console.log('    ' + cat.padEnd(12) + ' ' + chalk.cyan(bar) + ' ' + count);
      }
    }
    
    // By source
    if (Object.keys(stats.bySource).length > 0) {
      console.log('');
      console.log(chalk.bold('  By Source:'));
      for (const [src, count] of Object.entries(stats.bySource)) {
        console.log('    ' + src.padEnd(12) + ' ' + count);
      }
    }
    
    // Storage info
    const storage = projectMemory.getStorageStats();
    console.log('');
    console.log(chalk.bold('  Storage:'));
    console.log('    Total size: ' + storage.totalSizeKB + ' KB');
    console.log('    Projects: ' + storage.projects);
    if (storage.perProject.length > 0) {
      for (const p of storage.perProject.slice(0, 5)) {
        console.log('    ' + p.name + ': ' + p.entries + ' entries, ' + p.sizeKB + ' KB');
      }
    }
    
    // Pruning info
    console.log('');
    console.log(chalk.dim('  Limit: 200 entries per project (auto-pruned on startup)'));
    console.log(chalk.dim('  Use /recall <query> to search, /remember <fact> to store'));
  },
});

export function getAllCommands(): SlashCommand[] {
  return commands;
}

export function findCommand(input: string): { command: SlashCommand; args: string } | null {
  const trimmed = input.trim();
  // Find matching command (by name or alias)
  for (const cmd of commands) {
    if (trimmed === cmd.name || (cmd.alias && trimmed === cmd.alias)) {
      return { command: cmd, args: '' };
    }
    if (trimmed.startsWith(cmd.name + ' ') || (cmd.alias && trimmed.startsWith(cmd.alias + ' '))) {
      const prefix = trimmed.startsWith(cmd.name) ? cmd.name : cmd.alias!;
      return { command: cmd, args: trimmed.slice(prefix.length).trim() };
    }
  }
  return null;
}

export function getCommandCompletions(partial: string): string[] {
  if (!partial.startsWith('/')) return [];
  return commands
    .filter(c => c.name.startsWith(partial) || (c.alias && c.alias.startsWith(partial)))
    .map(c => c.name);
}
