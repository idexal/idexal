import fs from 'fs-extra';
import path from 'path';
import os from 'os';

interface AppConfig {
  name?: string;
  version?: string;
  aiProvider?: {
    type: 'openai' | 'anthropic' | 'local' | 'custom';
    apiKey?: string;
    baseUrl?: string;
  };
  defaultModel?: string;
  features?: {
    autoContext?: boolean;
    gitIntegration?: boolean;
    streaming?: boolean;
    codeAnalysis?: boolean;
  };
  context?: {
    include?: string[];
    exclude?: string[];
  };
  user?: {
    name?: string;
    email?: string;
    plan?: string;
    apiKey?: string;
  };
  [key: string]: any;
}

const DEFAULT_CONFIG: AppConfig = {
  aiProvider: {
    type: 'openai'
  },
  defaultModel: 'gpt-4',
  features: {
    autoContext: true,
    gitIntegration: true,
    streaming: true,
    codeAnalysis: true
  },
  context: {
    include: ['src/**', 'lib/**'],
    exclude: ['node_modules/**', 'dist/**', '*.test.*']
  }
};

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private configPath: string;
  private globalConfigPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), '.idexa.json');
    this.globalConfigPath = path.join(os.homedir(), '.idexa', 'config.json');
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    let config = { ...DEFAULT_CONFIG };

    if (fs.existsSync(this.globalConfigPath)) {
      try {
        const globalConfig = fs.readJSONSync(this.globalConfigPath);
        config = this.mergeConfig(config, globalConfig);
      } catch {}
    }

    if (fs.existsSync(this.configPath)) {
      try {
        const localConfig = fs.readJSONSync(this.configPath);
        config = this.mergeConfig(config, localConfig);
      } catch {}
    }

    return config;
  }

  private mergeConfig(base: any, override: any): any {
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (typeof override[key] === 'object' && !Array.isArray(override[key]) && override[key] !== null) {
        result[key] = this.mergeConfig(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }

  get(key: string): any {
    return key.split('.').reduce((obj, k) => obj?.[k], this.config);
  }

  set(key: string, value: any): void {
    const keys = key.split('.');
    let obj: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    this.save();
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  private save(): void {
    const dir = path.dirname(this.configPath);
    fs.ensureDirSync(dir);
    fs.writeJSONSync(this.configPath, this.config, { spaces: 2 });
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }
}
