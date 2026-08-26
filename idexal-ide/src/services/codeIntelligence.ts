/**
 * Code Intelligence Provider
 * Provides hover info and go-to-definition using the Rust engine's symbol database.
 */

import * as monaco from 'monaco-editor'

interface SymbolInfo {
  name: string
  kind: string
  filePath: string
  line: number
  column: number
  snippet?: string
}

let symbolDatabase: Map<string, SymbolInfo[]> = new Map()
let initialized = false

/**
 * Initialize the code intelligence system by loading symbols from the Rust engine.
 */
export async function initCodeIntelligence(): Promise<void> {
  if (initialized) return

  try {
    // Try to load symbols from the engine via IPC
    if (window.electronAPI?.engineSearchSymbols) {
      const result = await window.electronAPI.engineSearchSymbols('')
      if (result.success && result.results) {
        for (const sym of result.results) {
          const key = sym.name?.toLowerCase() || ''
          if (!symbolDatabase.has(key)) {
            symbolDatabase.set(key, [])
          }
          symbolDatabase.get(key)!.push({
            name: sym.name,
            kind: sym.symbol_type || sym.kind || 'unknown',
            filePath: sym.file_path || sym.filePath || '',
            line: sym.line || 0,
            column: sym.column || 0,
            snippet: sym.snippet || '',
          })
        }
      }
    }
  } catch {
    // Engine not available — intelligence will be limited
  }

  initialized = true
}

/**
 * Register Monaco providers for hover and definition navigation.
 */
export function registerCodeIntelligenceProviders(
  monacoInstance: typeof monaco
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = []

  // Hover provider — shows symbol info on hover
  disposables.push(
    monacoInstance.languages.registerHoverProvider('*', {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position)
        if (!word) return null

        const symbols = symbolDatabase.get(word.word.toLowerCase())
        if (!symbols || symbols.length === 0) return null

        const sym = symbols[0]
        const kindIcon = getKindIcon(sym.kind)

        return {
          range: new monacoInstance.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            {
              value: [
                `**${kindIcon} ${sym.name}**`,
                '',
                sym.snippet ? `\`\`\`\`\`\n${sym.snippet}\n\`\`\`\`\`` : '',
                `**Kind:** ${sym.kind}`,
                `**File:** ${sym.filePath}:${sym.line}`,
              ].filter(Boolean).join('\n'),
            },
          ],
        }
      },
    })
  )

  // Definition provider — go to symbol definition
  disposables.push(
    monacoInstance.languages.registerDefinitionProvider('*', {
      provideDefinition(model, position) {
        const word = model.getWordAtPosition(position)
        if (!word) return null

        const symbols = symbolDatabase.get(word.word.toLowerCase())
        if (!symbols || symbols.length === 0) return null

        const sym = symbols[0]
        return {
          uri: monacoInstance.Uri.parse(sym.filePath),
          range: new monacoInstance.Range(
            sym.line || 1,
            sym.column || 1,
            sym.line || 1,
            (sym.column || 1) + sym.name.length
          ),
        }
      },
    })
  )

  // Document symbol provider — outline view
  disposables.push(
    monacoInstance.languages.registerDocumentSymbolProvider('*', {
      provideDocumentSymbols(model) {
        const text = model.getValue()
        const lines = text.split('\n')
        const symbols: any[] = []

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const trimmed = line.trim()

          // Detect common symbol patterns
          const symbolMatch =
            /^(export\s+)?(function|class|interface|type|enum|const|let|var|async\s+function|trait|impl|struct|fn|pub\s+fn|pub\s+struct|pub\s+enum)\s+(\w+)/.exec(trimmed)

          if (symbolMatch) {
            const kind = getSymbolKind(symbolMatch[2])
            const name = symbolMatch[3]
            const lineNum = i + 1

            symbols.push({
              name,
              detail: '',
              kind,
              range: new monacoInstance.Range(lineNum, 0, lineNum, line.length),
              selectionRange: new monacoInstance.Range(lineNum, 0, lineNum, line.length),
              children: [],
            } as any)
          }
        }

        return symbols
      },
    })
  )

  // Reference provider — find all references
  disposables.push(
    monacoInstance.languages.registerReferenceProvider('*', {
      provideReferences(model, position) {
        const word = model.getWordAtPosition(position)
        if (!word) return []

        const references: monaco.languages.Location[] = []
        const text = model.getValue()
        const lines = text.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          let startIndex = 0
          while (startIndex < line.length) {
            const idx = line.toLowerCase().indexOf(word.word.toLowerCase(), startIndex)
            if (idx === -1) break
            references.push({
              uri: model.uri,
              range: new monacoInstance.Range(
                i + 1,
                idx + 1,
                i + 1,
                idx + 1 + word.word.length
              ),
            })
            startIndex = idx + 1
          }
        }

        return references
      },
    })
  )

  return disposables
}

/**
 * Add symbols to the database (called when files are parsed by the Rust engine).
 */
export function addSymbols(symbols: SymbolInfo[]): void {
  for (const sym of symbols) {
    const key = sym.name.toLowerCase()
    if (!symbolDatabase.has(key)) {
      symbolDatabase.set(key, [])
    }
    symbolDatabase.get(key)!.push(sym)
  }
}

/**
 * Clear the symbol database (e.g., when switching projects).
 */
export function clearSymbolDatabase(): void {
  symbolDatabase.clear()
  initialized = false
}

function getKindIcon(kind: string): string {
  const icons: Record<string, string> = {
    function: 'ƒ',
    class: '◆',
    interface: '◇',
    type: '𝑡',
    enum: '⊡',
    constant: '▪',
    variable: '◇',
    struct: '◆',
    trait: '◇',
    module: '📦',
    method: 'ƒ',
    property: '•',
    enum_variant: '▪',
  }
  return icons[kind] || '•'
}

function getSymbolKind(kind: string): monaco.languages.SymbolKind {
  const map: Record<string, monaco.languages.SymbolKind> = {
    function: monaco.languages.SymbolKind.Function,
    'async function': monaco.languages.SymbolKind.Function,
    fn: monaco.languages.SymbolKind.Function,
    'pub fn': monaco.languages.SymbolKind.Function,
    class: monaco.languages.SymbolKind.Class,
    struct: monaco.languages.SymbolKind.Struct,
    interface: monaco.languages.SymbolKind.Interface,
    type: monaco.languages.SymbolKind.TypeParameter,
    enum: monaco.languages.SymbolKind.Enum,
    const: monaco.languages.SymbolKind.Constant,
    let: monaco.languages.SymbolKind.Variable,
    var: monaco.languages.SymbolKind.Variable,
    trait: monaco.languages.SymbolKind.Interface,
    impl: monaco.languages.SymbolKind.Class,
    module: monaco.languages.SymbolKind.Module,
    'pub struct': monaco.languages.SymbolKind.Struct,
    'pub enum': monaco.languages.SymbolKind.Enum,
  }
  return map[kind] || monaco.languages.SymbolKind.Variable
}
