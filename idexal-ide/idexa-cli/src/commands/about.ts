import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { version } from '../../package.json';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface AboutOptions {
  json?: boolean;
  system?: boolean;
}

export class AboutCommand {
  async execute(options: AboutOptions = {}): Promise<void> {
    if (isJsonMode()) {
      jsonSuccess(this.getAboutData());
      return;
    }

    this.printBanner();
    this.printProductInfo();
    this.printFounder();
    this.printRepositories();
    this.printTechStack();
    if (options.system) {
      this.printSystemInfo();
    }
    this.printFooter();
  }

  private printBanner(): void {
    console.log('');
    console.log(chalk.cyan.bold('  ╔══════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('  ║                                                  ║'));
    console.log(chalk.cyan.bold('  ║   ⚡  Idexa CLI                                  ║'));
    console.log(chalk.cyan.bold('  ║   AI-Powered Development Assistant               ║'));
    console.log(chalk.cyan.bold('  ║                                                  ║'));
    console.log(chalk.cyan.bold('  ╚══════════════════════════════════════════════════╝'));
    console.log('');
  }

  private printProductInfo(): void {
    console.log(chalk.bold('  Product Information'));
    console.log(chalk.gray('  ' + '─'.repeat(46)));
    console.log(`  ${chalk.gray('Name:')}        ${chalk.white('Idexa CLI')}`);
    console.log(`  ${chalk.gray('Version:')}     ${chalk.green('v' + version)}`);
    console.log(`  ${chalk.gray('License:')}     ${chalk.white('MIT')}`);
    console.log(`  ${chalk.gray('Description:')} ${chalk.white('AI-Powered Development Assistant')}`);
    console.log('');
  }

  private printFounder(): void {
    console.log(chalk.bold('  Founder & Developer'));
    console.log(chalk.gray('  ' + '─'.repeat(46)));
    console.log(`  ${chalk.gray('Name:')}        ${chalk.white('Zakariae Lahbabi')}`);
    console.log(`  ${chalk.gray('Role:')}        ${chalk.white('Founder, CEO & Lead Developer')}`);
    console.log(`  ${chalk.gray('Website:')}     ${chalk.blue('https://zakariaelahbabi.com')}`);
    console.log(`  ${chalk.gray('Email:')}       ${chalk.blue('info@zakariaelahbabi.com')}`);
    console.log('');
  }

  private printRepositories(): void {
    console.log(chalk.bold('  Repositories'));
    console.log(chalk.gray('  ' + '─'.repeat(46)));
    console.log(`  ${chalk.gray('IDE:')}         ${chalk.blue('https://github.com/idexal/idexal-ide')}`);
    console.log(`  ${chalk.gray('CLI:')}         ${chalk.blue('https://github.com/idexal/idexa-cli')}`);
    console.log(`  ${chalk.gray('Organization:')} ${chalk.blue('https://github.com/idexal')}`);
    console.log(`  ${chalk.gray('Website:')}     ${chalk.blue('https://idexa.com')}`);
    console.log('');
  }

  private printTechStack(): void {
    console.log(chalk.bold('  Tech Stack'));
    console.log(chalk.gray('  ' + '─'.repeat(46)));
    const techs = [
      { name: 'Node.js', color: '#68a063' },
      { name: 'TypeScript', color: '#3178c6' },
      { name: 'Commander.js', color: '#e2e8f0' },
      { name: 'OpenAI API', color: '#10a37f' },
      { name: 'Anthropic API', color: '#d4a574' },
      { name: 'Inquirer', color: '#e2e8f0' },
      { name: 'Chalk', color: '#e2e8f0' },
    ];
    for (const t of techs) {
      console.log(`  ${chalk.gray('•')} ${t.name}`);
    }
    console.log('');
  }

  private printSystemInfo(): void {
    console.log(chalk.bold('  System Information'));
    console.log(chalk.gray('  ' + '─'.repeat(46)));
    console.log(`  ${chalk.gray('Node:')}        ${chalk.white(process.version)}`);
    console.log(`  ${chalk.gray('Platform:')}    ${chalk.white(process.platform)}`);
    console.log(`  ${chalk.gray('Architecture:')} ${chalk.white(process.arch)}`);
    console.log(`  ${chalk.gray('OS:')}          ${chalk.white(this.getOS())}`);
    
    // Check for git
    try {
      const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
      console.log(`  ${chalk.gray('Git:')}         ${chalk.white(gitVersion.replace('git version ', ''))}`);
    } catch {
      console.log(`  ${chalk.gray('Git:')}         ${chalk.red('not installed')}`);
    }

    // Check for AI provider config
    try {
      const configPath = path.join(process.cwd(), '.idexa.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log(`  ${chalk.gray('Provider:')}    ${chalk.white(config.aiProvider?.type || 'not configured')}`);
        console.log(`  ${chalk.gray('Model:')}       ${chalk.white(config.defaultModel || 'not configured')}`);
      } else {
        console.log(`  ${chalk.gray('Project:')}     ${chalk.yellow('No .idexa.json found')}`);
      }
    } catch {
      console.log(`  ${chalk.gray('Project:')}     ${chalk.yellow('Config read error')}`);
    }
    console.log('');
  }

  private printFooter(): void {
    console.log(chalk.gray('  ' + '─'.repeat(46)));
    console.log(chalk.gray('  © 2026 Zakariae Lahbabi & Idexal'));
    console.log(chalk.gray('  Built with ❤️ for developers worldwide'));
    console.log('');
    console.log(chalk.gray('  Run with --system for detailed system info'));
    console.log(chalk.gray('  Run with --json for machine-readable output'));
    console.log('');
  }

  private getOS(): string {
    switch (process.platform) {
      case 'win32': return 'Windows';
      case 'darwin': return 'macOS';
      case 'linux': return 'Linux';
      default: return process.platform;
    }
  }

  private getAboutData() {
    return {
      product: {
        name: 'Idexa CLI',
        version,
        license: 'MIT',
        description: 'AI-Powered Development Assistant',
      },
      founder: {
        name: 'Zakariae Lahbabi',
        role: 'Founder, CEO & Lead Developer',
        website: 'https://zakariaelahbabi.com',
        email: 'info@zakariaelahbabi.com',
      },
      repositories: {
        ide: 'https://github.com/idexal/idexal-ide',
        cli: 'https://github.com/idexal/idexa-cli',
        organization: 'https://github.com/idexal',
      },
      website: 'https://idexa.com',
      contact: {
        team: 'team@idexal.com',
        support: 'ide@idexal.com',
      },
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }
}
