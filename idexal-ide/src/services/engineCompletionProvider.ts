/**
 * Engine-backed Completion Provider for Monaco Editor
 * Provides intelligent autocomplete using the Rust engine's symbol database
 * and file-aware context from the active project.
 */

import * as monacoEditor from 'monaco-editor'

interface ProjectSymbol {
  name: string
  kind: string
  filePath: string
  line: number
  snippet?: string
}

const symbolCache = new Map<string, ProjectSymbol[]>()
let lastIndexTime = 0
const INDEX_INTERVAL = 10_000 // Re-index every 10s

/**
 * Register the engine completion provider on the given Monaco instance.
 */
export function registerEngineCompletionProvider(monaco: typeof monacoEditor): void {
  // Register for all common languages
  const languages = [
    'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
    'rust', 'python', 'go', 'c', 'cpp',
    'html', 'css', 'json', 'yaml', 'markdown',
  ]

  for (const lang of languages) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', '->', '::', '(', ',', ' '],
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        }

        const suggestions: monacoEditor.languages.CompletionItem[] = []

        // 1. Project symbols from engine
        const symbols = await getProjectSymbols()
        for (const sym of symbols) {
          suggestions.push({
            label: sym.name,
            kind: mapSymbolKind(sym.kind, monaco),
            detail: sym.kind,
            documentation: sym.snippet || `${sym.kind} from ${sym.filePath}`,
            insertText: sym.name,
            range,
          })
        }

        // 2. Common patterns per language
        const langId = model.getLanguageId()
        const lineContent = model.getLineContent(position.lineNumber)
        const prefix = lineContent.substring(0, position.column - 1).trim()

        const snippets = getLanguageSnippets(langId, prefix)
        for (const snippet of snippets) {
          suggestions.push({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: snippet.detail,
            insertText: snippet.text,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }

        return { suggestions }
      },
    })
  }
}

async function getProjectSymbols(): Promise<ProjectSymbol[]> {
  const now = Date.now()
  if (now - lastIndexTime < INDEX_INTERVAL) {
    return Array.from(symbolCache.values()).flat()
  }

  try {
    if (window.electronAPI?.engineSearchSymbols) {
      const result = await window.electronAPI.engineSearchSymbols('')
      if (result.success && result.results) {
        const symbols: ProjectSymbol[] = result.results.map((s: any) => ({
          name: s.name,
          kind: s.symbol_type || s.kind || 'unknown',
          filePath: s.file_path || '',
          line: s.line || 0,
          snippet: s.snippet || '',
        }))
        symbolCache.clear()
        for (const sym of symbols) {
          const key = sym.name.toLowerCase()
          if (!symbolCache.has(key)) symbolCache.set(key, [])
          symbolCache.get(key)!.push(sym)
        }
        lastIndexTime = now
        return symbols
      }
    }
  } catch {
    // Engine not available
  }

  return Array.from(symbolCache.values()).flat()
}

function mapSymbolKind(kind: string, monaco: typeof monacoEditor): monacoEditor.languages.CompletionItemKind {
  const map: Record<string, monacoEditor.languages.CompletionItemKind> = {
    function: monaco.languages.CompletionItemKind.Function,
    class: monaco.languages.CompletionItemKind.Class,
    interface: monaco.languages.CompletionItemKind.Interface,
    type: monaco.languages.CompletionItemKind.TypeParameter,
    enum: monaco.languages.CompletionItemKind.Enum,
    constant: monaco.languages.CompletionItemKind.Constant,
    variable: monaco.languages.CompletionItemKind.Variable,
    struct: monaco.languages.CompletionItemKind.Struct,
    trait: monaco.languages.CompletionItemKind.Interface,
    module: monaco.languages.CompletionItemKind.Module,
    method: monaco.languages.CompletionItemKind.Method,
    property: monaco.languages.CompletionItemKind.Property,
  }
  return map[kind] || monaco.languages.CompletionItemKind.Text
}

interface SnippetDef {
  label: string
  detail: string
  text: string
}

function getLanguageSnippets(langId: string, prefix: string): SnippetDef[] {
  const snippets: SnippetDef[] = []

  if (langId === 'typescript' || langId === 'typescriptreact') {
    snippets.push(
      { label: 'fn', detail: 'Function declaration', text: 'function ${1:name}(${2:params}): ${3:void} {\n  $0\n}' },
      { label: 'afn', detail: 'Async function', text: 'async function ${1:name}(${2:params}): Promise<${3:void}> {\n  $0\n}' },
      { label: 'if', detail: 'If statement', text: 'if (${1:condition}) {\n  $0\n}' },
      { label: 'for', detail: 'For loop', text: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n  $0\n}' },
      { label: 'forof', detail: 'For...of loop', text: 'for (const ${1:item} of ${2:items}) {\n  $0\n}' },
      { label: 'try', detail: 'Try-catch block', text: 'try {\n  $0\n} catch (${1:error}) {\n  console.error(${1:error})\n}' },
      { label: 'import', detail: 'Import statement', text: "import { ${1:module} } from '${2:package}'" },
      { label: 'exp', detail: 'Export default', text: 'export default ${1:name}' },
      { label: 'cls', detail: 'Class declaration', text: 'class ${1:Name} {\n  $0\n}' },
      { label: 'int', detail: 'Interface', text: 'interface ${1:Name} {\n  $0\n}' },
      { label: 'type', detail: 'Type alias', text: 'type ${1:Name} = ${2:type}' },
      { label: 'const', detail: 'Const arrow function', text: 'const ${1:name} = (${2:params}) => {\n  $0\n}' },
      { label: 'switch', detail: 'Switch statement', text: 'switch (${1:value}) {\n  case ${2:case}:\n    $0\n    break\n  default:\n    break\n}' },
    )
  }

  if (langId === 'rust') {
    snippets.push(
      { label: 'fn', detail: 'Function', text: 'fn ${1:name}(${2:params}) -> ${3:()} {\n  $0\n}' },
      { label: 'pfn', detail: 'Public function', text: 'pub fn ${1:name}(${2:params}) -> ${3:()} {\n  $0\n}' },
      { label: 'afn', detail: 'Async function', text: 'async fn ${1:name}(${2:params}) -> ${3:()} {\n  $0\n}' },
      { label: 'struct', detail: 'Struct', text: 'struct ${1:Name} {\n  ${2:field}: ${3:Type},\n}' },
      { label: 'enum', detail: 'Enum', text: 'enum ${1:Name} {\n  ${2:Variant},\n}' },
      { label: 'impl', detail: 'Impl block', text: 'impl ${1:Type} {\n  $0\n}' },
      { label: 'trait', detail: 'Trait', text: 'trait ${1:Name} {\n  fn ${2:method}(&self${3:, params});\n}' },
      { label: 'match', detail: 'Match expression', text: 'match ${1:value} {\n  ${2:pattern} => ${3:result},\n  _ => ${4:default},\n}' },
      { label: 'if', detail: 'If let', text: 'if let ${1:Some(value)} = ${2:option} {\n  $0\n}' },
      { label: 'for', detail: 'For loop', text: 'for ${1:item} in ${2:iter} {\n  $0\n}' },
      { label: 'test', detail: 'Test function', text: '#[test]\nfn ${1:test_name}() {\n  $0\n}' },
      { label: 'derive', detail: 'Derive macro', text: '#[derive(${1:Debug, Clone})]' },
    )
  }

  if (langId === 'python') {
    snippets.push(
      { label: 'def', detail: 'Function', text: 'def ${1:name}(${2:params}):\n  $0' },
      { label: 'async def', detail: 'Async function', text: 'async def ${1:name}(${2:params}):\n  $0' },
      { label: 'class', detail: 'Class', text: 'class ${1:Name}:\n  def __init__(self${2:, params}):\n    $0' },
      { label: 'if', detail: 'If statement', text: 'if ${1:condition}:\n  $0' },
      { label: 'for', detail: 'For loop', text: 'for ${1:item} in ${2:iterable}:\n  $0' },
      { label: 'try', detail: 'Try-except', text: 'try:\n  $0\nexcept ${1:Exception} as ${2:e}:\n  print(${2:e})' },
      { label: 'with', detail: 'With statement', text: 'with ${1:resource} as ${2:var}:\n  $0' },
      { label: 'import', detail: 'Import', text: 'from ${1:module} import ${2:name}' },
    )
  }

  if (langId === 'go') {
    snippets.push(
      { label: 'fn', detail: 'Function', text: 'func ${1:name}(${2:params}) ${3:returnType} {\n  $0\n}' },
      { label: 'ifn', detail: 'Method', text: 'func (${1:receiver} *${2:Type}) ${3:Name}(${4:params}) ${5:returnType} {\n  $0\n}' },
      { label: 'struct', detail: 'Struct', text: 'type ${1:Name} struct {\n  ${2:Field} ${3:Type}\n}' },
      { label: 'interface', detail: 'Interface', text: 'type ${1:Name} interface {\n  ${2:Method}(${3:params}) ${4:returnType}\n}' },
      { label: 'err', detail: 'Error check', text: 'if err != nil {\n  return err\n}' },
      { label: 'for', detail: 'For loop', text: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n  $0\n}' },
    )
  }

  // Filter by prefix if typing
  if (prefix && prefix.length > 0) {
    const lastWord = prefix.split(/[\s(,]/).pop() || ''
    if (lastWord.length > 0) {
      return snippets.filter(s => s.label.toLowerCase().startsWith(lastWord.toLowerCase()))
    }
  }

  return snippets
}

/**
 * Register diagnostic provider that shows tree-sitter parse errors.
 */
export function registerDiagnosticProvider(
  monaco: typeof monacoEditor,
  model: any,
  diagnostics: Array<{ line: number; column: number; message: string; severity: 'error' | 'warning' | 'info' }>
): void {
  const markers = diagnostics.map(d => ({
    severity: d.severity === 'error' ? monaco.MarkerSeverity.Error :
              d.severity === 'warning' ? monaco.MarkerSeverity.Warning :
              monaco.MarkerSeverity.Info,
    startLineNumber: d.line,
    startColumn: d.column,
    endLineNumber: d.line,
    endColumn: d.column + 1,
    message: d.message,
    source: 'idexal-engine',
  }))

  monaco.editor.setModelMarkers(model, 'idexal-engine', markers)
}

/**
 * Clear symbol cache (call when project changes).
 */
export function clearCompletionCache(): void {
  symbolCache.clear()
  lastIndexTime = 0
}
