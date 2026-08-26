import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { AIProvider, ChatMessage } from '../ai/provider';
import { ConfigManager } from '../config/manager';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface AnalysisResult {
  file: string;
  issues: Array<{
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  metrics: {
    complexity: number;
    lines: number;
    functions: number;
    classes: number;
  };
}

export class AnalyzeCommand {
  private provider: AIProvider;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.provider = new AIProvider(this.config);
  }

  async execute(targetPath: string = '.', options: { type?: string; fix?: boolean } = {}): Promise<void> {
    const spinner = ora('Analyzing code...').start();

    try {
      const project = await detectProject(targetPath);
      if (!project) {
        spinner.fail('No project found');
        return;
      }

      spinner.text = `Scanning ${project.type} project...`;

      const files = await this.getFiles(targetPath, project.type);
      const results: AnalysisResult[] = [];

      for (const file of files) {
        spinner.text = `Analyzing ${path.basename(file)}...`;
        const result = await this.analyzeFile(file, options.type || 'all');
        results.push(result);
      }

      spinner.succeed('Analysis complete');

      if (isJsonMode()) {
        jsonSuccess({
          files: results.length,
          totalIssues: results.reduce((s, r) => s + r.issues.length, 0),
          errors: results.reduce((s, r) => s + r.issues.filter(i => i.severity === 'error').length, 0),
          warnings: results.reduce((s, r) => s + r.issues.filter(i => i.severity === 'warning').length, 0),
          results: results.map(r => ({
            file: r.file,
            issues: r.issues,
            metrics: r.metrics,
          })),
        });
      }

      this.printResults(results);

      if (options.fix) {
        await this.fixIssues(results);
      }
    } catch (error: any) {
      spinner.fail(`Analysis failed: ${error.message}`);
    }
  }

  private async getFiles(targetPath: string, projectType: string): Promise<string[]> {
    const patterns: Record<string, string[]> = {
      javascript: ['**/*.{js,jsx,ts,tsx}'],
      typescript: ['**/*.{ts,tsx}'],
      python: ['**/*.py'],
      rust: ['**/*.rs'],
      go: ['**/*.go'],
      java: ['**/*.java']
    };

    const ignorePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.min.js'
    ];

    const filePatterns = patterns[projectType] || patterns.javascript;
    const files: string[] = [];

    for (const pattern of filePatterns) {
      const matched = await glob(pattern, {
        cwd: targetPath,
        ignore: ignorePatterns,
        absolute: true
      });
      files.push(...matched);
    }

    return files;
  }

  private async analyzeFile(filePath: string, type: string): Promise<AnalysisResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const messages: ChatMessage[] = [{
      role: 'user',
      content: `Analyze this code for ${type} issues. Return JSON with issues array and metrics.

Code:
\`\`\`
${content}
\`\`\`

Response format:
{
  "issues": [
    {
      "line": number,
      "column": number,
      "severity": "error" | "warning" | "info",
      "message": "string",
      "suggestion": "string (optional)"
    }
  ],
  "metrics": {
    "complexity": number,
    "lines": number,
    "functions": number,
    "classes": number
  }
}`
    }];

    try {
      const response = await this.provider.chat(
        messages,
        'You are a code analysis expert. Return only valid JSON.',
        this.config.get('defaultModel') || 'gpt-4',
        { temperature: 0.3 }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          file: filePath,
          ...JSON.parse(jsonMatch[0])
        };
      }
    } catch {}

    return {
      file: filePath,
      issues: [],
      metrics: {
        complexity: this.calculateComplexity(content),
        lines: lines.length,
        functions: (content.match(/function\s+\w+/g) || []).length,
        classes: (content.match(/class\s+\w+/g) || []).length
      }
    };
  }

  private calculateComplexity(content: string): number {
    let complexity = 1;
    const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'];
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b|\\${keyword}`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  private printResults(results: AnalysisResult[]): void {
    console.log(chalk.cyan.bold('\n📊 Analysis Results\n'));

    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const errors = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0);
    const warnings = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0);

    console.log(chalk.gray(`Files analyzed: ${results.length}`));
    console.log(chalk.gray(`Total issues: ${totalIssues}`));
    console.log(chalk.red(`Errors: ${errors}`));
    console.log(chalk.yellow(`Warnings: ${warnings}`));
    console.log();

    for (const result of results) {
      if (result.issues.length === 0) continue;

      console.log(chalk.white.bold(`📄 ${path.relative(process.cwd(), result.file)}`));

      for (const issue of result.issues) {
        const severityColor = issue.severity === 'error' ? chalk.red : 
                             issue.severity === 'warning' ? chalk.yellow : chalk.gray;
        
        console.log(`  ${severityColor(issue.severity.toUpperCase())} Line ${issue.line}:${issue.column}`);
        console.log(`    ${issue.message}`);
        if (issue.suggestion) {
          console.log(chalk.green(`    💡 ${issue.suggestion}`));
        }
      }
      console.log();
    }
  }

  private async fixIssues(results: AnalysisResult[]): Promise<void> {
    console.log(chalk.cyan('\n🔧 Attempting to fix issues...\n'));

    for (const result of results) {
      const fixableIssues = result.issues.filter(i => i.suggestion);
      if (fixableIssues.length === 0) continue;

      console.log(chalk.white(`Fixing ${path.basename(result.file)}...`));

      let content = await fs.readFile(result.file, 'utf-8');
      const lines = content.split('\n');

      for (const issue of fixableIssues.reverse()) {
        if (issue.suggestion && issue.line <= lines.length) {
          lines[issue.line - 1] = issue.suggestion;
        }
      }

      await fs.writeFile(result.file, lines.join('\n'));
      console.log(chalk.green(`  ✓ Fixed ${fixableIssues.length} issues`));
    }
  }
}
