import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface FixOptions {
  file?: string;
  lint?: boolean;
  type?: boolean;
  test?: boolean;
  all?: boolean;
  dry?: boolean;
  explain?: boolean;
}

export class FixCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(target?: string, options: FixOptions = {}): Promise<void> {
    const project = await detectProject();
    const spinner = ora('Detecting issues...').start();

    try {
      // Collect errors from multiple sources
      const errors: string[] = [];

      // TypeScript errors
      if (options.type || options.all) {
        spinner.text = 'Running TypeScript type check...';
        const tsErrors = this.getTypeErrors();
        if (tsErrors) errors.push(tsErrors);
      }

      // Lint errors
      if (options.lint || options.all) {
        spinner.text = 'Running linter...';
        const lintErrors = this.getLintErrors(target);
        if (lintErrors) errors.push(lintErrors);
      }

      // Test failures
      if (options.test || options.all) {
        spinner.text = 'Running tests...';
        const testErrors = this.getTestErrors();
        if (testErrors) errors.push(testErrors);
      }

      // If no specific source, try to detect
      if (errors.length === 0 && !options.type && !options.lint && !options.test) {
        // Try TypeScript first
        spinner.text = 'Checking for type errors...';
        const tsErrors = this.getTypeErrors();
        if (tsErrors) errors.push(tsErrors);

        // Try lint
        spinner.text = 'Checking for lint errors...';
        const lintErrors = this.getLintErrors(target);
        if (lintErrors) errors.push(lintErrors);

        // Try tests
        spinner.text = 'Checking for test failures...';
        const testErrors = this.getTestErrors();
        if (testErrors) errors.push(testErrors);
      }

      if (errors.length === 0) {
        spinner.succeed('No issues found — code looks clean! ✨');
        return;
      }

      spinner.text = `AI fixing ${errors.length} issue source(s)...`;

      const errorContext = errors.join('\n\n---\n\n');
      const fileContent = target && fs.existsSync(target) 
        ? fs.readFileSync(target, 'utf-8') 
        : undefined;

      const messages: ChatMessage[] = [{
        role: 'user',
        content: this.buildFixPrompt(errorContext, target, fileContent, options)
      }];

      const response = await this.provider.chat(
        messages,
        this.getFixSystemPrompt(),
        this.config.get('defaultModel') || 'gpt-4',
        { temperature: 0.2 }
      );

      spinner.succeed('Fixes generated');

      // Parse and apply fixes
      const fixes = this.parseFixes(response);
      this.displayFixes(fixes, response, options);

      if (isJsonMode()) {
        jsonSuccess({
          issueCount: errors.length,
          fixes: fixes.map(f => ({ file: f.file, description: f.description })),
          totalFixes: fixes.length,
        });
      }

      // Apply fixes unless dry run
      if (!options.dry && fixes.length > 0) {
        await this.applyFixes(fixes, options.explain);
      }
    } catch (error: any) {
      spinner.fail(`Fix failed: ${error.message}`);
    }
  }

  private buildFixPrompt(errors: string, file?: string, content?: string, options?: FixOptions): string {
    let prompt = `Issues found:\n\`\`\`\n${errors}\n\`\`\`\n\n`;
    
    if (file && content) {
      prompt += `File: ${file}\n\`\`\`\n${content}\n\`\`\`\n\n`;
    }

    prompt += `For each issue, provide the fix using this exact format:\n\n`;
    prompt += `=== FIX START ===\n`;
    prompt += `FILE: <file-path>\n`;
    prompt += `DESCRIPTION: <what was wrong and what the fix does>\n`;
    prompt += `OLD_TEXT: <exact text to find>\n`;
    prompt += `NEW_TEXT: <replacement text>\n`;
    prompt += `=== FIX END ===\n\n`;
    prompt += `Rules:\n`;
    prompt += `- OLD_TEXT must be an exact match from the original code\n`;
    prompt += `- Make minimal, targeted changes\n`;
    prompt += `- Don't change behavior unless fixing a bug\n`;
    prompt += `- Preserve formatting and style\n`;
    prompt += `- If the fix is unclear, explain why in DESCRIPTION`;

    return prompt;
  }

  private getFixSystemPrompt(): string {
    return `You are an expert developer fixing code issues for the Idexal IDE.
You receive lint errors, type errors, or test failures and provide precise fixes.

Rules:
- Fix the root cause, not symptoms
- Make minimal changes — don't refactor unrelated code
- Preserve existing code style
- Add necessary imports if missing
- Don't suppress errors with type assertions or ignore comments
- If a fix requires understanding business logic, explain why rather than guessing`;
  }

  private parseFixes(response: string): Array<{ file: string; description: string; oldText: string; newText: string }> {
    const fixes: Array<{ file: string; description: string; oldText: string; newText: string }> = [];
    const blocks = response.split('=== FIX START ===');

    for (const block of blocks.slice(1)) {
      const endIdx = block.indexOf('=== FIX END ===');
      const content = endIdx > -1 ? block.substring(0, endIdx) : block;

      const fileMatch = content.match(/FILE:\s*(.+)/);
      const descMatch = content.match(/DESCRIPTION:\s*(.+)/);
      const oldMatch = content.match(/OLD_TEXT:\s*\n([\s\S]*?)(?=NEW_TEXT:)/);
      const newMatch = content.match(/NEW_TEXT:\s*\n([\s\S]*?)(?==== FIX END|$)/);

      if (fileMatch && oldMatch && newMatch) {
        fixes.push({
          file: fileMatch[1].trim(),
          description: descMatch?.[1]?.trim() || 'Fix applied',
          oldText: oldMatch[1].trim(),
          newText: newMatch[1].trim(),
        });
      }
    }

    return fixes;
  }

  private displayFixes(fixes: Array<{ file: string; description: string }>, raw: string, options: FixOptions): void {
    console.log('');
    
    if (fixes.length === 0) {
      console.log(chalk.yellow('  ⚠ No parseable fixes found. Raw AI response:'));
      console.log(raw);
      return;
    }

    console.log(chalk.bold('  🔧 Generated Fixes'));
    console.log('  ' + '─'.repeat(40));
    
    for (const fix of fixes) {
      console.log(chalk.green(`  ✓ ${fix.file}`));
      console.log(chalk.gray(`    ${fix.description}`));
    }
    
    console.log('');

    if (options.dry) {
      console.log(chalk.yellow('  Dry run — no changes applied. Remove --dry to apply.'));
    }
  }

  private async applyFixes(fixes: Array<{ file: string; description: string; oldText: string; newText: string }>, explain?: boolean): Promise<void> {
    let applied = 0;
    let failed = 0;

    for (const fix of fixes) {
      try {
        if (!fs.existsSync(fix.file)) {
          console.log(chalk.yellow(`  ⚠ File not found: ${fix.file}`));
          failed++;
          continue;
        }

        const content = fs.readFileSync(fix.file, 'utf-8');
        if (!content.includes(fix.oldText)) {
          console.log(chalk.yellow(`  ⚠ Text not found in ${fix.file}: "${fix.oldText.substring(0, 50)}..."`));
          failed++;
          continue;
        }

        const updated = content.replace(fix.oldText, fix.newText);
        fs.writeFileSync(fix.file, updated, 'utf-8');
        console.log(chalk.green(`  ✓ Fixed ${fix.file}`));
        applied++;

        if (explain) {
          console.log(chalk.gray(`    ${fix.description}`));
        }
      } catch (err: any) {
        console.log(chalk.red(`  ✗ Failed to fix ${fix.file}: ${err.message}`));
        failed++;
      }
    }

    console.log('');
    console.log(chalk.bold(`  Summary: ${applied} applied, ${failed} failed`));
  }

  private getTypeErrors(): string | null {
    try {
      execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8', timeout: 30000 });
      return null; // No errors
    } catch (err: any) {
      const output = err.stdout || err.stderr || '';
      if (output.includes('error TS')) {
        return `TypeScript errors:\n${output}`;
      }
      return null;
    }
  }

  private getLintErrors(file?: string): string | null {
    const lintCmd = file ? `npx eslint ${file} 2>&1` : 'npx eslint src/ 2>&1';
    try {
      execSync(lintCmd, { encoding: 'utf-8', timeout: 30000 });
      return null;
    } catch (err: any) {
      const output = err.stdout || '';
      if (output.trim()) {
        return `Lint errors:\n${output}`;
      }
      return null;
    }
  }

  private getTestErrors(): string | null {
    try {
      const cmd = fs.existsSync('package.json') ? 'npm test 2>&1' : 'cargo test 2>&1';
      execSync(cmd, { encoding: 'utf-8', timeout: 60000 });
      return null;
    } catch (err: any) {
      const output = err.stdout || '';
      if (output.includes('FAIL') || output.includes('failed') || output.includes('Error')) {
        return `Test failures:\n${output.substring(0, 5000)}`;
      }
      return null;
    }
  }
}
