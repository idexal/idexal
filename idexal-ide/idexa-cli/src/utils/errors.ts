import chalk from 'chalk';

export function setupErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('\nUnexpected error:'), error.message);
    if (process.env.IDEXA_VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      console.error(chalk.red('\nUnhandled rejection:'), reason.message);
    }
  });
}

export class IdexaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'IdexaError';
  }
}

export class APIError extends IdexaError {
  constructor(message: string, public statusCode: number, details?: any) {
    super(message, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

export class ConfigError extends IdexaError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends IdexaError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export function handleError(error: unknown): void {
  if (error instanceof IdexaError) {
    console.error(chalk.red(`\n${error.code}: ${error.message}`));
    if (error.details && process.env.IDEXA_VERBOSE) {
      console.error(chalk.gray('Details:', error.details));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`\nError: ${error.message}`));
    if (process.env.IDEXA_VERBOSE) {
      console.error(error.stack);
    }
  } else {
    console.error(chalk.red('\nUnknown error occurred'));
  }
}
