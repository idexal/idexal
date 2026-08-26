import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { version } from '../../package.json';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export class DoctorCommand {
  async execute(): Promise<void> {
    const results: CheckResult[] = [];

    results.push(this.checkNodeVersion());
    results.push(this.checkNpmVersion());
    results.push(this.checkGit());
    results.push(this.checkConfig());
    results.push(this.checkApiKey());

    if (isJsonMode()) {
      jsonSuccess({
        results: results.map(r => ({ name: r.name, status: r.status, message: r.message })),
        errors: results.filter(r => r.status === 'error').length,
        warnings: results.filter(r => r.status === 'warning').length,
        passed: results.every(r => r.status === 'ok'),
      });
    }

    console.log(chalk.cyan.bold('\n🩺 Idexa Doctor\n'));
    console.log(chalk.gray('Checking system compatibility...\n'));
    this.printResults(results);
  }

  private checkNodeVersion(): CheckResult {
    try {
      const version = execSync('node --version', { encoding: 'utf-8' }).trim();
      const major = parseInt(version.replace('v', '').split('.')[0]);
      
      if (major >= 18) {
        return { name: 'Node.js', status: 'ok', message: `${version} ✓` };
      }
      return { name: 'Node.js', status: 'warning', message: `${version} (18+ recommended)` };
    } catch {
      return { name: 'Node.js', status: 'error', message: 'Not found' };
    }
  }

  private checkNpmVersion(): CheckResult {
    try {
      const version = execSync('npm --version', { encoding: 'utf-8' }).trim();
      return { name: 'npm', status: 'ok', message: `${version} ✓` };
    } catch {
      return { name: 'npm', status: 'error', message: 'Not found' };
    }
  }

  private checkGit(): CheckResult {
    try {
      const version = execSync('git --version', { encoding: 'utf-8' }).trim();
      return { name: 'Git', status: 'ok', message: `${version.replace('git version ', '')} ✓` };
    } catch {
      return { name: 'Git', status: 'warning', message: 'Not found (optional)' };
    }
  }

  private checkConfig(): CheckResult {
    const configPath = path.join(process.cwd(), '.idexa.json');
    if (fs.existsSync(configPath)) {
      return { name: 'Config', status: 'ok', message: '.idexa.json found ✓' };
    }
    return { name: 'Config', status: 'warning', message: 'Not initialized (run idexa init)' };
  }

  private checkApiKey(): CheckResult {
    const configPath = path.join(os.homedir(), '.idexa', 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = fs.readJSONSync(configPath);
        if (config.user?.apiKey || config.aiProvider?.apiKey) {
          return { name: 'API Key', status: 'ok', message: 'Configured ✓' };
        }
      } catch {}
    }
    
    if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
      return { name: 'API Key', status: 'ok', message: 'Environment variable found ✓' };
    }
    
    return { name: 'API Key', status: 'warning', message: 'Not configured (run idexa login)' };
  }

  private printResults(results: CheckResult[]): void {
    for (const result of results) {
      const icon = result.status === 'ok' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      const color = result.status === 'ok' ? chalk.green : 
                    result.status === 'warning' ? chalk.yellow : chalk.red;
      
      console.log(`${icon} ${chalk.bold(result.name)}: ${color(result.message)}`);
    }

    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    console.log();
    if (errors === 0 && warnings === 0) {
      console.log(chalk.green.bold('All checks passed! ✓\n'));
    } else {
      console.log(chalk.gray(`${errors} error(s), ${warnings} warning(s)\n`));
    }
  }
}
