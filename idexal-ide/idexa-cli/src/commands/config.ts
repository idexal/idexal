import chalk from 'chalk';
import { ConfigManager } from '../config/manager';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

export class ConfigCommand {
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  async execute(action?: string, key?: string, value?: string): Promise<void> {
    switch (action) {
      case 'get': {
        const val = key ? this.config.get(key) : undefined;
        if (isJsonMode()) jsonSuccess({ action: 'get', key, value: val ?? null });
        if (key) {
          console.log(val !== undefined ? JSON.stringify(val, null, 2) : chalk.yellow('Key not found'));
        } else {
          console.log(chalk.yellow('Usage: idexa config get <key>'));
        }
        break;
      }

      case 'set': {
        if (key && value !== undefined) {
          let parsedValue: any = value;
          try {
            parsedValue = JSON.parse(value);
          } catch {}
          this.config.set(key, parsedValue);
          if (isJsonMode()) jsonSuccess({ action: 'set', key, value: parsedValue });
          console.log(chalk.green(`✓ Set ${key} = ${value}`));
        } else {
          if (isJsonMode()) jsonSuccess({ action: 'set', key: null, value: null, note: 'missing key or value' });
          console.log(chalk.yellow('Usage: idexa config set <key> <value>'));
        }
        break;
      }

      case 'list': {
        const allConfig = this.config.getAll();
        if (isJsonMode()) jsonSuccess({ action: 'list', config: allConfig });
        console.log(chalk.cyan('\nConfiguration:\n'));
        for (const [k, v] of Object.entries(allConfig)) {
          const displayValue = typeof v === 'object' ? JSON.stringify(v) : String(v);
          console.log(`  ${chalk.gray(k)}: ${displayValue}`);
        }
        console.log();
        break;
      }

      case 'reset': {
        this.config.reset();
        if (isJsonMode()) jsonSuccess({ action: 'reset' });
        console.log(chalk.green('✓ Configuration reset to defaults'));
        break;
      }

      default: {
        if (isJsonMode()) jsonSuccess({ action: 'help', usage: ['get <key>', 'set <key> <value>', 'list', 'reset'] });
        console.log(chalk.cyan('\nIdexa Configuration\n'));
        console.log('Usage:');
        console.log('  idexa config get <key>     Get a config value');
        console.log('  idexa config set <key> <value>  Set a config value');
        console.log('  idexa config list          List all config');
        console.log('  idexa config reset         Reset to defaults\n');
        break;
      }
    }
  }
}
