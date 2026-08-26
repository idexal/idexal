const LANGUAGE_MAP: Record<string, string> = {
  // Web
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.vue': 'vue',
  '.svelte': 'svelte',
  
  // Systems
  '.rs': 'rust',
  '.go': 'go',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.zig': 'zig',
  
  // Scripts
  '.py': 'python',
  '.rb': 'ruby',
  '.php': 'php',
  '.lua': 'lua',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  
  // Data
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.csv': 'plaintext',
  
  // Docs
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.txt': 'plaintext',
  '.rst': 'plaintext',
  
  // Config
  '.env': 'plaintext',
  '.gitignore': 'plaintext',
  '.dockerignore': 'plaintext',
  'Dockerfile': 'dockerfile',
  'docker-compose.yml': 'yaml',
  
  // SQL
  '.sql': 'sql',
  
  // Other
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.proto': 'protobuf',
}

export function detectLanguage(filename: string): string {
  const ext = filename.includes('.') ? '.' + filename.split('.').pop() : ''
  return LANGUAGE_MAP[ext] || LANGUAGE_MAP[filename] || 'plaintext'
}

export function getLanguageIcon(language: string): string {
  const icons: Record<string, string> = {
    javascript: '📜',
    typescript: '📘',
    python: '🐍',
    rust: '🦀',
    go: '🐹',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    html: '🌐',
    css: '🎨',
    json: '📋',
    markdown: '📝',
    shell: '🖥️',
    sql: '🗃️',
    graphql: '🔗',
  }
  
  return icons[language] || '📄'
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}
