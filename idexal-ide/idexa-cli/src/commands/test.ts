import chalk from 'chalk';
import ora from 'ora';
import { execSync, spawn } from 'child_process';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface TestOptions {
  coverage?: boolean;
  watch?: boolean;
  fix?: boolean;
}

export class TestCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(pattern?: string, options: TestOptions = {}): Promise<void> {
    const project = await detectProject();
    if (!project) {
      console.log(chalk.red('No project detected'));
      return;
    }

    const testCommand = this.getTestCommand(project.type);
    if (!testCommand) {
      console.log(chalk.yellow('Could not detect test runner for this project'));
      return;
    }

    if (options.watch) {
      this.runWatch(testCommand, pattern);
      return;
    }

    const spinner = ora('Running tests...').start();

    try {
      const cmd = `${testCommand} ${pattern || ''} ${options.coverage ? '--coverage' : ''}`;
      const output = execSync(cmd, { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      
      spinner.succeed('Tests passed');
      if (isJsonMode()) jsonSuccess({ passed: true, output, pattern: pattern || null });
      console.log(output);
    } catch (error: any) {
      spinner.fail('Tests failed');
      
      if (error.stdout) {
        console.log(error.stdout);
      }
      
      if (error.status !== 0 && options.fix) {
        await this.fixFailingTests(error.stdout || error.stderr || '');
      }
    }
  }

  private runWatch(testCommand: string, pattern?: string): void {
    console.log(chalk.cyan('\n👀 Running in watch mode (Ctrl+C to exit)\n'));
    
    const cmd = testCommand.replace('run', 'watch');
    const child = spawn(cmd + (pattern ? ` ${pattern}` : ''), {
      shell: true,
      stdio: 'inherit'
    });

    process.on('SIGINT', () => {
      child.kill();
      process.exit(0);
    });
  }

  private getTestCommand(projectType: string): string | null {
    const commands: Record<string, string> = {
      javascript: 'npm test',
      typescript: 'npm test',
      react: 'npm test',
      nextjs: 'npm test',
      python: 'pytest',
      rust: 'cargo test',
      go: 'go test ./...',
      java: 'mvn test'
    };
    return commands[projectType] || null;
  }

  private async fixFailingTests(output: string): Promise<void> {
    console.log(chalk.cyan('\n🔧 Analyzing test failures...\n'));

    const messages: ChatMessage[] = [{
      role: 'user',
      content: `These tests are failing. Analyze the errors and provide fixes:\n\n${output.substring(0, 3000)}`
    }];

    const response = await this.provider.chat(
      messages,
      'You are a test debugging expert. Analyze the test failures and provide specific fixes.',
      this.config.get('defaultModel') || 'gpt-4'
    );

    console.log(chalk.cyan('\nSuggested fixes:\n'));
    console.log(response);
  }
}
