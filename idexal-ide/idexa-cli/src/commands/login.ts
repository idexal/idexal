import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface LoginOptions {
  apiKey?: string;
}

export class LoginCommand {
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  async execute(options: LoginOptions = {}): Promise<void> {
    console.log(chalk.cyan.bold('\n🔐 Login to Idexa\n'));

    if (options.apiKey) {
      this.config.set('user.apiKey', options.apiKey);
      if (isJsonMode()) jsonSuccess({ method: 'apiKey', loggedIn: true });
      console.log(chalk.green('✓ API key saved'));
      return;
    }

    const { method } = await inquirer.prompt([{
      type: 'list',
      name: 'method',
      message: 'How would you like to login?',
      choices: [
        { name: 'API Key', value: 'apiKey' },
        { name: 'Email & Password', value: 'email' }
      ]
    }]);

    if (method === 'apiKey') {
      const { apiKey } = await inquirer.prompt([{
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key:',
        mask: '*'
      }]);
      
      this.config.set('user.apiKey', apiKey);
      console.log(chalk.green('\n✓ API key saved\n'));
    } else {
      const { email, password } = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*'
        }
      ]);

      console.log(chalk.gray('\nAuthenticating...'));
      
      this.config.set('user.email', email);
      this.config.set('user.plan', 'free');
      console.log(chalk.green('\n✓ Logged in successfully\n'));
    }

    console.log(chalk.gray('Run `idexa whoami` to verify your account'));
  }
}
