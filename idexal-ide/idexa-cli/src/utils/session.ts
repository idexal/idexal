import fs from 'fs';
import path from 'path';
import { ChatMessage } from '../ai/provider';

interface Session {
  id: string;
  name: string;
  messages: ChatMessage[];
  model: string;
  project: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

const SESSIONS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.idexa',
  'sessions'
);

export class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = SESSIONS_DIR;
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  private getSessionPath(id: string): string {
    return path.join(this.sessionsDir, `${id}.json`);
  }

  create(model: string, project: string): Session {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const session: Session = {
      id,
      name: `Session ${new Date().toLocaleString()}`,
      messages: [],
      model,
      project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };
    this.save(session);
    return session;
  }

  save(session: Session): void {
    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.getSessionPath(session.id), JSON.stringify(session, null, 2));
  }

  load(id: string): Session | null {
    const filePath = this.getSessionPath(id);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  list(): Session[] {
    this.ensureDir();
    const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
    const sessions: Session[] = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8');
        sessions.push(JSON.parse(content));
      } catch { /* skip corrupted */ }
    }
    
    return sessions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  delete(id: string): boolean {
    const filePath = this.getSessionPath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.load(sessionId);
    if (session) {
      session.messages.push(message);
      this.save(session);
    }
  }

  clearMessages(sessionId: string): void {
    const session = this.load(sessionId);
    if (session) {
      session.messages = [];
      this.save(session);
    }
  }

  rename(sessionId: string, name: string): void {
    const session = this.load(sessionId);
    if (session) {
      session.name = name;
      this.save(session);
    }
  }

  search(query: string): Session[] {
    return this.list().filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.project.toLowerCase().includes(query.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
    );
  }

  getRecent(count: number = 5): Session[] {
    return this.list().slice(0, count);
  }
}

export const sessionManager = new SessionManager();
