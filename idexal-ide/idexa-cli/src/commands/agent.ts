import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { AIProvider } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface AgentConfig {
  name: string;
  type: string;
  model?: string;
  systemPrompt?: string;
  tools?: string[];
}

export class AgentCommand {
  private config: ConfigManager;
  private agentsDir: string;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.agentsDir = path.join(process.cwd(), '.idexa', 'agents');
  }

  async execute(action?: string, name?: string, options?: { type?: string; config?: string }): Promise<void> {
    switch (action) {
      case 'list':
        await this.listAgents();
        break;
      case 'create':
        await this.createAgent(name, options?.type);
        break;
      case 'run':
        if (name) await this.runAgent(name);
        break;
      case 'stop':
        if (isJsonMode()) jsonSuccess({ action: 'stop', status: 'stopped' });
        console.log(chalk.yellow('Agent stopped'));
        break;
      default:
        this.printHelp();
    }
  }

  private async listAgents(): Promise<void> {
    await fs.ensureDir(this.agentsDir);
    const files = await fs.readdir(this.agentsDir);
    const agents = files.filter(f => f.endsWith('.json'));

    const agentList = [];
    for (const agent of agents) {
      const config = await fs.readJSON(path.join(this.agentsDir, agent));
      agentList.push({ name: config.name, type: config.type || 'custom', file: agent });
    }

    if (isJsonMode()) jsonSuccess({ agents: agentList, count: agentList.length });

    if (agents.length === 0) {
      console.log(chalk.gray('\nNo agents configured.'));
      console.log(chalk.gray('Create one with: idexa agent create <name>\n'));
      return;
    }

    console.log(chalk.cyan('\n🤖 Agents:\n'));
    for (const agent of agents) {
      const config = await fs.readJSON(path.join(this.agentsDir, agent));
      console.log(`  ${chalk.bold(config.name)} (${config.type || 'custom'})`);
    }
    console.log();
  }

  private async createAgent(name?: string, type?: string): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        default: name || 'my-agent'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Agent type:',
        choices: [
          { name: 'Code Assistant', value: 'code' },
          { name: 'Code Reviewer', value: 'review' },
          { name: 'Test Generator', value: 'test' },
          { name: 'Documentation', value: 'docs' },
          { name: 'Custom', value: 'custom' }
        ],
        default: type || 'code'
      },
      {
        type: 'input',
        name: 'systemPrompt',
        message: 'System prompt (optional):'
      }
    ]);

    const agentConfig: AgentConfig = {
      name: answers.name,
      type: answers.type,
      model: this.config.get('defaultModel') || 'gpt-4',
      systemPrompt: answers.systemPrompt || this.getDefaultPrompt(answers.type),
      tools: []
    };

    await fs.ensureDir(this.agentsDir);
    await fs.writeJSON(
      path.join(this.agentsDir, `${answers.name}.json`),
      agentConfig,
      { spaces: 2 }
    );

    console.log(chalk.green(`\n✓ Agent "${answers.name}" created\n`));
  }

  private async runAgent(name: string): Promise<void> {
    const agentPath = path.join(this.agentsDir, `${name}.json`);
    
    if (!await fs.pathExists(agentPath)) {
      console.log(chalk.red(`Agent "${name}" not found`));
      return;
    }

    const config = await fs.readJSON(agentPath) as AgentConfig;
    console.log(chalk.cyan(`\n🤖 Running agent: ${config.name}\n`));
    
    console.log(chalk.gray(`Type: ${config.type}`));
    console.log(chalk.gray(`Model: ${config.model || 'default'}\n`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));
  }

  private getDefaultPrompt(type: string): string {
    const prompts: Record<string, string> = {
      code: 'You are an expert coding assistant. Help write clean, efficient code.',
      review: 'You are a code reviewer. Find bugs, security issues, and improvements.',
      test: 'You are a test engineer. Generate comprehensive test cases.',
      docs: 'You are a technical writer. Create clear documentation.',
      custom: 'You are a helpful AI assistant.'
    };
    return prompts[type] || prompts.custom;
  }

  private printHelp(): void {
    console.log(chalk.cyan('\nAgent Commands:\n'));
    console.log('  idexa agent list          List all agents');
    console.log('  idexa agent create <name> Create a new agent');
    console.log('  idexa agent run <name>    Run an agent');
    console.log('  idexa agent stop          Stop running agent\n');
  }
}
