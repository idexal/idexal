import chalk from 'chalk';
import { HistoryManager } from '../utils/history';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface HistoryOptions {
  number?: string;
  clear?: boolean;
}

export class HistoryCommand {
  private history: HistoryManager;

  constructor() {
    this.history = new HistoryManager();
  }

  async execute(options: HistoryOptions = {}): Promise<void> {
    if (options.clear) {
      this.history.clear();
      if (isJsonMode()) jsonSuccess({ action: 'clear', cleared: true });
      console.log(chalk.green('✓ History cleared'));
      return;
    }

    const count = parseInt(options.number || '10', 10);
    const items = this.history.getRecent(count);

    if (isJsonMode()) jsonSuccess({ items, count: items.length });

    if (items.length === 0) {
      console.log(chalk.gray('\nNo history yet.\n'));
      return;
    }

    console.log(chalk.cyan(`\n📜 Recent history (last ${items.length}):\n`));
    items.reverse().forEach((item, i) => {
      console.log(`  ${chalk.gray(`${i + 1}.`)} ${item}`);
    });
    console.log();
  }
}
