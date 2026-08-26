import fs from 'fs-extra';
import path from 'path';

export interface ProjectInfo {
  name: string;
  type: string;
  rootPath: string;
  fileCount: number;
  languages: string[];
  primaryLanguage: string;
  dependencies: string[];
}

const PROJECT_INDICATORS: Record<string, { files: string[]; language: string }> = {
  javascript: { files: ['package.json', 'yarn.lock', 'pnpm-lock.yaml'], language: 'javascript' },
  typescript: { files: ['tsconfig.json'], language: 'typescript' },
  react: { files: ['react.config.js', '.babelrc'], language: 'typescript' },
  nextjs: { files: ['next.config.js', 'next.config.mjs'], language: 'typescript' },
  python: { files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'], language: 'python' },
  rust: { files: ['Cargo.toml'], language: 'rust' },
  go: { files: ['go.mod'], language: 'go' },
  java: { files: ['pom.xml', 'build.gradle'], language: 'java' },
  ruby: { files: ['Gemfile'], language: 'ruby' },
  php: { files: ['composer.json'], language: 'php' }
};

export async function detectProject(searchPath?: string): Promise<ProjectInfo | null> {
  const rootPath = searchPath || process.cwd();
  
  const type = await detectProjectType(rootPath);
  if (!type) return null;

  const name = await getProjectName(rootPath, type);
  const fileCount = await countFiles(rootPath);
  const languages = await detectLanguages(rootPath, type);
  const dependencies = await getDependencies(rootPath, type);

  return {
    name,
    type,
    rootPath,
    fileCount,
    languages,
    primaryLanguage: PROJECT_INDICATORS[type]?.language || 'unknown',
    dependencies
  };
}

async function detectProjectType(rootPath: string): Promise<string | null> {
  for (const [type, { files }] of Object.entries(PROJECT_INDICATORS)) {
    for (const file of files) {
      if (await fs.pathExists(path.join(rootPath, file))) {
        return type;
      }
    }
  }
  return null;
}

async function getProjectName(rootPath: string, type: string): Promise<string> {
  try {
    if (type === 'javascript' || type === 'typescript' || type === 'react' || type === 'nextjs') {
      const pkg = await fs.readJSON(path.join(rootPath, 'package.json'));
      return pkg.name || path.basename(rootPath);
    }
    if (type === 'rust') {
      const cargo = await fs.readFile(path.join(rootPath, 'Cargo.toml'), 'utf-8');
      const nameMatch = cargo.match(/name\s*=\s*"([^"]+)"/);
      return nameMatch?.[1] || path.basename(rootPath);
    }
    if (type === 'go') {
      const goMod = await fs.readFile(path.join(rootPath, 'go.mod'), 'utf-8');
      const nameMatch = goMod.match(/module\s+(.+)/);
      return nameMatch?.[1]?.split('/').pop() || path.basename(rootPath);
    }
  } catch {}
  return path.basename(rootPath);
}

async function countFiles(rootPath: string): Promise<number> {
  let count = 0;
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__'];
  
  const countDir = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name)) {
          await countDir(path.join(dir, entry.name));
        }
      } else {
        count++;
      }
    }
  };
  
  try {
    await countDir(rootPath);
  } catch {}
  
  return count;
}

async function detectLanguages(rootPath: string, type: string): Promise<string[]> {
  const languages: Set<string> = new Set();
  
  if (['javascript', 'typescript', 'react', 'nextjs'].includes(type)) {
    languages.add('JavaScript/TypeScript');
  }
  if (type === 'python') languages.add('Python');
  if (type === 'rust') languages.add('Rust');
  if (type === 'go') languages.add('Go');
  if (type === 'java') languages.add('Java');
  if (type === 'ruby') languages.add('Ruby');
  if (type === 'php') languages.add('PHP');
  
  return Array.from(languages);
}

async function getDependencies(rootPath: string, type: string): Promise<string[]> {
  try {
    if (['javascript', 'typescript', 'react', 'nextjs'].includes(type)) {
      const pkg = await fs.readJSON(path.join(rootPath, 'package.json'));
      return Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies
      });
    }
    if (type === 'python') {
      if (await fs.pathExists(path.join(rootPath, 'requirements.txt'))) {
        const content = await fs.readFile(path.join(rootPath, 'requirements.txt'), 'utf-8');
        return content.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('==')[0].split('>=')[0].trim());
      }
    }
    if (type === 'rust') {
      const cargo = await fs.readFile(path.join(rootPath, 'Cargo.toml'), 'utf-8');
      const deps = cargo.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
      return deps?.[1]?.match(/(\w+)\s*=/g)?.map(d => d.replace('=', '').trim()) || [];
    }
  } catch {}
  return [];
}
