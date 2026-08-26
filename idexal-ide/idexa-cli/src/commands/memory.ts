import chalk from 'chalk';
import { projectMemory, MemoryEntry } from '../ai/memory';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

export class MemoryCommand {
  async execute(subcommand: string = 'list', args: string[] = []): Promise<void> {
    const project = await detectProject();
    const projectName = project?.name || 'default';

    switch (subcommand) {
      case 'list':
        await this.listMemories(projectName, args);
        break;
      case 'search':
        await this.searchMemories(projectName, args);
        break;
      case 'add':
        await this.addMemory(projectName, args);
        break;
      case 'stats':
        this.showStats(projectName);
        break;
      case 'prune':
        this.pruneMemories(projectName, args);
        break;
      case 'clear':
        this.clearMemories(projectName);
        break;
      case 'recent':
        this.showRecent(projectName, args);
        break;
      case 'context':
        this.showContext(projectName, args);
        break;
      default:
        this.printHelp();
    }
  }

  private async listMemories(project: string, args: string[]): Promise<void> {
    const category = args[0] as MemoryEntry['category'] | undefined;
    const entries = category
      ? projectMemory.getByCategory(project, category)
      : projectMemory.getRecent(project, 20);

    if (entries.length === 0) {
      console.log(chalk.gray('No memories stored yet for this project.'));
      console.log(chalk.gray('Memories are automatically stored during chat, analyze, review, and fix sessions.'));
      return;
    }

    if (isJsonMode()) {
      jsonSuccess({ project, count: entries.length, entries });
      return;
    }

    console.log(chalk.cyan.bold(`\n📂 Project Memory: ${project}`));
    console.log(chalk.gray(`${entries.length} entries${category ? ` (category: ${category})` : ''}\n`));

    for (const entry of entries) {
      const age = this.formatAge(entry.createdAt);
      const catColor = this.categoryColor(entry.category);
      console.log(`  ${catColor(`[${entry.category}]`)} ${chalk.gray(age)} ${chalk.white(this.truncate(entry.content, 80))}`);
      if (entry.filePath) {
        console.log(chalk.gray(`    └─ ${entry.filePath}`));
      }
    }
    console.log();
  }

  private async searchMemories(project: string, args: string[]): Promise<void> {
    const query = args.join(' ');
    if (!query) {
      console.log(chalk.red('Usage: idexa memory search <query>'));
      return;
    }

    const results = projectMemory.recall(project, query, { limit: 15 });

    if (results.length === 0) {
      console.log(chalk.gray(`No memories matching "${query}"`));
      return;
    }

    if (isJsonMode()) {
      jsonSuccess({ project, query, count: results.length, results });
      return;
    }

    console.log(chalk.cyan.bold(`\n🔍 Search: "${query}" (${results.length} results)\n`));

    for (const entry of results) {
      const age = this.formatAge(entry.createdAt);
      const catColor = this.categoryColor(entry.category);
      const score = entry.importance;
      console.log(`  ${catColor(`[${entry.category}]`)} ${chalk.gray(`${age} · importance:${score}`)}`);
      console.log(`    ${chalk.white(this.truncate(entry.content, 100))}`);
      if (entry.filePath) {
        console.log(chalk.gray(`    └─ ${entry.filePath}`));
      }
    }
    console.log();
  }

  private async addMemory(project: string, args: string[]): Promise<void> {
    const [category, ...contentParts] = args;
    const content = contentParts.join(' ');

    if (!category || !content) {
      console.log(chalk.red('Usage: idexa memory add <category> <content>'));
      console.log(chalk.gray('Categories: analysis, decision, fact, error, pattern, preference'));
      return;
    }

    const validCategories = ['analysis', 'decision', 'fact', 'error', 'pattern', 'preference'];
    if (!validCategories.includes(category)) {
      console.log(chalk.red(`Invalid category. Use: ${validCategories.join(', ')}`));
      return;
    }

    const entry = projectMemory.remember(
      project,
      category as MemoryEntry['category'],
      content,
      { source: 'manual', importance: 6 }
    );

    if (isJsonMode()) {
      jsonSuccess({ project, entry });
      return;
    }

    console.log(chalk.green(`✅ Memory stored [${entry.category}] (id: ${entry.id})`));
  }

  private showStats(project: string): void {
    const stats = projectMemory.getStats(project);

    if (isJsonMode()) {
      jsonSuccess({ project, stats });
      return;
    }

    console.log(chalk.cyan.bold(`\n📊 Memory Stats: ${project}\n`));
    console.log(`  Total entries:     ${chalk.white(stats.totalEntries)}`);
    console.log(`  Avg importance:    ${chalk.white(stats.avgImportance.toFixed(1))}`);

    if (stats.oldestEntry) {
      console.log(`  Oldest entry:      ${chalk.gray(this.formatAge(stats.oldestEntry))}`);
    }
    if (stats.newestEntry) {
      console.log(`  Newest entry:      ${chalk.gray(this.formatAge(stats.newestEntry))}`);
    }

    if (Object.keys(stats.byCategory).length > 0) {
      console.log(chalk.cyan('\n  By Category:'));
      for (const [cat, count] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
        const bar = '█'.repeat(Math.min(count, 30));
        console.log(`    ${this.categoryColor(cat)(cat.padEnd(12))} ${chalk.white(count)} ${chalk.gray(bar)}`);
      }
    }

    if (Object.keys(stats.bySource).length > 0) {
      console.log(chalk.cyan('\n  By Source:'));
      for (const [src, count] of Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${chalk.gray(src.padEnd(12))} ${chalk.white(count)}`);
      }
    }
    console.log();
  }

  private pruneMemories(project: string, args: string[]): void {
    const days = parseInt(args[0]) || 90;
    const removed = projectMemory.pruneOld(project, days);

    if (isJsonMode()) {
      jsonSuccess({ project, daysToKeep: days, removed });
      return;
    }

    console.log(chalk.green(`✅ Pruned ${removed} entries older than ${days} days`));
  }

  private clearMemories(project: string): void {
    projectMemory.clear(project);

    if (isJsonMode()) {
      jsonSuccess({ project, cleared: true });
      return;
    }

    console.log(chalk.yellow(`🗑️  Cleared all memories for "${project}"`));
  }

  private showRecent(project: string, args: string[]): void {
    const count = parseInt(args[0]) || 5;
    const entries = projectMemory.getRecent(project, count);

    if (entries.length === 0) {
      console.log(chalk.gray('No memories stored yet.'));
      return;
    }

    if (isJsonMode()) {
      jsonSuccess({ project, count: entries.length, entries });
      return;
    }

    console.log(chalk.cyan.bold(`\n🕐 Recent ${count} Memories: ${project}\n`));

    for (const entry of entries) {
      const age = this.formatAge(entry.createdAt);
      console.log(`  ${chalk.gray(age)} ${this.categoryColor(entry.category)(`[${entry.category}]`)}`);
      console.log(`    ${chalk.white(this.truncate(entry.content, 100))}`);
    }
    console.log();
  }

  private showContext(project: string, args: string[]): void {
    const query = args.join(' ') || 'project overview';
    const context = projectMemory.buildContextForChat(project, query);

    if (!context) {
      console.log(chalk.gray('No memory context available for this project.'));
      return;
    }

    if (isJsonMode()) {
      jsonSuccess({ project, query, context });
      return;
    }

    console.log(chalk.cyan.bold(`\n🧠 Memory Context for "${query}":\n`));
    console.log(context);
    console.log();
  }

  private printHelp(): void {
    console.log(chalk.cyan.bold('\n📂 Idexa Memory Commands\n'));
    console.log('  idexa memory list [category]    List stored memories');
    console.log('  idexa memory search <query>     Search memories by keyword');
    console.log('  idexa memory add <cat> <text>   Manually add a memory');
    console.log('  idexa memory stats              Show memory statistics');
    console.log('  idexa memory recent [count]     Show recent memories');
    console.log('  idexa memory context [query]    Show context that would be injected');
    console.log('  idexa memory prune [days]       Remove entries older than N days');
    console.log('  idexa memory clear              Clear all memories for project');
    console.log(chalk.gray('\n  Categories: analysis, decision, fact, error, pattern, preference'));
    console.log(chalk.gray('  Memories are automatically stored during chat, analyze, review, fix'));
    console.log(chalk.gray('  sessions. Cross-session recall happens automatically in new chats.\n'));
  }

  private formatAge(dateStr: string): string {
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  private truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
  }

  private categoryColor(cat: string): typeof chalk.cyan {
    switch (cat) {
      case 'analysis': return chalk.blue;
      case 'decision': return chalk.magenta;
      case 'fact': return chalk.green;
      case 'error': return chalk.red;
      case 'pattern': return chalk.yellow;
      case 'preference': return chalk.cyan;
      default: return chalk.white;
    }
  }
}
