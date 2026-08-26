import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface ReviewOptions {
  file?: string;
  staged?: boolean;
  diff?: boolean;
  severity?: 'all' | 'critical' | 'major';
  fix?: boolean;
}

interface ReviewFinding {
  file: string;
  line?: number;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  message: string;
  suggestion?: string;
}

export class ReviewCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(target?: string, options: ReviewOptions = {}): Promise<void> {
    const project = await detectProject();
    const spinner = ora('Analyzing code...').start();

    try {
      let codeToReview: string;
      let context = '';

      if (options.staged) {
        // Review staged changes
        spinner.text = 'Reading staged changes...';
        try {
          codeToReview = execSync('git diff --cached', { encoding: 'utf-8', timeout: 10000 });
          if (!codeToReview.trim()) {
            spinner.warn('No staged changes to review');
            return;
          }
          context = 'Reviewing staged git changes (git diff --cached)';
        } catch {
          spinner.fail('Failed to read staged changes');
          return;
        }
      } else if (options.diff) {
        // Review uncommitted diff
        spinner.text = 'Reading uncommitted changes...';
        try {
          codeToReview = execSync('git diff', { encoding: 'utf-8', timeout: 10000 });
          if (!codeToReview.trim()) {
            spinner.warn('No uncommitted changes to review');
            return;
          }
          context = 'Reviewing uncommitted changes (git diff)';
        } catch {
          spinner.fail('Failed to read diff');
          return;
        }
      } else if (target && fs.existsSync(target)) {
        // Review specific file or directory
        const stat = fs.statSync(target);
        if (stat.isFile()) {
          spinner.text = `Reviewing ${path.basename(target)}...`;
          codeToReview = fs.readFileSync(target, 'utf-8');
          context = `Reviewing file: ${target}`;
        } else {
          spinner.text = `Reviewing directory ${path.basename(target)}...`;
          codeToReview = this.readDirectory(target);
          context = `Reviewing directory: ${target}`;
        }
      } else if (project) {
        // Auto-detect: review recent changes
        spinner.text = 'Detecting recent changes...';
        try {
          codeToReview = execSync('git diff HEAD~1 --name-only', { encoding: 'utf-8', timeout: 5000 });
          const files = codeToReview.trim().split('\n').filter(Boolean);
          if (files.length === 0) {
            spinner.warn('No recent changes to review');
            return;
          }
          codeToReview = '';
          for (const file of files.slice(0, 10)) {
            if (fs.existsSync(file)) {
              const content = fs.readFileSync(file, 'utf-8');
              codeToReview += `\n// File: ${file}\n${content}\n`;
            }
          }
          context = `Reviewing ${files.length} recently changed files`;
        } catch {
          spinner.warn('No git history to review');
          return;
        }
      } else {
        spinner.fail('No code to review. Specify a file, use --staged, or --diff');
        return;
      }

      spinner.text = 'AI reviewing code...';

      const messages: ChatMessage[] = [{
        role: 'user',
        content: this.buildReviewPrompt(codeToReview, context, options)
      }];

      const response = await this.provider.chat(
        messages,
        this.getReviewSystemPrompt(options.severity || 'all'),
        this.config.get('defaultModel') || 'gpt-4',
        { temperature: 0.3 }
      );

      spinner.succeed('Review complete');

      // Parse and display structured results
      const findings = this.parseFindings(response);
      this.displayReview(findings, response);

      if (isJsonMode()) {
        jsonSuccess({
          findings,
          totalFindings: findings.length,
          critical: findings.filter(f => f.severity === 'critical').length,
          major: findings.filter(f => f.severity === 'major').length,
          minor: findings.filter(f => f.severity === 'minor').length,
          raw: response,
        });
      }

      // Auto-fix if requested
      if (options.fix && findings.some(f => f.suggestion)) {
        await this.applyFixes(findings);
      }
    } catch (error: any) {
      spinner.fail(`Review failed: ${error.message}`);
    }
  }

  private buildReviewPrompt(code: string, context: string, options: ReviewOptions): string {
    let prompt = `${context}\n\nCode to review:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    prompt += `Provide a structured code review. For each finding, use this exact format:\n`;
    prompt += `[SEVERITY] CATEGORY: File:line — Description\n`;
    prompt += `  → Suggestion: How to fix\n\n`;
    prompt += `Severity levels: CRITICAL (security/crash/data loss), MAJOR (bugs/performance), MINOR (style/smell), INFO (suggestion)\n`;
    prompt += `Categories: Security, Bug, Performance, Style, Architecture, Testing, Documentation\n\n`;
    prompt += `Focus on actionable feedback. Don't repeat obvious issues.`;
    return prompt;
  }

  private getReviewSystemPrompt(severity: string): string {
    const severityFilter = severity === 'critical'
      ? 'Only report CRITICAL severity issues (security vulnerabilities, crash risks, data loss).'
      : severity === 'major'
      ? 'Report CRITICAL and MAJOR severity issues.'
      : 'Report all severity levels.';

    return `You are an expert code reviewer for the Idexal IDE. You perform thorough, actionable code reviews.

${severityFilter}

Review criteria:
- Security vulnerabilities (injection, XSS, auth bypass, secrets)
- Bug risks (null checks, race conditions, error handling)
- Performance issues (N+1 queries, unnecessary re-renders, memory leaks)
- Code quality (naming, complexity, duplication)
- Architecture (coupling, separation of concerns)
- Testing gaps (missing edge cases, untested paths)
- Documentation needs

Be concise and specific. Reference exact line numbers when possible.
Always provide a fix suggestion for each finding.`;
  }

  private parseFindings(response: string): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const match = line.match(/\[(CRITICAL|MAJOR|MINOR|INFO)\]\s+(\w+):\s+(.+?)(?:\s+—\s+(.+))?$/i);
      if (match) {
        const [, severity, category, description, detail] = match;
        findings.push({
          file: 'review',
          severity: severity.toLowerCase() as ReviewFinding['severity'],
          category,
          message: `${description}${detail ? ` — ${detail}` : ''}`,
          suggestion: undefined,
        });
      }
    }

    return findings;
  }

  private displayReview(findings: ReviewFinding[], raw: string): void {
    console.log('');
    
    if (findings.length === 0) {
      console.log(chalk.green('  ✅ No issues found — code looks good!'));
      console.log('');
      return;
    }

    // Summary
    const critical = findings.filter(f => f.severity === 'critical').length;
    const major = findings.filter(f => f.severity === 'major').length;
    const minor = findings.filter(f => f.severity === 'minor').length;
    const info = findings.filter(f => f.severity === 'info').length;

    console.log(chalk.bold('  📋 Review Summary'));
    console.log('  ' + '─'.repeat(40));
    if (critical) console.log(chalk.red(`  🔴 Critical: ${critical}`));
    if (major) console.log(chalk.yellow(`  🟡 Major:    ${major}`));
    if (minor) console.log(chalk.gray(`  🔵 Minor:    ${minor}`));
    if (info) console.log(chalk.gray(`  ⚪ Info:     ${info}`));
    console.log('');

    // Full response
    console.log(chalk.bold('  Detailed Review:'));
    console.log('  ' + '─'.repeat(40));
    console.log(raw);
    console.log('');
  }

  private readDirectory(dirPath: string): string {
    let content = '';
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        content += this.readDirectory(fullPath);
      } else if (entry.isFile() && this.isReviewableFile(entry.name)) {
        try {
          const fileContent = fs.readFileSync(fullPath, 'utf-8');
          content += `\n// File: ${path.relative(process.cwd(), fullPath)}\n${fileContent}\n`;
        } catch { /* skip binary files */ }
      }
    }
    
    return content;
  }

  private isReviewableFile(name: string): boolean {
    const reviewable = ['.ts', '.tsx', '.js', '.jsx', '.rs', '.py', '.go', '.java', '.rb', '.php'];
    return reviewable.some(ext => name.endsWith(ext));
  }

  private async applyFixes(findings: ReviewFinding[]): Promise<void> {
    console.log(chalk.cyan('\n  🔧 Auto-fix suggestions available for:'));
    for (const f of findings.filter(f => f.suggestion)) {
      console.log(chalk.gray(`    • ${f.category}: ${f.message}`));
    }
    console.log(chalk.gray('\n  Run with --fix to apply suggestions\n'));
  }
}
