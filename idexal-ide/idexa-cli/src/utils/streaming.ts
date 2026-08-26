import chalk from 'chalk';

export class StreamingRenderer {
  private buffer: string = '';
  private isStreaming: boolean = false;

  start(): void {
    this.isStreaming = true;
    this.buffer = '';
    process.stdout.write(chalk.cyan('\nIdexa: '));
  }

  write(chunk: string): void {
    if (!this.isStreaming) {
      this.start();
    }
    this.buffer += chunk;
    process.stdout.write(chunk);
  }

  end(): string {
    this.isStreaming = false;
    console.log('\n');
    return this.buffer;
  }

  clear(): void {
    this.buffer = '';
    this.isStreaming = false;
  }
}
