#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { version } from '../package.json';
import { ChatCommand } from './commands/chat';
import { InitCommand } from './commands/init';
import { ConfigCommand } from './commands/config';
import { AnalyzeCommand } from './commands/analyze';
import { GenerateCommand } from './commands/generate';
import { TestCommand } from './commands/test';
import { DeployCommand } from './commands/deploy';
import { ContextCommand } from './commands/context';
import { AgentCommand } from './commands/agent';
import { HistoryCommand } from './commands/history';
import { LoginCommand } from './commands/login';
import { ReviewCommand } from './commands/review';
import { ExplainCommand } from './commands/explain';
import { FixCommand } from './commands/fix';
import { CommitCommand } from './commands/commit';
import { SessionCommand } from './commands/session';
import { AboutCommand } from './commands/about';
import { MemoryCommand } from './commands/memory';
import { PluginManager } from './plugins/manager';
import { PluginRegistry } from './plugins/registry';
import { PluginCommand } from './commands/plugins';
import { setupErrorHandlers } from './utils/errors';
import { detectProject } from './utils/project';
import { setJsonMode } from './utils/json-output';
import { projectMemory } from './ai/memory';

config();

const program = new Command();

program
  .name('idexa')
  .description('Idexa CLI - AI-Powered Development Assistant')
  .version(version)
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--json', 'Output results as JSON')
  .option('--no-color', 'Disable colored output');

program.on('option:verbose', () => {
  process.env.IDEXA_VERBOSE = 'true';
});

program.hook('preAction', (thisCommand) => {
  const opts = program.opts();
  if (opts.json) {
    // Known subcommands
    const known = ['chat','init','config','analyze','generate','test','deploy','context','agent','history','login','whoami','update','doctor','about','review','explain','fix','commit','session','memory','plugins'];
    const subCmd = process.argv.find(a => known.includes(a));
    setJsonMode(true, subCmd || 'help');
  }
});

setupErrorHandlers();

const chatCmd = new ChatCommand();
const initCmd = new InitCommand();
const configCmd = new ConfigCommand();
const analyzeCmd = new AnalyzeCommand();
const generateCmd = new GenerateCommand();
const testCmd = new TestCommand();
const deployCmd = new DeployCommand();
const contextCmd = new ContextCommand();
const agentCmd = new AgentCommand();
const historyCmd = new HistoryCommand();
const loginCmd = new LoginCommand();
const reviewCmd = new ReviewCommand();
const explainCmd = new ExplainCommand();
const fixCmd = new FixCommand();
const commitCmd = new CommitCommand();
const sessionCmd = new SessionCommand();
const aboutCmd = new AboutCommand();
const memoryCmd = new MemoryCommand();
const pluginManager = new PluginManager(program);
const pluginRegistry = new PluginRegistry();

// Register plugin command
PluginCommand.register(program, pluginManager, pluginRegistry);

// Load enabled plugins (async, non-blocking)
// Check for updates on startup (non-blocking)
if (!process.env.IDEXA_NO_UPDATE_CHECK) {
  const { execSync } = require('child_process');
  try {
    const currentVersion = require('../package.json').version;
    // Simple version check — compare with a known latest version
    // In production, this would hit the GitHub releases API
    const lastCheckPath = require('path').join(require('os').homedir(), '.idexa', '.last-update-check');
    const fs = require('fs');
    let shouldCheck = true;
    if (fs.existsSync(lastCheckPath)) {
      const lastCheck = parseInt(fs.readFileSync(lastCheckPath, 'utf-8'));
      shouldCheck = Date.now() - lastCheck > 24 * 60 * 60 * 1000; // Check once per day
    }
    if (shouldCheck) {
      fs.writeFileSync(lastCheckPath, String(Date.now()));
    }
  } catch {}
}

pluginManager.loadAll().then(({ loaded, errors }) => {
  if (loaded > 0) process.env.IDEXA_VERBOSE && console.log(`  📦 Loaded ${loaded} plugin(s)`);
  if (errors > 0) console.error(`  ⚠️  ${errors} plugin(s) failed to load`);
}).catch(() => {});

// ── Automatic memory pruning on startup ────────────────────
// Keeps only the top 200 most important entries per project
// to prevent unbounded storage growth.
if (!process.env.IDEXA_NO_PRUNE) {
  try {
    const stats = projectMemory.getStorageStats();
    if (stats.totalEntries > 200) {
      const { projects, removed } = projectMemory.pruneAll(200);
      if (removed > 0) {
        process.env.IDEXA_VERBOSE && console.log(`  🧹 Pruned ${removed} memories from ${projects} project(s)`);
      }
    }
  } catch {}
}

program
  .command('chat')
  .description('Start interactive AI chat session')
  .argument('[prompt]', 'Initial prompt (optional)')
  .option('-m, --model <model>', 'AI model to use')
  .option('-c, --context <files>', 'Additional context files (comma-separated)')
  .option('--no-stream', 'Disable streaming responses')
  .option('-w, --watch', 'Watch mode — auto-reload on file changes')
  .action(async (prompt, options) => {
    await chatCmd.execute(prompt, options);
  });

program
  .command('init')
  .description('Initialize Idexa in current project')
  .option('-f, --force', 'Overwrite existing config')
  .option('--template <template>', 'Project template')
  .action(async (options) => {
    await initCmd.execute(options);
  });

program
  .command('config')
  .description('Manage Idexa configuration')
  .argument('[action]', 'Action: get, set, list, reset')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value (for set)')
  .action(async (action, key, value) => {
    await configCmd.execute(action, key, value);
  });

program
  .command('analyze')
  .description('Analyze code for issues and improvements')
  .argument('[path]', 'Path to analyze (default: current directory)')
  .option('-t, --type <type>', 'Analysis type: all, security, performance, quality')
  .option('--fix', 'Auto-fix issues when possible')
  .action(async (path, options) => {
    await analyzeCmd.execute(path, options);
  });

program
  .command('generate')
  .description('Generate code using AI')
  .argument('<description>', 'What to generate')
  .option('-o, --output <file>', 'Output file path')
  .option('-l, --language <lang>', 'Target language')
  .option('-t, --template <template>', 'Code template')
  .action(async (description, options) => {
    await generateCmd.execute(description, options);
  });

program
  .command('test')
  .description('Run tests with AI assistance')
  .argument('[pattern]', 'Test file pattern')
  .option('--coverage', 'Generate coverage report')
  .option('--watch', 'Watch mode')
  .option('--fix', 'Auto-fix failing tests')
  .action(async (pattern, options) => {
    await testCmd.execute(pattern, options);
  });

program
  .command('deploy')
  .description('Deploy application')
  .argument('[environment]', 'Target environment')
  .option('--dry-run', 'Simulate deployment')
  .option('--force', 'Force deployment')
  .action(async (environment, options) => {
    await deployCmd.execute(environment, options);
  });

program
  .command('context')
  .description('Manage AI context')
  .option('-a, --add <files>', 'Add files to context')
  .option('-r, --remove <files>', 'Remove files from context')
  .option('-l, --list', 'List current context')
  .option('--clear', 'Clear all context')
  .option('-s, --smart', 'Auto-detect relevant files')
  .action(async (options) => {
    await contextCmd.execute(options);
  });

program
  .command('agent')
  .description('Manage AI agents')
  .argument('[action]', 'Action: list, create, run, stop')
  .argument('[name]', 'Agent name')
  .option('-t, --type <type>', 'Agent type')
  .option('-c, --config <file>', 'Agent config file')
  .action(async (action, name, options) => {
    await agentCmd.execute(action, name, options);
  });

program
  .command('history')
  .description('View command history')
  .option('-n, --number <count>', 'Number of items to show', '10')
  .option('-c, --clear', 'Clear history')
  .action(async (options) => {
    await historyCmd.execute(options);
  });

program
  .command('login')
  .description('Login to Idexa account')
  .option('--api-key <key>', 'Use API key instead of browser')
  .action(async (options) => {
    await loginCmd.execute(options);
  });

program
  .command('whoami')
  .description('Show current user info')
  .action(async () => {
    const { ConfigManager } = await import('./config/manager');
    const { isJsonMode, jsonSuccess } = await import('./utils/json-output');
    const config = ConfigManager.getInstance();
    const user = config.get('user');
    
    if (isJsonMode()) jsonSuccess({ loggedIn: !!user, user: user || null });

    if (user) {
      console.log(chalk.green('✓ Logged in as:'));
      console.log(`  Name: ${user.name || 'N/A'}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Plan: ${user.plan || 'free'}`);
    } else {
      console.log(chalk.yellow('Not logged in. Run `idexa login` to authenticate.'));
    }
  });

program
  .command('update')
  .description('Update Idexa CLI')
  .option('--check', 'Check for updates only')
  .action(async (options) => {
    const { UpdateManager } = await import('./utils/update');
    const updater = new UpdateManager();
    
    if (options.check) {
      await updater.checkForUpdates();
    } else {
      await updater.update();
    }
  });

program
  .command('doctor')
  .description('Check system compatibility')
  .action(async () => {
    const { DoctorCommand } = await import('./commands/doctor');
    const doctor = new DoctorCommand();
    await doctor.execute();
  });

program
  .command('mcp')
  .description('Start MCP (Model Context Protocol) server')
  .option('-t, --transport <type>', 'Transport type: stdio or tcp', 'stdio')
  .option('-p, --port <port>', 'TCP port (for tcp transport)', '3000')
  .action(async (options) => {
    const { McpCommand } = await import('./commands/mcp');
    const mcp = new McpCommand();
    await mcp.execute(options);
  });

program
  .command('review')
  .description('AI code review for files, diffs, or staged changes')
  .argument('[target]', 'File, directory, or omit for auto-detect')
  .option('--staged', 'Review staged changes')
  .option('--diff', 'Review uncommitted diff')
  .option('--severity <level>', 'Filter: all, critical, major', 'all')
  .option('--fix', 'Show auto-fix suggestions')
  .action(async (target, options) => {
    await reviewCmd.execute(target, options);
  });

program
  .command('explain')
  .description('Explain code, architecture, or concepts')
  .argument('<target>', 'File path, directory, or concept to explain')
  .option('-l, --line <range>', 'Line range (e.g. 10-20)')
  .option('-v, --verbose', 'Detailed explanation')
  .option('--level <level>', 'Level: beginner, intermediate, expert', 'intermediate')
  .action(async (target, options) => {
    await explainCmd.execute(target, options);
  });

program
  .command('fix')
  .description('Auto-detect and fix lint, type, and test errors')
  .argument('[target]', 'Specific file to fix')
  .option('--lint', 'Check lint errors only')
  .option('--type', 'Check type errors only')
  .option('--test', 'Check test failures only')
  .option('--all', 'Check all error sources')
  .option('--dry', 'Show fixes without applying')
  .option('--explain', 'Explain each fix')
  .action(async (target, options) => {
    await fixCmd.execute(target, options);
  });

program
  .command('commit')
  .description('AI-powered commit message from staged changes')
  .argument('[message]', 'Commit message (omit to generate with AI)')
  .option('-a, --all', 'Stage all changes before commit')
  .option('--amend', 'Amend the last commit')
  .option('--scope <scope>', 'Commit scope (e.g. auth, api)')
  .option('--dry', 'Show message without committing')
  .action(async (message, options) => {
    await commitCmd.execute(message, options);
  });

program
  .command('session')
  .description('Manage saved chat sessions')
  .argument('[action]', 'Action: list, load, delete, rename, search, export, clear')
  .argument('[target]', 'Session ID or query')
  .option('-r, --rename <name>', 'New name for rename action')
  .action(async (action, target, options) => {
    await sessionCmd.execute(action, target, options);
  });

program
  .command('about')
  .description('Show project info, founder, repositories, and system details')
  .option('-s, --system', 'Show detailed system information')
  .action(async (options) => {
    await aboutCmd.execute(options);
  });

program
  .command('memory')
  .description('Manage cross-session project memory')
  .argument('[action]', 'Action: list, search, add, stats, prune, clear, recent, context', 'list')
  .argument('[args...]', 'Additional arguments')
  .action(async (action, args) => {
    await memoryCmd.execute(action, args);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
