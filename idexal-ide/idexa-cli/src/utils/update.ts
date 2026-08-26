import chalk from 'chalk';
import axios from 'axios';
import { execSync } from 'child_process';
import { version } from '../../package.json';

export class UpdateManager {
  private packageName = 'idexa-cli';
  private currentVersion: string;

  constructor() {
    this.currentVersion = version;
  }

  async checkForUpdates(): Promise<void> {
    try {
      const response = await axios.get(`https://registry.npmjs.org/${this.packageName}/latest`);
      const latestVersion = response.data.version;

      if (this.isNewer(latestVersion, this.currentVersion)) {
        console.log(chalk.yellow(`\nUpdate available: ${this.currentVersion} → ${latestVersion}`));
        console.log(chalk.gray('Run `idexa update` to install'));
      } else {
        console.log(chalk.green('✓ You are using the latest version'));
      }
    } catch (error) {
      console.log(chalk.gray('Could not check for updates'));
    }
  }

  async update(): Promise<void> {
    console.log(chalk.cyan('\nUpdating Idexa CLI...\n'));

    try {
      execSync(`npm install -g ${this.packageName}@latest`, { 
        stdio: 'inherit',
        shell: '/bin/sh'
      } as any);
      console.log(chalk.green('\n✓ Update complete!'));
    } catch (error) {
      console.log(chalk.red('\n✗ Update failed. Try running with sudo or check your npm permissions.'));
    }
  }

  private isNewer(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    return false;
  }
}
