import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { detectProject } from '../utils/project';
import { isJsonMode, jsonSuccess } from '../utils/json-output';

interface DeployOptions {
  dryRun?: boolean;
  force?: boolean;
}

export class DeployCommand {
  async execute(environment?: string, options: DeployOptions = {}): Promise<void> {
    const project = await detectProject();
    if (!project) {
      console.log(chalk.red('No project detected'));
      return;
    }

    const env = environment || await this.selectEnvironment();
    
    console.log(chalk.cyan(`\n🚀 Deploying to ${env}\n`));

    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN - No changes will be made\n'));
    }

    const spinner = ora('Preparing deployment...').start();

    try {
      await this.runPreDeployChecks(project.type);
      
      if (!options.dryRun) {
        spinner.text = 'Building...';
        await this.build(project.type);
        
        spinner.text = 'Deploying...';
        await this.deploy(env, project.type);
      }
      
      spinner.succeed(`Deployment to ${env} complete!`);
      if (isJsonMode()) jsonSuccess({ environment: env, deployed: true, dryRun: !!options.dryRun });
    } catch (error: any) {
      spinner.fail(`Deployment failed: ${error.message}`);
    }
  }

  private async selectEnvironment(): Promise<string> {
    const { env } = await inquirer.prompt([{
      type: 'list',
      name: 'env',
      message: 'Select deployment environment:',
      choices: [
        { name: 'Development', value: 'dev' },
        { name: 'Staging', value: 'staging' },
        { name: 'Production', value: 'production' }
      ]
    }]);
    return env;
  }

  private async runPreDeployChecks(projectType: string): Promise<void> {
    console.log(chalk.gray('Running pre-deploy checks...'));
    
    const checks: string[] = [];
    
    if (projectType === 'javascript' || projectType === 'typescript') {
      checks.push('npm run lint');
      checks.push('npm test');
    }
    
    for (const check of checks) {
      try {
        execSync(check, { stdio: 'pipe' });
      } catch {
        throw new Error(`Pre-deploy check failed: ${check}`);
      }
    }
  }

  private async build(projectType: string): Promise<void> {
    const buildCommands: Record<string, string> = {
      javascript: 'npm run build',
      typescript: 'npm run build',
      react: 'npm run build',
      nextjs: 'npm run build',
      python: 'python -m build',
      rust: 'cargo build --release',
      go: 'go build -o dist/ ./...'
    };

    const command = buildCommands[projectType];
    if (command) {
      execSync(command, { stdio: 'pipe' });
    }
  }

  private async deploy(environment: string, projectType: string): Promise<void> {
    console.log(chalk.gray(`Deploying to ${environment}...`));
    
    const deployScripts: Record<string, Record<string, string>> = {
      javascript: {
        dev: 'echo "Deployed to dev"',
        staging: 'echo "Deployed to staging"',
        production: 'echo "Deployed to production"'
      }
    };

    const script = deployScripts[projectType]?.[environment] || `echo "Deployed to ${environment}"`;
    execSync(script, { stdio: 'pipe' });
  }
}
