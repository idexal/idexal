import chalk from 'chalk';
import { ContextManager } from '../ai/context';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface ContextOptions {
  add?: string;
  remove?: string;
  list?: boolean;
  clear?: boolean;
  smart?: boolean;
}

export class ContextCommand {
  private context: ContextManager;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.context = new ContextManager(this.config);
  }

  async execute(options: ContextOptions): Promise<void> {
    if (options.add) {
      const files = options.add.split(',').map(f => f.trim());
      await this.context.addFiles(files);
      if (isJsonMode()) jsonSuccess({ action: 'add', files, added: files.length });
      console.log(chalk.green(`✓ Added ${files.length} file(s) to context`));
      return;
    }

    if (options.remove) {
      const files = options.remove.split(',').map(f => f.trim());
      await this.context.removeFiles(files);
      if (isJsonMode()) jsonSuccess({ action: 'remove', files, removed: files.length });
      console.log(chalk.green(`✓ Removed ${files.length} file(s) from context`));
      return;
    }

    if (options.clear) {
      this.context = new ContextManager(this.config);
      if (isJsonMode()) jsonSuccess({ action: 'clear', cleared: true });
      console.log(chalk.green('✓ Context cleared'));
      return;
    }

    if (options.smart) {
      const project = await detectProject();
      if (project) {
        await this.context.initialize(project);
        await this.context.smartDetect(project.rootPath);
        console.log(chalk.green('✓ Smart context detection complete'));
      }
    }

    const files = this.context.getFiles();

    if (isJsonMode()) jsonSuccess({ files, count: files.length });

    if (files.length === 0) {
      console.log(chalk.gray('\nNo files in context.'));
      console.log(chalk.gray('Use `idexa context --add <pattern>` to add files.'));
      console.log(chalk.gray('Use `idexa context --smart` for auto-detection.\n'));
      return;
    }

    console.log(chalk.cyan('\n📁 Files in context:\n'));
    files.forEach(f => console.log(`  ${chalk.gray('•')} ${f}`));
    console.log(chalk.gray(`\nTotal: ${files.length} files\n`));
  }
}
