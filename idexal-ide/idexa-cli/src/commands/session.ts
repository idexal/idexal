import chalk from 'chalk';
import inquirer from 'inquirer';
import { sessionManager, SessionManager } from '../utils/session';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface SessionOptions {
  list?: boolean;
  delete?: string;
  rename?: string;
  search?: string;
  export?: string;
}

export class SessionCommand {
  private manager: SessionManager;

  constructor() {
    this.manager = sessionManager;
  }

  async execute(action?: string, target?: string, options: SessionOptions = {}): Promise<void> {
    switch (action) {
      case 'list':
      case 'ls':
        this.listSessions();
        break;
      case 'load':
      case 'open':
        if (target) this.loadSession(target);
        else console.log(chalk.yellow('Usage: idexa session load <session-id>'));
        break;
      case 'delete':
      case 'rm':
        if (target) this.deleteSession(target);
        else console.log(chalk.yellow('Usage: idexa session delete <session-id>'));
        break;
      case 'rename':
        if (target && options.rename) this.renameSession(target, options.rename);
        else console.log(chalk.yellow('Usage: idexa session rename <session-id> <new-name>'));
        break;
      case 'search':
        if (target) this.searchSessions(target);
        else console.log(chalk.yellow('Usage: idexa session search <query>'));
        break;
      case 'export':
        if (target) this.exportSession(target);
        else console.log(chalk.yellow('Usage: idexa session export <session-id>'));
        break;
      case 'clear':
        await this.clearAllSessions();
        break;
      default:
        this.printHelp();
    }
  }

  private listSessions(): void {
    const sessions = this.manager.list();
    
    if (sessions.length === 0) {
      console.log(chalk.gray('\n  No saved sessions.\n'));
      console.log(chalk.gray('  Start a new session with: idexa chat\n'));
      return;
    }

    console.log(chalk.cyan.bold('\n  📁 Saved Sessions\n'));
    console.log(chalk.gray('  ' + '─'.repeat(60)));
    
    for (const session of sessions.slice(0, 20)) {
      const date = new Date(session.updatedAt).toLocaleDateString();
      const time = new Date(session.updatedAt).toLocaleTimeString();
      const msgCount = session.messages.length;
      const model = session.model || 'default';
      
      console.log(`  ${chalk.bold(session.id)}`);
      console.log(`    ${chalk.white(session.name)}`);
      console.log(`    ${chalk.gray(`${date} ${time}`)} · ${chalk.gray(`${msgCount} messages`)} · ${chalk.gray(model)}`);
      console.log('');
    }

    console.log(chalk.gray(`  Total: ${sessions.length} sessions\n`));

    if (isJsonMode()) {
      jsonSuccess({ sessions, count: sessions.length });
    }
  }

  private loadSession(id: string): void {
    const session = this.manager.load(id);
    if (!session) {
      console.log(chalk.red(`\n  Session not found: ${id}\n`));
      return;
    }

    console.log(chalk.cyan.bold('\n  📂 Loaded Session\n'));
    console.log(`  ${chalk.bold('Name:')} ${session.name}`);
    console.log(`  ${chalk.bold('Model:')} ${session.model}`);
    console.log(`  ${chalk.bold('Messages:')} ${session.messages.length}`);
    console.log(`  ${chalk.bold('Created:')} ${new Date(session.createdAt).toLocaleString()}`);
    console.log('');

    // Show last few messages
    const recent = session.messages.slice(-6);
    for (const msg of recent) {
      const role = msg.role === 'user' ? chalk.cyan('You') : chalk.green('Idexa');
      const preview = msg.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${role}: ${preview}${msg.content.length > 100 ? '...' : ''}`);
    }
    console.log('');

    if (isJsonMode()) {
      jsonSuccess({ session, loaded: true });
    }
  }

  private deleteSession(id: string): void {
    if (this.manager.delete(id)) {
      console.log(chalk.green(`\n  ✓ Deleted session: ${id}\n`));
    } else {
      console.log(chalk.red(`\n  Session not found: ${id}\n`));
    }
  }

  private renameSession(id: string, name: string): void {
    this.manager.rename(id, name);
    console.log(chalk.green(`\n  ✓ Renamed session ${id} to "${name}"\n`));
  }

  private searchSessions(query: string): void {
    const results = this.manager.search(query);
    
    if (results.length === 0) {
      console.log(chalk.gray(`\n  No sessions matching "${query}"\n`));
      return;
    }

    console.log(chalk.cyan(`\n  🔍 Found ${results.length} sessions matching "${query}"\n`));
    for (const session of results) {
      console.log(`  ${chalk.bold(session.id)} — ${session.name}`);
    }
    console.log('');
  }

  private exportSession(id: string): void {
    const session = this.manager.load(id);
    if (!session) {
      console.log(chalk.red(`\n  Session not found: ${id}\n`));
      return;
    }

    const exportPath = `session-${id}.md`;
    let content = `# ${session.name}\n\n`;
    content += `**Model:** ${session.model}\n`;
    content += `**Created:** ${session.createdAt}\n\n`;
    content += `---\n\n`;

    for (const msg of session.messages) {
      const role = msg.role === 'user' ? '## You' : '## Idexa';
      content += `${role}\n\n${msg.content}\n\n`;
    }

    const fs = require('fs');
    fs.writeFileSync(exportPath, content);
    console.log(chalk.green(`\n  ✓ Exported to ${exportPath}\n`));
  }

  private async clearAllSessions(): Promise<void> {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Delete ALL saved sessions?',
      default: false,
    }]);

    if (!confirm) {
      console.log(chalk.gray('  Cancelled.'));
      return;
    }

    const sessions = this.manager.list();
    for (const session of sessions) {
      this.manager.delete(session.id);
    }
    console.log(chalk.green(`\n  ✓ Deleted ${sessions.length} sessions\n`));
  }

  private printHelp(): void {
    console.log(chalk.cyan.bold('\n  📁 Session Commands\n'));
    console.log('  idexa session list              List all saved sessions');
    console.log('  idexa session load <id>         Load a session');
    console.log('  idexa session delete <id>       Delete a session');
    console.log('  idexa session rename <id> <n>   Rename a session');
    console.log('  idexa session search <query>    Search sessions');
    console.log('  idexa session export <id>       Export to markdown');
    console.log('  idexa session clear             Delete all sessions\n');
  }
}
