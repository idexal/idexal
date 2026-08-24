/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                CODE INTELLIGENCE SERVICE v1.0                   ║
 * ║         Go-to-Definition • Find References • Rename             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export interface Definition {
  file: string
  line: number
  column: number
  text: string
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'constant' | 'import' | 'module'
}

export interface Reference {
  file: string
  line: number
  column: number
  length: number
  text: string
  context: string        // surrounding line
  isDefinition: boolean
}

export interface Symbol {
  name: string
  kind: SymbolKind
  line: number
  column: number
  endLine?: number
  children?: Symbol[]
  parent?: string
  documentation?: string
  signature?: string
}

export type SymbolKind = 'file' | 'module' | 'namespace' | 'package' | 'class' | 'method'
  | 'property' | 'field' | 'constructor' | 'enum' | 'interface' | 'function'
  | 'variable' | 'constant' | 'string' | 'number' | 'boolean' | 'array'
  | 'object' | 'typeParameter' | 'type' | 'parameter' | 'enumMember' | 'import'

export interface CodeAction {
  id: string
  title: string
  description: string
  kind: 'quickfix' | 'refactor' | 'source' | 'info'
  icon: string
  changes: CodeChange[]
}

export interface CodeChange {
  file: string
  range: { startLine: number; startColumn: number; endLine: number; endColumn: number }
  newText: string
}

export interface Diagnostic {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  source: string
  code?: string
}

// ══════════════════════════════════════════════════════════════
// CODE INTELLIGENCE SERVICE
// ══════════════════════════════════════════════════════════════

class CodeIntelligenceService {
  private symbolCache: Map<string, Symbol[]> = new Map()
  private definitionCache: Map<string, Definition[]> = new Map()

  // ── Symbol Extraction ──────────────────────────────────────

  extractSymbols(content: string, language: string): Symbol[] {
    const cacheKey = `${language}:${content.length}:${content.slice(0, 100)}`
    if (this.symbolCache.has(cacheKey)) return this.symbolCache.get(cacheKey)!

    const symbols: Symbol[] = []

    switch (language) {
      case 'typescript':
      case 'tsx':
        symbols.push(...this.extractTypeScriptSymbols(content))
        break
      case 'javascript':
      case 'jsx':
        symbols.push(...this.extractJavaScriptSymbols(content))
        break
      case 'rust':
        symbols.push(...this.extractRustSymbols(content))
        break
      case 'python':
        symbols.push(...this.extractPythonSymbols(content))
        break
      default:
        symbols.push(...this.extractGenericSymbols(content))
    }

    this.symbolCache.set(cacheKey, symbols)
    return symbols
  }

  private extractTypeScriptSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Function
      const fnMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/)
      if (fnMatch) {
        symbols.push({ name: fnMatch[3], kind: 'function', line: i + 1, column: line.indexOf(fnMatch[0]) })
      }

      // Class
      const classMatch = trimmed.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)/)
      if (classMatch) {
        symbols.push({ name: classMatch[3], kind: 'class', line: i + 1, column: line.indexOf(classMatch[0]) })
      }

      // Interface
      const ifaceMatch = trimmed.match(/^(export\s+)?interface\s+(\w+)/)
      if (ifaceMatch) {
        symbols.push({ name: ifaceMatch[2], kind: 'interface', line: i + 1, column: line.indexOf(ifaceMatch[0]) })
      }

      // Type
      const typeMatch = trimmed.match(/^(export\s+)?type\s+(\w+)/)
      if (typeMatch) {
        symbols.push({ name: typeMatch[2], kind: 'type', line: i + 1, column: line.indexOf(typeMatch[0]) })
      }

      // Enum
      const enumMatch = trimmed.match(/^(export\s+)?enum\s+(\w+)/)
      if (enumMatch) {
        symbols.push({ name: enumMatch[2], kind: 'enum', line: i + 1, column: line.indexOf(enumMatch[0]) })
      }

      // Const
      const constMatch = trimmed.match(/^(export\s+)?const\s+(\w+)/)
      if (constMatch) {
        symbols.push({ name: constMatch[2], kind: 'constant', line: i + 1, column: line.indexOf(constMatch[0]) })
      }

      // Let/Var
      const letMatch = trimmed.match(/^(export\s+)?(let|var)\s+(\w+)/)
      if (letMatch) {
        symbols.push({ name: letMatch[3], kind: 'variable', line: i + 1, column: line.indexOf(letMatch[0]) })
      }

      // Import
      const importMatch = trimmed.match(/^import\s+.*from\s+['"](.+)['"]/)
      if (importMatch) {
        symbols.push({ name: importMatch[1], kind: 'import', line: i + 1, column: 0 })
      }

      // Interface property (inside interface)
      const propMatch = trimmed.match(/^(\w+)\s*[?]?\s*[:\(]/)
      if (propMatch && !trimmed.startsWith('export') && !trimmed.startsWith('import') && !trimmed.startsWith('//')) {
        symbols.push({ name: propMatch[1], kind: 'property', line: i + 1, column: 0 })
      }
    }

    return symbols
  }

  private extractJavaScriptSymbols(content: string): Symbol[] {
    return this.extractTypeScriptSymbols(content)
  }

  private extractRustSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      const fnMatch = trimmed.match(/^(pub\s+)?(async\s+)?fn\s+(\w+)/)
      if (fnMatch) symbols.push({ name: fnMatch[3], kind: 'function', line: i + 1, column: line.indexOf(fnMatch[0]) })

      const structMatch = trimmed.match(/^(pub\s+)?struct\s+(\w+)/)
      if (structMatch) symbols.push({ name: structMatch[2], kind: 'class', line: i + 1, column: line.indexOf(structMatch[0]) })

      const enumMatch = trimmed.match(/^(pub\s+)?enum\s+(\w+)/)
      if (enumMatch) symbols.push({ name: enumMatch[2], kind: 'enum', line: i + 1, column: line.indexOf(enumMatch[0]) })

      const traitMatch = trimmed.match(/^(pub\s+)?trait\s+(\w+)/)
      if (traitMatch) symbols.push({ name: traitMatch[2], kind: 'interface', line: i + 1, column: line.indexOf(traitMatch[0]) })

      const implMatch = trimmed.match(/^impl(<[^>]+>)?\s+(\w+)/)
      if (implMatch) symbols.push({ name: implMatch[2], kind: 'class', line: i + 1, column: line.indexOf(implMatch[0]) })

      const constMatch = trimmed.match(/^(pub\s+)?const\s+(\w+)/)
      if (constMatch) symbols.push({ name: constMatch[2], kind: 'constant', line: i + 1, column: line.indexOf(constMatch[0]) })

      const typeMatch = trimmed.match(/^(pub\s+)?type\s+(\w+)/)
      if (typeMatch) symbols.push({ name: typeMatch[2], kind: 'type', line: i + 1, column: line.indexOf(typeMatch[0]) })

      const modMatch = trimmed.match(/^(pub\s+)?mod\s+(\w+)/)
      if (modMatch) symbols.push({ name: modMatch[2], kind: 'module', line: i + 1, column: line.indexOf(modMatch[0]) })
    }

    return symbols
  }

  private extractPythonSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      const defMatch = trimmed.match(/^(async\s+)?def\s+(\w+)/)
      if (defMatch) symbols.push({ name: defMatch[2], kind: 'function', line: i + 1, column: line.indexOf(defMatch[0]) })

      const classMatch = trimmed.match(/^class\s+(\w+)/)
      if (classMatch) symbols.push({ name: classMatch[1], kind: 'class', line: i + 1, column: line.indexOf(classMatch[0]) })

      const importMatch = trimmed.match(/^(from\s+\S+\s+)?import\s+(.+)/)
      if (importMatch) symbols.push({ name: importMatch[2].split(',')[0].trim(), kind: 'import', line: i + 1, column: 0 })

      const varMatch = trimmed.match(/^(\w+)\s*=/)
      if (varMatch && !trimmed.startsWith('#') && !trimmed.startsWith('def') && !trimmed.startsWith('class')) {
        symbols.push({ name: varMatch[1], kind: 'variable', line: i + 1, column: 0 })
      }
    }

    return symbols
  }

  private extractGenericSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = []
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      const fnMatch = trimmed.match(/^(function|def|fn|func)\s+(\w+)/)
      if (fnMatch) symbols.push({ name: fnMatch[2], kind: 'function', line: i + 1, column: 0 })
      const classMatch = trimmed.match(/^(class|struct|enum)\s+(\w+)/)
      if (classMatch) symbols.push({ name: classMatch[2], kind: 'class', line: i + 1, column: 0 })
    }
    return symbols
  }

  // ── Go to Definition ───────────────────────────────────────

  findDefinition(word: string, allFiles: { path: string; content: string; language: string }[]): Definition[] {
    const results: Definition[] = []
    const wordLower = word.toLowerCase()

    for (const file of allFiles) {
      const symbols = this.extractSymbols(file.content, file.language)
      for (const sym of symbols) {
        if (sym.name.toLowerCase() === wordLower) {
          results.push({
            file: file.path,
            line: sym.line,
            column: sym.column,
            text: sym.name,
            type: sym.kind as any,
          })
        }
      }
    }

    return results
  }

  // ── Find References ────────────────────────────────────────

  findReferences(word: string, allFiles: { path: string; content: string; language: string }[]): Reference[] {
    const results: Reference[] = []
    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'g')

    for (const file of allFiles) {
      const lines = file.content.split('\n')
      const symbols = this.extractSymbols(file.content, file.language)
      const definitionLines = new Set(symbols.filter(s => s.name === word).map(s => s.line))

      for (let i = 0; i < lines.length; i++) {
        let match
        while ((match = regex.exec(lines[i])) !== null) {
          results.push({
            file: file.path,
            line: i + 1,
            column: match.index,
            length: word.length,
            text: lines[i].trim(),
            context: lines[i].trim(),
            isDefinition: definitionLines.has(i + 1),
          })
        }
      }
    }

    return results
  }

  // ── Rename Symbol ──────────────────────────────────────────

  renameSymbol(
    word: string,
    newName: string,
    allFiles: { path: string; content: string; language: string }[]
  ): CodeChange[] {
    const changes: CodeChange[] = []
    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'g')

    for (const file of allFiles) {
      const lines = file.content.split('\n')
      let hasChanges = false

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          hasChanges = true
          break
        }
      }

      if (hasChanges) {
        let newContent = file.content.replace(regex, newName)
        changes.push({
          file: file.path,
          range: { startLine: 0, startColumn: 0, endLine: lines.length, endColumn: 0 },
          newText: newContent,
        })
      }
    }

    return changes
  }

  // ── Code Actions ───────────────────────────────────────────

  getCodeActions(line: string, language: string): CodeAction[] {
    const actions: CodeAction[] = []
    const trimmed = line.trim()

    // Add missing import
    if (trimmed.includes('useState') && !line.includes('import')) {
      actions.push({
        id: 'add-import-useState',
        title: 'Add missing import',
        description: 'Import useState from React',
        kind: 'quickfix',
        icon: '💡',
        changes: [],
      })
    }

    // Extract function
    if (trimmed.startsWith('function ') || trimmed.match(/^(export\s+)?function/)) {
      actions.push({
        id: 'extract-function',
        title: 'Extract to function',
        description: 'Extract selected code to a new function',
        kind: 'refactor',
        icon: '🔄',
        changes: [],
      })
    }

    // Convert to arrow function
    if (trimmed.match(/^(export\s+)?function\s+\w+/)) {
      actions.push({
        id: 'convert-arrow',
        title: 'Convert to arrow function',
        description: 'Convert function declaration to arrow function',
        kind: 'refactor',
        icon: '🔄',
        changes: [],
      })
    }

    // Add return type
    if (trimmed.match(/^(export\s+)?function\s+\w+\([^)]*\)\s*\{/)) {
      actions.push({
        id: 'add-return-type',
        title: 'Add return type',
        description: 'Add explicit return type annotation',
        kind: 'quickfix',
        icon: '💡',
        changes: [],
      })
    }

    // Add error handling
    if (trimmed.includes('await') && !trimmed.includes('try')) {
      actions.push({
        id: 'add-try-catch',
        title: 'Wrap in try-catch',
        description: 'Add error handling around async operation',
        kind: 'quickfix',
        icon: '💡',
        changes: [],
      })
    }

    return actions
  }

  // ── Diagnostics ────────────────────────────────────────────

  getDiagnostics(content: string, language: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Unused variable
      const unusedMatch = line.match(/^(const|let|var)\s+(\w+)\s*=/)
      if (unusedMatch) {
        const varName = unusedMatch[2]
        const rest = content.slice(content.indexOf(line) + line.length)
        if (!rest.includes(varName)) {
          diagnostics.push({
            file: '',
            line: i + 1,
            column: 0,
            severity: 'warning',
            message: `'${varName}' is declared but its value is never read`,
            source: language,
          })
        }
      }

      // Console.log
      if (line.includes('console.log') && language === 'typescript') {
        diagnostics.push({
          file: '',
          line: i + 1,
          column: line.indexOf('console.log'),
          severity: 'hint',
          message: 'Unexpected console statement',
          source: 'eslint',
          code: 'no-console',
        })
      }

      // Any type
      if (line.includes(': any') || line.includes('as any')) {
        diagnostics.push({
          file: '',
          line: i + 1,
          column: line.indexOf('any'),
          severity: 'warning',
          message: 'Unexpected any. Specify a different type',
          source: 'typescript',
        })
      }
    }

    return diagnostics
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export const codeIntelligenceService = new CodeIntelligenceService()
export default codeIntelligenceService
