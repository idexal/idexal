/**
 * Code Formatter Service
 * Provides code formatting capabilities similar to Prettier
 */

export interface FormatOptions {
  printWidth: number
  tabWidth: number
  useTabs: boolean
  semi: boolean
  singleQuote: boolean
  trailingComma: 'none' | 'es5' | 'all'
  bracketSpacing: boolean
  jsxSingleQuote: boolean
  arrowParens: 'always' | 'avoid'
  endOfLine: 'lf' | 'crlf' | 'auto'
}

export const DEFAULT_OPTIONS: FormatOptions = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  jsxSingleQuote: false,
  arrowParens: 'always',
  endOfLine: 'lf',
}

export interface FormatResult {
  formatted: string
  changes: number
  errors: string[]
}

/**
 * Basic JS/TS formatter (simplified Prettier-like rules)
 */
export function formatJavaScript(code: string, options: FormatOptions = DEFAULT_OPTIONS): FormatResult {
  let formatted = code
  let changes = 0
  const errors: string[] = []

  try {
    const indent = options.useTabs ? '\t' : ' '.repeat(options.tabWidth)

    // Normalize line endings
    if (options.endOfLine === 'lf') {
      formatted = formatted.replace(/\r\n/g, '\n')
    } else if (options.endOfLine === 'crlf') {
      formatted = formatted.replace(/\r?\n/g, '\r\n')
    }

    // Remove trailing whitespace
    const before = formatted
    formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n')
    if (formatted !== before) changes++

    // Normalize semicolons
    if (!options.semi) {
      // Remove unnecessary semicolons (simplified)
      formatted = formatted.replace(/;(\s*\n)/g, '$1')
      if (formatted !== before) changes++
    }

    // Normalize quotes (simplified)
    if (options.singleQuote) {
      formatted = formatted.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, "'$1'")
    } else {
      formatted = formatted.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
    }

    // Bracket spacing
    if (options.bracketSpacing) {
      formatted = formatted.replace(/\{(\S)/g, '{ $1')
      formatted = formatted.replace(/(\S)\}/g, '$1 }')
    } else {
      formatted = formatted.replace(/\{ /g, '{')
      formatted = formatted.replace(/ \}/g, '}')
    }

    // Arrow parens
    if (options.arrowParens === 'avoid') {
      formatted = formatted.replace(/\((\w+)\) =>/g, '$1 =>')
    } else {
      formatted = formatted.replace(/(\w+) =>/g, '($1) =>')
    }

    // Trailing commas
    if (options.trailingComma === 'none') {
      formatted = formatted.replace(/,(\s*[}\]])/g, '$1')
    }

    // Ensure final newline
    if (!formatted.endsWith('\n')) {
      formatted += '\n'
    }

    // Remove multiple blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n')

    return { formatted, changes, errors }
  } catch (e) {
    errors.push(`Format error: ${e}`)
    return { formatted: code, changes: 0, errors }
  }
}

/**
 * CSS formatter
 */
export function formatCSS(code: string, options: FormatOptions = DEFAULT_OPTIONS): FormatResult {
  let formatted = code
  let changes = 0
  const errors: string[] = []

  try {
    const indent = options.useTabs ? '\t' : ' '.repeat(options.tabWidth)

    // Basic CSS formatting
    // Add space after colons
    formatted = formatted.replace(/:\s*/g, ': ')
    
    // Add newline after opening brace
    formatted = formatted.replace(/\{\s*/g, ' {\n')
    
    // Add indent before properties
    formatted = formatted.replace(/\n(\s*)([\w-]+:)/g, `\n$1${indent}$2`)
    
    // Add newline before closing brace
    formatted = formatted.replace(/\s*\}/g, '\n}')
    
    // Remove trailing whitespace
    const before = formatted
    formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n')
    if (formatted !== before) changes++

    // Remove multiple blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n')

    if (!formatted.endsWith('\n')) {
      formatted += '\n'
    }

    return { formatted, changes, errors }
  } catch (e) {
    errors.push(`CSS format error: ${e}`)
    return { formatted: code, changes: 0, errors }
  }
}

/**
 * HTML formatter
 */
export function formatHTML(code: string, options: FormatOptions = DEFAULT_OPTIONS): FormatResult {
  let formatted = code
  let changes = 0
  const errors: string[] = []

  try {
    const indent = options.useTabs ? '\t' : ' '.repeat(options.tabWidth)
    const lines = formatted.split('\n')
    const result: string[] = []
    let level = 0
    const selfClosing = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'])

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        result.push('')
        continue
      }

      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        level = Math.max(0, level - 1)
      }

      result.push(indent.repeat(level) + trimmed)

      // Increase indent for opening tags (not self-closing)
      const tagMatch = trimmed.match(/^<(\w+)([^>]*?)>/)
      if (tagMatch && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !selfClosing.has(tagMatch[1].toLowerCase())) {
        level++
      }
    }

    formatted = result.join('\n')
    changes = 1

    if (!formatted.endsWith('\n')) {
      formatted += '\n'
    }

    return { formatted, changes, errors }
  } catch (e) {
    errors.push(`HTML format error: ${e}`)
    return { formatted: code, changes: 0, errors }
  }
}

/**
 * JSON formatter
 */
export function formatJSON(code: string, options: FormatOptions = DEFAULT_OPTIONS): FormatResult {
  const errors: string[] = []
  try {
    const parsed = JSON.parse(code)
    const indent = options.useTabs ? '\t' : ' '.repeat(options.tabWidth)
    const formatted = JSON.stringify(parsed, null, indent) + '\n'
    return { formatted, changes: formatted !== code ? 1 : 0, errors }
  } catch (e) {
    errors.push(`JSON parse error: ${e}`)
    return { formatted: code, changes: 0, errors }
  }
}

/**
 * Format code based on language
 */
export function formatCode(code: string, language: string, options: FormatOptions = DEFAULT_OPTIONS): FormatResult {
  const lang = language.toLowerCase()
  
  if (['javascript', 'typescript', 'jsx', 'tsx', 'js', 'ts'].includes(lang)) {
    return formatJavaScript(code, options)
  }
  if (['css', 'scss', 'less'].includes(lang)) {
    return formatCSS(code, options)
  }
  if (['html', 'htm', 'vue', 'xml'].includes(lang)) {
    return formatHTML(code, options)
  }
  if (lang === 'json') {
    return formatJSON(code, options)
  }
  
  return { formatted: code, changes: 0, errors: [] }
}

/**
 * Get default format options for a language
 */
export function getLanguageOptions(language: string): Partial<FormatOptions> {
  const lang = language.toLowerCase()
  
  if (lang === 'json') {
    return { printWidth: 80, tabWidth: 2, useTabs: false }
  }
  if (['css', 'scss', 'less'].includes(lang)) {
    return { printWidth: 100, tabWidth: 2 }
  }
  
  return DEFAULT_OPTIONS
}
