import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { marked } from 'marked';
import { AIProvider, ChatMessage, ChatOptions } from '../ai/provider';
import { ContextManager } from '../ai/context';
import { ConfigManager } from '../config/manager';
import { HistoryManager } from '../utils/history';
import { detectProject, ProjectInfo } from '../utils/project';
import { TokenCounter } from '../ai/tokens';
import { StreamingRenderer } from '../utils/streaming';
import { isJsonMode, jsonSuccess } from '../utils/json-output';
import { runToolLoop, formatToolCall, formatToolResult } from '../ai/tool-loop';
import { findCommand } from '../ai/slash-commands';
import { projectMemory } from '../ai/memory';

export class ChatCommand {
  private provider: AIProvider;
  private context: ContextManager;
  private config: ConfigManager;
  private history: HistoryManager;
  private streaming: StreamingRenderer;
  private isRunning = false;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
    this.context = new ContextManager(this.config);
    this.history = new HistoryManager();
    this.streaming = new StreamingRenderer();
  }

  async execute(initialPrompt?: string, options: ChatOptions = {}): Promise<void> {
    console.log(chalk.cyan.bold('\n╔══════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║     🤖 Idexa AI Chat Session        ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════╝\n'));

    const project = await detectProject();
    if (project) {
      console.log(chalk.gray(`Project: ${project.name} (${project.type})`));
      console.log(chalk.gray(`Files: ${project.fileCount} | Languages: ${project.languages.join(', ')}`));
    }

    const model = options.model || this.config.get('defaultModel') || 'gpt-4';
    console.log(chalk.gray(`Model: ${model}\n`));

    await this.context.initialize(project);

    // ── Load cross-session memory ──────────────────────
    const projectName = project?.name || 'default';
    const memoryContext = projectMemory.buildContextForChat(projectName, initialPrompt || '');
    if (memoryContext) {
      console.log(chalk.gray(`📂 Loaded ${projectMemory.getStats(projectName).totalEntries} memories from previous sessions`));
    }

    const messages: ChatMessage[] = [];

    if (isJsonMode() && initialPrompt) {
      // In JSON mode, send the prompt and return the response
      const response = await this.provider.chat(
        [{ role: 'user', content: initialPrompt }],
        this.buildSystemPrompt(await this.context.getProjectContext()),
        model,
        { temperature: 0.7 }
      );
      jsonSuccess({ prompt: initialPrompt, response, model, messageCount: 1 });
    }

    if (initialPrompt) {
      await this.processMessage(initialPrompt, messages, model, options);
    }

    this.isRunning = true;

    while (this.isRunning) {
      try {
        const { input } = await inquirer.prompt([{
          type: 'input',
          name: 'input',
          message: chalk.cyan('You:'),
          validate: (input) => input.trim().length > 0 || 'Please enter a message'
        }]);

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          console.log(chalk.yellow('\nGoodbye! 👋'));
          break;
        }

        // Handle slash commands
        if (input.startsWith('/')) {
          const match = findCommand(input);
          if (match) {
            const ctx = { cwd: process.cwd(), messages };
            const result = await match.command.handler(match.args, ctx);
            if (result) console.log(result);
            continue;
          }
          console.log(chalk.yellow('Unknown command. Type /help for available commands.'));
          continue;
        }

        await this.processMessage(input, messages, model, options);
      } catch (error: any) {
        if (error.name === 'ExitPromptError') {
          console.log(chalk.yellow('\nGoodbye! 👋'));
          break;
        }
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
  }

  private async processMessage(
    input: string,
    messages: ChatMessage[],
    model: string,
    options: ChatOptions
  ): Promise<void> {
    const projectContext = this.context.getProjectContext();
    const projectName = (await detectProject())?.name || 'default';
    const memoryCtx = projectMemory.buildContextForChat(projectName, input);
    const systemPrompt = this.buildSystemPrompt(projectContext, memoryCtx);

    messages.push({ role: 'user', content: input });

    // ── Store user message as memory ─────────────────
    if (input.length > 20) {
      projectMemory.rememberFact(projectName, `User asked: ${input.substring(0, 200)}`);
    }

    const tokenCount = TokenCounter.count([...messages]);
    if (tokenCount > 100000) {
      console.log(chalk.yellow('⚠ Context window getting full. Consider /clear to start fresh.'));
    }

    const spinner = ora({
      text: 'Thinking...',
      spinner: 'dots',
      color: 'cyan'
    }).start();

    try {
      // Use the agentic tool loop — model can call tools (read_file, write_file, etc.)
      // and we execute them automatically, feeding results back.
      spinner.stop();
      let firstChunk = true;

      const response = await runToolLoop(this.provider, {
        model,
        systemPrompt,
        messages,
        onToolCall: (name, args) => {
          if (firstChunk) { firstChunk = false; console.log(''); }
          console.log(formatToolCall(name, args));
        },
        onToolResult: (result) => {
          console.log(formatToolResult(result));
          console.log('');
        },
        onText: (text) => {
          if (firstChunk) { firstChunk = false; process.stdout.write(chalk.cyan('\nIdexa: ')); }
          process.stdout.write(text);
        },
        temperature: 0.7,
      });

      if (!firstChunk) console.log('\n');
      else this.printResponse(response);

      // ── Store AI response as memory ──────────────────
      if (response.length > 30) {
        projectMemory.rememberAnalysis(projectName, `Q: ${input.substring(0, 100)}\nA: ${response.substring(0, 300)}`, 'chat');
      }

      this.history.add(input);
    } catch (error: any) {
      spinner.stop();
      throw error;
    }
  }

  private printResponse(response: string): void {
    console.log(chalk.cyan('\nIdexa: '));
    
    try {
      const rendered = marked.parse(response);
      console.log(rendered);
    } catch {
      console.log(response);
    }
    console.log();
  }



  private buildSystemPrompt(context: string, memoryContext?: string): string {
    // Auto-read IDEXA.md project memory if it exists
    let idexaMd = '';
    try {
      const fs = require('fs');
      const pathMod = require('path');
      const idexaPath = pathMod.join(process.cwd(), 'IDEXA.md');
      if (fs.existsSync(idexaPath)) {
        idexaMd = fs.readFileSync(idexaPath, 'utf-8');
      }
    } catch { /* ignore */ }

    return `You are Idexa, an expert AI coding assistant built into the Idexal IDE and CLI.
You help developers write, understand, debug, and improve code.

You have access to tools that let you read, write, edit, and search files, run commands, and check git status.
Use these tools proactively when the user asks you to do something.
Always read files before editing them. Show the user what you're doing.
When editing files, make the smallest precise change needed.
${idexaMd ? `\n## Project Memory (IDEXA.md)\n${idexaMd}\n` : ''}
Current project context:
${context || 'No project context available'}
${memoryContext ? `\nCross-session memory (from previous conversations):\n${memoryContext}` : ''}

Guidelines:
- Be concise and direct
- Use tools to read files before modifying them
- Make targeted edits, don't rewrite entire files
- Explain your reasoning when helpful
- Use modern best practices
- Consider security and performance
- When generating code, include all necessary imports
- Format code with proper indentation
- Confirm file writes and edits with the user
- Remember important decisions, patterns, and errors for future sessions
- When the user asks about the project, use the project memory above for context
- Update IDEXA.md when you learn important project information`;
  }

}
