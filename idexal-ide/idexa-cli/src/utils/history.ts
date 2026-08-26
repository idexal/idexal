import fs from 'fs-extra';
import path from 'path';
import os from 'os';

interface HistoryItem {
  command: string;
  timestamp: Date;
}

export class HistoryManager {
  private historyPath: string;
  private maxItems: number;

  constructor(maxItems: number = 100) {
    this.historyPath = path.join(os.homedir(), '.idexa', 'history.json');
    this.maxItems = maxItems;
  }

  add(command: string): void {
    const history = this.getAll();
    history.push(command);
    
    if (history.length > this.maxItems) {
      history.splice(0, history.length - this.maxItems);
    }
    
    this.save(history);
  }

  getAll(): string[] {
    try {
      if (fs.existsSync(this.historyPath)) {
        return fs.readJSONSync(this.historyPath);
      }
    } catch {}
    return [];
  }

  getRecent(count: number): string[] {
    return this.getAll().slice(-count);
  }

  clear(): void {
    this.save([]);
  }

  private save(history: string[]): void {
    const dir = path.dirname(this.historyPath);
    fs.ensureDirSync(dir);
    fs.writeJSONSync(this.historyPath, history);
  }
}
