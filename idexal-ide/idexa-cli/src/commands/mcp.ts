import chalk from 'chalk';
import { createIdexaMcpServer } from '../mcp/server';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

export class McpCommand {
  async execute(options: { transport?: string; port?: string } = {}): Promise<void> {
    const transport = options.transport || 'stdio';
    const port = parseInt(options.port || '3000', 10);

    if (isJsonMode()) {
      jsonSuccess({
        command: 'mcp',
        transport,
        port: transport === 'tcp' ? port : undefined,
        status: 'starting',
      });
      return;
    }

    const server = createIdexaMcpServer();

    console.log(chalk.cyan.bold('\n╔══════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║    🔌 Idexa MCP Server              ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════╝\n'));

    console.log(chalk.gray(`Transport: ${transport}`));
    if (transport === 'tcp') {
      console.log(chalk.gray(`Port: ${port}`));
    }
    console.log(chalk.gray(`Tools: read_file, list_files, search_code, git_status, run_command`));
    console.log(chalk.gray(`Resources: project/info`));
    console.log(chalk.gray(`Prompts: review-code\n`));

    if (transport === 'stdio') {
      console.log(chalk.yellow('Connected via stdio. Waiting for MCP client...\n'));
      await server.startStdio();
    } else if (transport === 'tcp') {
      console.log(chalk.yellow(`Listening on TCP port ${port}...\n`));
      await server.startTcp(port);
    } else {
      console.error(chalk.red(`Unknown transport: ${transport}. Use 'stdio' or 'tcp'.`));
      process.exit(1);
    }
  }
}
