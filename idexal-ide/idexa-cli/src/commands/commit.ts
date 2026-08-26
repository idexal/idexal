import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';
import inquirer from 'inquirer';

interface CommitOptions {
  message?: string;
  stage?: boolean;
  all?: boolean;
  amend?: boolean;
  conventional?: boolean;
  scope?: string;
  dry?: boolean;
}

export class CommitCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(message?: string, options: CommitOptions = {}): Promise<void> {
    const spinner = ora('Analyzing changes...').start();

    try {
      // Stage files if requested
      if (options.all) {
        spinner.text = 'Staging all changes...';
        execSync('git add -A', { encoding: 'utf-8', timeout: 10000 });
      }

      // Get staged diff
      let diff: string;
      try {
        diff = execSync('git diff --cached', { encoding: 'utf-8', timeout: 10000 });
      } catch {
        diff = '';
      }

      if (!diff.trim()) {
        spinner.warn('No staged changes to commit');
        console.log(chalk.gray('\n  Tip: Run "git add <files>" first, or use --all to stage everything\n'));
        return;
      }

      // Get file list
      let files: string;
      try {
        files = execSync('git diff --cached --name-only', { encoding: 'utf-8', timeout: 5000 });
      } catch {
        files = '';
      }

      // Generate commit message if not provided
      let commitMsg = message;
      
      if (!commitMsg) {
        spinner.text = 'AI generating commit message...';
        
        const messages: ChatMessage[] = [{
          role: 'user',
          content: this.buildCommitPrompt(diff, files, options)
        }];

        const response = await this.provider.chat(
          messages,
          this.getCommitSystemPrompt(options.conventional !== false),
          this.config.get('defaultModel') || 'gpt-4',
          { temperature: 0.3 }
        );

        commitMsg = this.parseCommitMessage(response);
        
        spinner.stop();
        console.log('');
        console.log(chalk.bold.cyan('  📝 Suggested commit message:'));
        console.log(chalk.gray('  ' + '─'.repeat(40)));
        console.log(chalk.white(`  ${commitMsg}`));
        console.log('');

        // Show files being committed
        const fileList = files.trim().split('\n').filter(Boolean);
        console.log(chalk.gray(`  Files (${fileList.length}):`));
        for (const f of fileList.slice(0, 10)) {
          console.log(chalk.gray(`    ${f}`));
        }
        if (fileList.length > 10) {
          console.log(chalk.gray(`    ... and ${fileList.length - 10} more`));
        }
        console.log('');

        // Confirm
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: 'Commit with this message?',
          default: true,
        }]);

        if (!confirmed) {
          const { editMsg } = await inquirer.prompt([{
            type: 'input',
            name: 'editMsg',
            message: 'Enter commit message:',
            default: commitMsg,
          }]);
          commitMsg = editMsg;
        }
      }

      // Execute commit
      spinner.start('Committing...');
      
      const cmd = options.amend
        ? `git commit --amend -m "${commitMsg}"`
        : `git commit -m "${commitMsg}"`;
      
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
      
      spinner.succeed('Committed successfully');
      console.log(chalk.gray(`\n  ${output.trim()}\n`));

      if (isJsonMode()) {
        jsonSuccess({
          message: commitMsg,
          files: files.trim().split('\n').filter(Boolean),
          amended: options.amend || false,
        });
      }
    } catch (error: any) {
      spinner.fail(`Commit failed: ${error.message}`);
    }
  }

  private buildCommitPrompt(diff: string, files: string, options: CommitOptions): string {
    const fileList = files.trim().split('\n').filter(Boolean);
    const scopeHint = options.scope ? `\nScope: ${options.scope}` : '';
    
    return `Analyze this git diff and generate a concise commit message.

Files changed (${fileList.length}):
${fileList.map(f => `  ${f}`).join('\n')}

Diff:
\`\`\`diff
${diff.substring(0, 8000)}${diff.length > 8000 ? '\n... (truncated)' : ''}
\`\`\`
${scopeHint}

Generate a commit message that:
1. Summarizes what changed and why
2. Uses conventional commit format: type(scope): description
3. Is one line (no body needed for simple changes)
4. Uses imperative mood ("add", "fix", "update", not "added", "fixed")
5. Keeps subject under 72 characters

Types: feat, fix, refactor, perf, test, docs, style, ci, chore

Return ONLY the commit message, nothing else.`;
  }

  private getCommitSystemPrompt(conventional: boolean): string {
    return `You are an expert at writing git commit messages for the Idexal IDE project.

${conventional ? 'Use Conventional Commits format: type(scope): description' : 'Write clear, concise commit messages.'}

Rules:
- Subject line under 72 characters
- Imperative mood ("add" not "added")
- No period at end
- Focus on the "why", not just the "what"
- Reference issue numbers if visible in the diff
- For breaking changes, add BREAKING CHANGE: footer`;
  }

  private parseCommitMessage(response: string): string {
    // Clean up the response
    let msg = response.trim();
    
    // Remove markdown code blocks
    msg = msg.replace(/^```[\s\S]*?\n/gm, '').replace(/```$/gm, '');
    
    // Take first meaningful line
    const lines = msg.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    return lines[0]?.trim() || msg.split('\n')[0]?.trim() || 'chore: update';
  }
}
