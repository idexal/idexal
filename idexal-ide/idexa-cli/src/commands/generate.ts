import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface GenerateOptions {
  output?: string;
  language?: string;
  template?: string;
}

export class GenerateCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(description: string, options: GenerateOptions = {}): Promise<void> {
    const spinner = ora('Generating code...').start();

    try {
      const project = await detectProject();
      const language = options.language || project?.primaryLanguage || 'typescript';

      spinner.text = `Generating ${language} code...`;

      const messages: ChatMessage[] = [{
        role: 'user',
        content: this.buildPrompt(description, language, options.template)
      }];

      const response = await this.provider.chat(
        messages,
        this.getSystemPrompt(language),
        this.config.get('defaultModel') || 'gpt-4',
        { temperature: 0.7 }
      );

      spinner.succeed('Code generated');

      const code = this.extractCode(response);

      if (isJsonMode()) jsonSuccess({ description, language, code, codeLength: code.length });
      
      if (options.output) {
        await this.saveToFile(code, options.output);
      } else {
        await this.presentCode(code, description, language);
      }
    } catch (error: any) {
      spinner.fail(`Generation failed: ${error.message}`);
    }
  }

  private buildPrompt(description: string, language: string, template?: string): string {
    let prompt = `Generate ${language} code for: ${description}\n\n`;
    
    prompt += `Requirements:\n`;
    prompt += `- Clean, well-documented code\n`;
    prompt += `- Proper error handling\n`;
    prompt += `- TypeScript types (if applicable)\n`;
    prompt += `- Modern best practices\n`;
    
    if (template) {
      prompt += `\nUse template: ${template}\n`;
    }
    
    prompt += `\nProvide the complete implementation with all necessary imports.`;
    
    return prompt;
  }

  private getSystemPrompt(language: string): string {
    const prompts: Record<string, string> = {
      typescript: `You are an expert TypeScript developer. Generate clean, typed code with proper imports and exports. Use modern ES2022+ features.`,
      javascript: `You are an expert JavaScript developer. Generate clean, modern JavaScript code with proper JSDoc comments.`,
      python: `You are an expert Python developer. Generate clean Python code with type hints, docstrings, and proper imports.`,
      rust: `You are an expert Rust developer. Generate safe, idiomatic Rust code with proper error handling.`,
      go: `You are an expert Go developer. Generate clean Go code with proper error handling and documentation.`,
      java: `You are an expert Java developer. Generate clean Java code with proper documentation and best practices.`
    };
    
    return prompts[language] || prompts.typescript;
  }

  private extractCode(response: string): string {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches: string[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      matches.push(match[1].trim());
    }
    
    return matches.join('\n\n');
  }

  private async saveToFile(code: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.ensureDir(dir);
    await fs.writeFile(outputPath, code);
    console.log(chalk.green(`\n✓ Code saved to ${outputPath}`));
  }

  private async presentCode(code: string, description: string, language: string): Promise<void> {
    console.log(chalk.cyan('\n┌────────────────────────────────────────┐'));
    console.log(chalk.cyan('│         Generated Code                 │'));
    console.log(chalk.cyan('└────────────────────────────────────────┘\n'));
    console.log(code);
    console.log();

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Save to file', value: 'save' },
        { name: 'Copy to clipboard', value: 'copy' },
        { name: 'Generate tests', value: 'tests' },
        { name: 'Done', value: 'done' }
      ]
    }]);

    switch (action) {
      case 'save':
        const { fileName } = await inquirer.prompt([{
          type: 'input',
          name: 'fileName',
          message: 'File name:',
          default: `generated.${this.getExtension(language)}`
        }]);
        await this.saveToFile(code, fileName);
        break;
      
      case 'copy':
        const { execSync } = await import('child_process');
        try {
          execSync('clip', { input: code });
          console.log(chalk.green('✓ Copied to clipboard'));
        } catch {
          console.log(chalk.yellow('Could not copy to clipboard'));
        }
        break;
      
      case 'tests':
        console.log(chalk.gray('Generating tests...'));
        break;
    }
  }

  private getExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      rust: 'rs',
      go: 'go',
      java: 'java'
    };
    return extensions[language] || 'txt';
  }
}
