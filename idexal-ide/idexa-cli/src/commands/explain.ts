import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface ExplainOptions {
  file?: string;
  line?: string; // "10-20" or just "10"
  verbose?: boolean;
  level?: 'beginner' | 'intermediate' | 'expert';
}

export class ExplainCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(target: string, options: ExplainOptions = {}): Promise<void> {
    const spinner = ora('Analyzing...').start();

    try {
      let code: string;
      let description = '';

      // Check if target is a file path
      if (fs.existsSync(target)) {
        const stat = fs.statSync(target);
        if (stat.isFile()) {
          spinner.text = `Reading ${path.basename(target)}...`;
          code = fs.readFileSync(target, 'utf-8');
          
          // If line range specified, extract those lines
          if (options.line) {
            const lines = code.split('\n');
            const [start, end] = options.line.split('-').map(Number);
            const startLine = Math.max(0, (start || 1) - 1);
            const endLine = end ? Math.min(lines.length, end) : start || lines.length;
            code = lines.slice(startLine, endLine).join('\n');
            description = `Lines ${start}-${end || start} of ${target}`;
          } else {
            description = `File: ${target}`;
          }
        } else {
          // Directory — summarize structure
          spinner.text = 'Scanning directory structure...';
          code = this.getDirectorySummary(target);
          description = `Directory: ${target}`;
        }
      } else {
        // Treat as a concept or search query
        spinner.text = `Searching for "${target}"...`;
        code = this.searchCodebase(target);
        description = `Search results for "${target}"`;
      }

      spinner.text = 'AI explaining...';

      const messages: ChatMessage[] = [{
        role: 'user',
        content: this.buildExplainPrompt(code, description, options)
      }];

      const response = await this.provider.chat(
        messages,
        this.getExplainSystemPrompt(options.level || 'intermediate'),
        this.config.get('defaultModel') || 'gpt-4',
        { temperature: 0.5 }
      );

      spinner.succeed('Explanation ready');
      console.log('');
      this.displayExplanation(response, description);

      if (isJsonMode()) {
        jsonSuccess({ target, description, explanation: response });
      }
    } catch (error: any) {
      spinner.fail(`Explanation failed: ${error.message}`);
    }
  }

  private buildExplainPrompt(code: string, description: string, options: ExplainOptions): string {
    let prompt = `${description}\n\n`;
    
    if (options.verbose) {
      prompt += `Provide a detailed, in-depth explanation covering:\n`;
      prompt += `1. What this code does (purpose and behavior)\n`;
      prompt += `2. How it works (step-by-step flow)\n`;
      prompt += `3. Key design patterns and decisions\n`;
      prompt += `4. Dependencies and relationships\n`;
      prompt += `5. Potential edge cases or gotchas\n`;
    } else {
      prompt += `Explain this code concisely:\n`;
      prompt += `1. What does it do?\n`;
      prompt += `2. How does it work?\n`;
      prompt += `3. Key concepts involved\n`;
    }

    prompt += `\nCode:\n\`\`\`\n${code}\n\`\`\``;
    return prompt;
  }

  private getExplainSystemPrompt(level: string): string {
    const levelInstructions: Record<string, string> = {
      beginner: 'Explain as if teaching a junior developer. Use simple analogies, avoid jargon, define technical terms.',
      intermediate: 'Explain for an experienced developer. Be concise but thorough. Reference common patterns.',
      expert: 'Explain for a senior/staff engineer. Focus on non-obvious decisions, trade-offs, and architectural implications.',
    };

    return `You are an expert code educator for the Idexal IDE. You explain code clearly and thoroughly.

${levelInstructions[level]}

Structure your explanation:
- Start with a one-line summary
- Then a detailed breakdown
- Use code references (line numbers, function names)
- Highlight important patterns or anti-patterns
- Mention related concepts the reader should know`;
  }

  private getDirectorySummary(dirPath: string): string {
    let summary = `Directory: ${dirPath}\n\n`;
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const dirs: string[] = [];
      const files: string[] = [];
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        if (entry.isDirectory()) {
          dirs.push(entry.name);
        } else {
          files.push(entry.name);
        }
      }
      
      summary += `Directories: ${dirs.join(', ') || '(none)'}\n`;
      summary += `Files: ${files.join(', ') || '(none)'}\n\n`;
      
      // Read key files
      for (const file of files.slice(0, 5)) {
        if (/\.(ts|tsx|js|jsx|rs|py|go|json|md)$/.test(file)) {
          try {
            const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
            summary += `\n// File: ${file}\n${content.substring(0, 500)}${content.length > 500 ? '\n...' : ''}\n`;
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      summary += `Error reading directory: ${err.message}`;
    }
    
    return summary;
  }

  private searchCodebase(query: string): string {
    let results = `Search results for: "${query}"\n\n`;
    
    try {
      // Try ripgrep first
      const output = execSync(
        `rg -n -l "${query}" --max-count=3 --max-depth=3 2>/dev/null | head -20`,
        { encoding: 'utf-8', timeout: 10000 }
      );
      
      const files = output.trim().split('\n').filter(Boolean);
      results += `Found in ${files.length} files:\n\n`;
      
      for (const file of files.slice(0, 5)) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          const matches = lines
            .map((line, i) => ({ line: i + 1, text: line }))
            .filter(l => l.text.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3);
          
          results += `// ${file}\n`;
          for (const match of matches) {
            results += `  ${match.line}: ${match.text.trim()}\n`;
          }
          results += '\n';
        } catch { /* skip */ }
      }
    } catch {
      results += 'No matches found using ripgrep. Try: grep -r "pattern" .\n';
    }
    
    return results;
  }

  private displayExplanation(explanation: string, description: string): void {
    console.log(chalk.bold.cyan('  📖 Explanation'));
    console.log(chalk.gray(`  ${description}`));
    console.log('  ' + '─'.repeat(40));
    console.log(explanation);
    console.log('');
  }
}
