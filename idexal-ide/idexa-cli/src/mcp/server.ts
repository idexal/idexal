import { createServer, Server, Socket } from 'net';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: Record<string, any>) => Promise<string>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType: string;
  handler: () => Promise<string>;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
  handler: (args: Record<string, string>) => Promise<string>;
}

export class McpServer {
  private tools: McpTool[] = [];
  private resources: McpResource[] = [];
  private prompts: McpPrompt[] = [];
  private server: Server | null = null;
  private name: string;
  private version: string;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  // ── Registration ──────────────────────────────────────────

  registerTool(tool: McpTool): this {
    this.tools.push(tool);
    return this;
  }

  registerResource(resource: McpResource): this {
    this.resources.push(resource);
    return this;
  }

  registerPrompt(prompt: McpPrompt): this {
    this.prompts.push(prompt);
    return this;
  }

  // ── Stdio transport (for Claude Desktop integration) ──────

  async startStdio(): Promise<void> {
    process.stdin.setEncoding('utf-8');

    let buffer = '';
    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      // MCP uses JSON-RPC with Content-Length headers
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('Content-Length: ')) {
          const contentLength = parseInt(line.slice(16));
          // Read the blank line separator
          // Then read contentLength bytes
          let body = '';
          while (body.length < contentLength) {
            const more = buffer.slice(0, contentLength - body.length);
            body += more;
            buffer = buffer.slice(more.length);
          }
          try {
            const message = JSON.parse(body);
            const response = await this.handleMessage(message);
            if (response) {
              const responseStr = JSON.stringify(response);
              const header = `Content-Length: ${Buffer.byteLength(responseStr)}\r\n\r\n`;
              process.stdout.write(header + responseStr);
            }
          } catch (err: any) {
            process.stderr.write(`MCP error: ${err.message}\n`);
          }
        }
      }
    });

    // Also handle simple newline-delimited JSON (alternative transport)
    process.stdin.on('data', async (chunk: string) => {
      // This is a fallback for simpler transports
    });

    process.stderr.write(`MCP server "${this.name}" v${this.version} started on stdio\n`);
  }

  // ── TCP transport ─────────────────────────────────────────

  async startTcp(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((socket: Socket) => {
        let buffer = '';
        socket.on('data', async (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('Content-Length: ')) {
              const contentLength = parseInt(line.slice(16));
              let body = '';
              while (body.length < contentLength) {
                const more = buffer.slice(0, contentLength - body.length);
                body += more;
                buffer = buffer.slice(more.length);
              }
              try {
                const message = JSON.parse(body);
                const response = await this.handleMessage(message);
                if (response) {
                  const responseStr = JSON.stringify(response);
                  const header = `Content-Length: ${Buffer.byteLength(responseStr)}\r\n\r\n`;
                  socket.write(header + responseStr);
                }
              } catch (err: any) {
                process.stderr.write(`MCP error: ${err.message}\n`);
              }
            }
          }
        });
      });

      this.server.listen(port, () => {
        process.stderr.write(`MCP server "${this.name}" listening on port ${port}\n`);
        resolve();
      });
    });
  }

  // ── JSON-RPC message handler ──────────────────────────────

  private async handleMessage(message: any): Promise<any> {
    const { id, method, params } = message;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: { name: this.name, version: this.version },
          },
        };

      case 'notifications/initialized':
        return null; // No response needed for notifications

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.tools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          },
        };

      case 'tools/call': {
        const tool = this.tools.find((t) => t.name === params?.name);
        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool not found: ${params?.name}` },
          };
        }
        try {
          const result = await tool.handler(params?.arguments || {});
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: result }],
            },
          };
        } catch (err: any) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Error: ${err.message}` }],
              isError: true,
            },
          };
        }
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: this.resources.map((r) => ({
              uri: r.uri,
              name: r.name,
              mimeType: r.mimeType,
            })),
          },
        };

      case 'resources/read': {
        const resource = this.resources.find((r) => r.uri === params?.uri);
        if (!resource) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Resource not found: ${params?.uri}` },
          };
        }
        const contents = await resource.handler();
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: contents }],
          },
        };
      }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: this.prompts.map((p) => ({
              name: p.name,
              description: p.description,
              arguments: p.arguments,
            })),
          },
        };

      case 'prompts/get': {
        const prompt = this.prompts.find((p) => p.name === params?.name);
        if (!prompt) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Prompt not found: ${params?.name}` },
          };
        }
        const text = await prompt.handler(params?.arguments || {});
        return {
          jsonrpc: '2.0',
          id,
          result: {
            description: prompt.description,
            messages: [{ role: 'user', content: { type: 'text', text } }],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown method: ${method}` },
        };
    }
  }

  stop(): void {
    this.server?.close();
  }
}

// ── Built-in tools for the Idexa MCP server ─────────────────

export function createIdexaMcpServer(): McpServer {
  const server = new McpServer('idexa-cli', '1.0.0');

  // Tool: read file
  server.registerTool({
    name: 'read_file',
    description: 'Read the contents of a file on disk.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute file path' },
      },
      required: ['path'],
    },
    handler: async (args) => fs.readFileSync(args.path, 'utf-8'),
  });

  // Tool: list files
  server.registerTool({
    name: 'list_files',
    description: 'List files and directories at a given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
      },
      required: ['path'],
    },
    handler: async (args) => {
      const entries = fs.readdirSync(args.path, { withFileTypes: true });
      return entries.map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
    },
  });

  // Tool: search code
  server.registerTool({
    name: 'search_code',
    description: 'Search for a pattern across files using ripgrep.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search regex pattern' },
        path: { type: 'string', description: 'Directory to search in' },
      },
      required: ['pattern'],
    },
    handler: async (args) => {
      try {
        let cmd = `rg -n "${args.pattern}"`;
        if (args.path) cmd += ` ${args.path}`;
        return execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
      } catch (err: any) {
        return err.stdout || '(no matches)';
      }
    },
  });

  // Tool: git status
  server.registerTool({
    name: 'git_status',
    description: 'Get the current git status of the repository.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Repository root' },
      },
      required: [],
    },
    handler: async (args) => {
      try {
        const status = execSync('git status --short', { encoding: 'utf-8', cwd: args.cwd || process.cwd() });
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: args.cwd || process.cwd() });
        return `Branch: ${branch.trim()}\n\n${status || '(clean)'}`;
      } catch (err: any) {
        return `Error: ${err.message}`;
      }
    },
  });

  // Tool: run command
  server.registerTool({
    name: 'run_command',
    description: 'Execute a shell command and return output.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command' },
        cwd: { type: 'string', description: 'Working directory' },
      },
      required: ['command'],
    },
    handler: async (args) => {
      try {
        return execSync(args.command, {
          encoding: 'utf-8',
          cwd: args.cwd || process.cwd(),
          timeout: 30000,
        });
      } catch (err: any) {
        return err.stdout || err.message;
      }
    },
  });

  // Resource: project info
  server.registerResource({
    uri: 'idexa://project/info',
    name: 'Project Info',
    mimeType: 'application/json',
    handler: async () => {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        return fs.readFileSync(pkgPath, 'utf-8');
      }
      return '{"error": "No package.json found"}';
    },
  });

  // Prompt: code review
  server.registerPrompt({
    name: 'review-code',
    description: 'Generate a code review prompt for the given file',
    arguments: [
      { name: 'path', description: 'File path to review', required: true },
    ],
    handler: async (args) => {
      const content = fs.readFileSync(args.path, 'utf-8');
      return `Please review the following code from ${args.path}:\n\n\`\`\`\n${content}\n\`\`\`\n\nFocus on: bugs, performance, security, readability, and best practices.`;
    },
  });

  return server;
}
