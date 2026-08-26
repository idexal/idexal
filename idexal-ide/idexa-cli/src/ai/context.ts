import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { ConfigManager } from '../config/manager';
import { ProjectInfo, detectProject } from '../utils/project';

export class ContextManager {
  private files: Set<string> = new Set();
  private projectInfo: ProjectInfo | null = null;
  private config: ConfigManager;

  constructor(config: ConfigManager) {
    this.config = config;
  }

  async initialize(project?: ProjectInfo | null): Promise<void> {
    if (project) {
      this.projectInfo = project;
      await this.autoDetectFiles(project);
    }
  }

  private async autoDetectFiles(project: ProjectInfo): Promise<void> {
    const includePatterns = this.config.get('context.include') || ['src/**'];
    const excludePatterns = this.config.get('context.exclude') || ['node_modules/**'];

    for (const pattern of includePatterns) {
      const files = await glob(pattern, {
        cwd: project.rootPath,
        ignore: excludePatterns,
        absolute: true
      });
      files.forEach(f => this.files.add(f));
    }
  }

  async addFiles(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const files = await glob(pattern, { absolute: true });
      files.forEach(f => this.files.add(f));
    }
  }

  async removeFiles(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const files = await glob(pattern, { absolute: true });
      files.forEach(f => this.files.delete(f));
    }
  }

  getFiles(): string[] {
    return Array.from(this.files);
  }

  getProjectContext(): string {
    if (!this.projectInfo) return '';

    let context = `Project: ${this.projectInfo.name}\n`;
    context += `Type: ${this.projectInfo.type}\n`;
    context += `Root: ${this.projectInfo.rootPath}\n`;
    
    if (this.projectInfo.languages.length > 0) {
      context += `Languages: ${this.projectInfo.languages.join(', ')}\n`;
    }
    
    if (this.projectInfo.dependencies.length > 0) {
      context += `Dependencies: ${this.projectInfo.dependencies.slice(0, 20).join(', ')}\n`;
    }

    return context;
  }

  async getFileContents(maxTokens: number = 50000): Promise<string> {
    let content = '';
    let tokenCount = 0;

    for (const file of Array.from(this.files).slice(0, 50)) {
      try {
        const fileContent = await fs.readFile(file, 'utf-8');
        const truncated = fileContent.substring(0, 2000);
        content += `\n--- ${path.basename(file)} ---\n${truncated}\n`;
        tokenCount += truncated.length / 4;
        
        if (tokenCount >= maxTokens) break;
      } catch {}
    }

    return content;
  }

  async smartDetect(projectRoot: string): Promise<void> {
    const importantFiles = [
      'package.json',
      'tsconfig.json',
      'README.md',
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'src/App.tsx',
      'src/App.ts'
    ];

    for (const file of importantFiles) {
      const fullPath = path.join(projectRoot, file);
      if (await fs.pathExists(fullPath)) {
        this.files.add(fullPath);
      }
    }
  }
}
