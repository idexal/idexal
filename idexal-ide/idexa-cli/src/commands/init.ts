import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { detectProject } from '../utils/project';
import { ConfigManager } from '../config/manager';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface InitOptions {
  force?: boolean;
  template?: string;
}

export class InitCommand {
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  async execute(options: InitOptions = {}): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Initializing Idexa\n'));

    const project = await detectProject();
    if (!project && !options.force) {
      console.log(chalk.yellow('No project detected. Initializing in current directory.'));
    }

    const configPath = path.join(process.cwd(), '.idexa.json');
    
    if (await fs.pathExists(configPath) && !options.force) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'Idexa config already exists. Overwrite?',
        default: false
      }]);
      
      if (!overwrite) {
        console.log(chalk.gray('Init cancelled.'));
        return;
      }
    }

    const answers = isJsonMode() ? {
      name: project?.name || path.basename(process.cwd()),
      aiProvider: 'openai',
      defaultModel: 'gpt-4',
      autoContext: true,
      gitIntegration: true,
    } : await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: project?.name || path.basename(process.cwd())
      },
      {
        type: 'list',
        name: 'aiProvider',
        message: 'AI Provider:',
        choices: [
          { name: 'OpenAI (GPT-4)', value: 'openai' },
          { name: 'Anthropic (Claude)', value: 'anthropic' },
          { name: 'Local (Ollama)', value: 'local' },
          { name: 'Custom endpoint', value: 'custom' }
        ],
        default: this.config.get('aiProvider')?.type || 'openai'
      },
      {
        type: 'list',
        name: 'defaultModel',
        message: 'Default model:',
        choices: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
        default: this.config.get('defaultModel') || 'gpt-4'
      },
      {
        type: 'confirm',
        name: 'autoContext',
        message: 'Automatically detect project context?',
        default: true
      },
      {
        type: 'confirm',
        name: 'gitIntegration',
        message: 'Enable Git integration?',
        default: true
      }
    ]);

    const config = {
      name: answers.name,
      version: '1.0.0',
      aiProvider: {
        type: answers.aiProvider
      },
      defaultModel: answers.defaultModel,
      features: {
        autoContext: answers.autoContext,
        gitIntegration: answers.gitIntegration,
        streaming: true,
        codeAnalysis: true
      },
      context: {
        include: ['src/**', 'lib/**'],
        exclude: ['node_modules/**', 'dist/**', '*.test.*']
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    if (isJsonMode()) jsonSuccess({ initialized: true, configPath, name: config.name, aiProvider: config.aiProvider.type });
    console.log(chalk.green('\n✓ Idexa initialized successfully!'));

    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf-8');
      if (!gitignore.includes('.idexa.json')) {
        await fs.appendFile(gitignorePath, '\n# Idexa\n.idexa.json\n.idexa/\n');
        console.log(chalk.green('✓ Updated .gitignore'));
      }
    }

    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Set your API key: idexa config set apiKey <your-key>');
    console.log('  2. Start chatting: idexa chat');
    console.log('  3. Analyze your code: idexa analyze\n');
  }
}
