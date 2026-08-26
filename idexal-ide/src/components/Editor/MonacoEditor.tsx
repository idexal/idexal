import React, { useRef, useEffect, useState, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import { useEditorStore, Tab, SymbolInfo } from '../../stores/editorStore'
import { aiStreamingService } from '../../services/aiStreamingService'
import { registerAICodeActions } from '../../services/aiCodeActions'
import { registerDiagnosticProvider } from '../../services/engineCompletionProvider'
import { codeIntelligenceService } from '../../services/codeIntelligenceService'
import { lspClient, LSPDiagnostic } from '../../services/lspClient'
import { MultiCursorToolbar } from './MultiCursorToolbar'
import { getCollaborationState, bindMonacoToYjs, updateCursor } from '../../services/collaborationService'
import { useCollaborativeCursors, injectCollaborativeCursorStyles } from '../Collaboration/CollaborativeCursors'


interface MonacoEditorProps {
  tab: Tab
  onFormat?: () => void
}

const IDEXAL_THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'keyword.control', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'string.escape', foreground: '79c0ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'regexp', foreground: '7ee787' },
    { token: 'type', foreground: 'ffa657' },
    { token: 'type.identifier', foreground: 'ffa657' },
    { token: 'class', foreground: 'ffa657' },
    { token: 'interface', foreground: 'ffa657' },
    { token: 'function', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'ffa657' },
    { token: 'variable.predefined', foreground: '79c0ff' },
    { token: 'operator', foreground: 'ff7b72' },
    { token: 'delimiter', foreground: 'c9d1d9' },
    { token: 'tag', foreground: '7ee787' },
    { token: 'attribute.name', foreground: '79c0ff' },
    { token: 'attribute.value', foreground: 'a5d6ff' },
    { token: 'annotation', foreground: 'd2a8ff' },
    { token: 'constant', foreground: '79c0ff' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#161b2280',
    'editor.selectionBackground': '#264f7860',
    'editor.inactiveSelectionBackground': '#264f7830',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#c9d1d9',
    'editorCursor.foreground': '#58a6ff',
    'editor.selectionHighlightBackground': '#58a6ff20',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
    'editorBracketMatch.background': '#58a6ff20',
    'editorBracketMatch.border': '#58a6ff80',
    'editorWidget.background': '#161b22',
    'editorWidget.border': '#30363d',
    'editorSuggestWidget.background': '#161b22',
    'editorSuggestWidget.border': '#30363d',
    'editorSuggestWidget.selectedBackground': '#1f6feb30',
    'editorSuggestWidget.highlightForeground': '#58a6ff',
    'editorGutter.background': '#0d1117',
    'editorOverviewRuler.border': '#0d1117',
    'minimap.background': '#0d1117',
    'minimap.selectionHighlight': '#264f7860',
    'breadcrumb.foreground': '#8b949e',
    'breadcrumb.focusForeground': '#c9d1d9',
    'breadcrumb.activeSelectionForeground': '#58a6ff',
    'editorStickyScroll.background': '#0d1117ee',
    'editorStickyScrollHover.background': '#161b22',
  },
}

export default function MonacoEditor({ tab, onFormat }: MonacoEditorProps) {
  const { updateTabContent } = useEditorStore()
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const [isMinimapEnabled, setIsMinimapEnabled] = useState(true)
  const [wordWrap, setWordWrap] = useState<'off' | 'on'>('off')
  const [fontSize, setFontSize] = useState(14)
  const [tabSize, setTabSize] = useState(2)
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true)
  const [stickyScroll, setStickyScroll] = useState(true)
  const [formatOnSave, setFormatOnSave] = useState(false)
  const [cursorCount, setCursorCount] = useState(1)
  const [isColumnSelectionMode, setIsColumnSelectionMode] = useState(false)
  const themeDefined = useRef(false)

  // ── CRDT collaborative cursors ─────────────────────────
  const collabEnabled = !!getCollaborationState().sessionId
  useCollaborativeCursors(editorRef.current, monacoRef.current, collabEnabled)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    if (!themeDefined.current) {
      monaco.editor.defineTheme('idexal-dark', IDEXAL_THEME as any)
      themeDefined.current = true
    }
    monaco.editor.setTheme('idexal-dark')

    editor.focus()

    // ── CRDT Collaboration binding ─────────────────────────
    injectCollaborativeCursorStyles()
    const collabState = getCollaborationState()
    if (collabState.sessionId) {
      bindMonacoToYjs(editor, monaco, tab.path, tab.content).catch(() => {
        // Yjs binding failed — editor works locally as normal
      })
      // Track local cursor for awareness broadcast
      editor.onDidChangeCursorPosition((e) => {
        updateCursor(
          e.position.lineNumber,
          e.position.column,
        )
      })
    }

    // Sync cursor position and document symbols to the store for breadcrumbs
    const { setCursorInfo } = useEditorStore.getState()

    const refreshSymbols = async () => {
      try {
        const model = editor.getModel()
        if (!model) return
        const symbols: any[] = await (monaco as any).languages.getDocumentSymbols?.(model.uri, '')
          ?? await (editor as any).getContribution('editor.contrib.documentSymbols')?.getSymbols?.() ?? []
        const mapped: SymbolInfo[] = symbols.map((s: any) => ({
          name: s.name,
          kind: s.kind?.toString() || 'symbol',
          line: s.range?.startLineNumber ?? s.location?.range?.startLineNumber ?? 1,
        }))
        const line = editor.getPosition()?.lineNumber ?? 1
        setCursorInfo(line, mapped)
      } catch {
        // Symbol provider not available for this language — fallback to line only
        const line = editor.getPosition()?.lineNumber ?? 1
        setCursorInfo(line, [])
      }
    }

    // Debounce symbol refresh
    let symbolTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedRefreshSymbols = () => {
      if (symbolTimer) clearTimeout(symbolTimer)
      symbolTimer = setTimeout(refreshSymbols, 500)
    }    // Connect to LSP on mount (non-blocking)
    if (!lspClient.isConnected()) {
      lspClient.connect().then((ok) => {
        if (ok) console.log('[LSP] Language server connected')
      })
    }

    // Listen for LSP diagnostics and forward to Monaco
    lspClient.onDiagnostics((uri, lspDiags) => {
      const model = editor.getModel()
      if (!model || !uri.endsWith(model.uri.path)) return
      const mapped = lspDiags.map(d => ({
        line: d.range.start.line + 1,
        column: d.range.start.character,
        message: d.message,
        severity: (d.severity === 1 ? 'error' : d.severity === 2 ? 'warning' : 'info') as 'error' | 'warning' | 'info',
      }))
      // LSP diagnostics replace all markers for this source
      registerDiagnosticProvider(monaco, model, mapped)
    })

    // Refresh diagnostics (tree-sitter + code-intelligence + LSP)
    let diagnosticTimer: ReturnType<typeof setTimeout> | null = null
    const refreshDiagnostics = () => {
      if (diagnosticTimer) clearTimeout(diagnosticTimer)
      diagnosticTimer = setTimeout(async () => {
        const model = editor.getModel()
        if (!model) return
        const content = model.getValue()
        const lang = model.getLanguageId()
        const fileUri = `file:///${model.uri.path}`

        // Notify LSP of content change
        if (lspClient.isConnected()) {
          lspClient.didChange(fileUri, content, Date.now())
        }

        // 1. Code-intelligence diagnostics (unused vars, console.log, any type)
        const ciDiags = codeIntelligenceService.getDiagnostics(content, lang)
          .filter((d): d is typeof d & { severity: 'error' | 'warning' | 'info' } =>
            d.severity === 'error' || d.severity === 'warning' || d.severity === 'info'
          )
          .map(d => ({ line: d.line, column: d.column, message: d.message, severity: d.severity }))

        // 2. Tree-sitter parse errors from the Rust engine
        let tsDiags: Array<{ line: number; column: number; message: string; severity: string }> = []
        try {
          const api = (window as any).electronAPI
          if (api?.engineGetParseErrors) {
            const result = await api.engineGetParseErrors(content, lang)
            if (Array.isArray(result)) {
              tsDiags = result.map((e: any) => ({
                line: e.line || 1,
                column: e.column || 0,
                message: e.message || 'Syntax error',
                severity: 'error',
              }))
            }
          }
        } catch {
          // Engine not available — continue with code-intelligence diagnostics only
        }

        // 3. LSP diagnostics (if connected)
        let lspDiags: Array<{ line: number; column: number; message: string; severity: string }> = []
        if (lspClient.isConnected()) {
          try {
            const result = await lspClient.getDiagnostics(fileUri)
            lspDiags = result.map(d => ({
              line: d.range.start.line + 1,
              column: d.range.start.character,
              message: d.message,
              severity: d.severity === 1 ? 'error' : d.severity === 2 ? 'warning' : 'info',
            }))
          } catch {}
        }

        // Merge: LSP > tree-sitter > code-intelligence (priority order)
        const allDiags = [...lspDiags, ...tsDiags, ...ciDiags]
          .filter((d): d is typeof d & { severity: 'error' | 'warning' | 'info' } =>
            d.severity === 'error' || d.severity === 'warning' || d.severity === 'info'
          )

        registerDiagnosticProvider(monaco, model, allDiags)
      }, 300)
    }

    editor.onDidChangeCursorPosition((e) => {
      const line = e.position.lineNumber
      const currentSymbols = useEditorStore.getState().symbols
      setCursorInfo(line, currentSymbols)
    })

    // Refresh symbols and diagnostics when content changes (debounced)
    editor.onDidChangeModelContent(() => {
      debouncedRefreshSymbols()
      refreshDiagnostics()
    })

    // Initial symbol + diagnostic fetch
    refreshSymbols()
    refreshDiagnostics()

    // Format document shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run()
    })

    // Toggle block comment
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction('editor.action.blockComment')?.run()
    })

    // Duplicate line
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD, () => {
      editor.getAction('editor.action.copyLinesDownAction')?.run()
    })

    // Delete line
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
      editor.getAction('editor.action.deleteLines')?.run()
    })

    // Move line up/down
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.moveLinesUpAction')?.run()
    })
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.moveLinesDownAction')?.run()
    })

    // ── Multi-Cursor Shortcuts ──────────────────────────────────

    // Add cursor above/below
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.insertCursorAbove')?.run()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.insertCursorBelow')?.run()
    })

    // Add next occurrence to selection (Ctrl+D)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      editor.getAction('editor.action.addSelectionToNextFindMatch')?.run()
    })

    // Remove last cursor (Ctrl+Shift+D)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD, () => {
      const selections = editor.getSelections();
      if (selections && selections.length > 1) {
        editor.setSelections(selections.slice(0, -1));
      }
    })

    // Select all occurrences
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      editor.getAction('editor.action.selectHighlights')?.run()
    })

    // Toggle column selection mode (Ctrl+Shift+Alt+M)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyM, () => {
      setIsColumnSelectionMode(prev => !prev);
    })

    // Column selection up/down (Alt+Shift+Arrow)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.UpArrow, () => {
      const pos = editor.getPosition();
      const selections = editor.getSelections() || [];
      if (selections.length === 0 || !pos) return;
      const last = selections[selections.length - 1];
      const newLine = Math.max(1, pos.lineNumber - 1);
      const newSel = new monaco.Selection(newLine, last.startColumn, newLine, last.endColumn);
      editor.setSelections([...selections, newSel]);
    })
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.DownArrow, () => {
      const pos = editor.getPosition();
      const model = editor.getModel();
      const selections = editor.getSelections() || [];
      if (selections.length === 0 || !model || !pos) return;
      const last = selections[selections.length - 1];
      const newLine = Math.min(model.getLineCount(), pos.lineNumber + 1);
      const newSel = new monaco.Selection(newLine, last.startColumn, newLine, last.endColumn);
      editor.setSelections([...selections, newSel]);
    })

    // Escape: collapse to single cursor
    editor.addCommand(monaco.KeyCode.Escape, () => {
      const pos = editor.getPosition();
      const sels = editor.getSelections();
      if (pos && sels && sels.length > 1) {
        editor.setSelections([new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)]);
      }
    })

    // Track cursor count for toolbar
    editor.onDidChangeCursorSelection(() => {
      const sels = editor.getSelections();
      setCursorCount(sels ? sels.length : 1);
    })
    editor.onDidChangeCursorPosition(() => {
      const sels = editor.getSelections();
      setCursorCount(sels ? sels.length : 1);
    })

    // AI Inline Completion Provider
    const disposables: any[] = []
    const languages = ['typescript', 'tsx', 'javascript', 'rust', 'python', 'json', 'html', 'css']
    for (const lang of languages) {
      disposables.push(
        monaco.languages.registerInlineComplementProvider(lang, {
          provideInlineCompletions: async (model: any, position: any) => {
            const currentLine = model.getLineContent(position.lineNumber)
            const startLine = Math.max(1, position.lineNumber - 20)
            const endLine = Math.min(model.getLineCount(), position.lineNumber + 5)
            const surroundingCode = model.getValueInRange({
              startLineNumber: startLine, startColumn: 1,
              endLineNumber: endLine, endColumn: model.getLineMaxColumn(endLine),
            })

            const prompt = `Complete this code. Only output the completion text, no explanation.\n\nContext:\n\`\`\`${lang}\n${surroundingCode}\n\`\`\`\n\nComplete after: ${currentLine}`

            try {
              const response = await aiStreamingService.chat(
                [{ role: 'user', content: prompt }],
                { maxTokens: 150, temperature: 0.3 }
              )
              let completion = response.content.trim()
              completion = completion.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
              completion = completion.split('\n')[0]
              if (!completion || completion.length < 2) return { items: [] }
              return {
                items: [{
                  insertText: completion,
                  range: {
                    startLineNumber: position.lineNumber, startColumn: position.column,
                    endLineNumber: position.lineNumber, endColumn: position.column,
                  },
                }],
              }
            } catch { return { items: [] } }
          },
          freeInlineCompletions: () => {},
        })
      )
    }

    // Register AI-powered code actions (8 actions: quick fix, refactor, explain, test, etc.)
    registerAICodeActions(monaco, editor, async (prompt: string) => {
      // Stream through the AI chat panel
      try {
        const { aiStreamingService } = await import('../../services/aiStreamingService')
        const response = await aiStreamingService.sendMessage(prompt, {
          model: 'default',
          temperature: 0.3,
          maxTokens: 2000,
        })
        return response
      } catch {
        return 'AI service unavailable. Please configure an AI provider in Settings.'
      }
    })

    // Clear symbols, diagnostics, and LSP when editor is disposed
    editor.onDidDispose(() => {
      if (symbolTimer) clearTimeout(symbolTimer)
      if (diagnosticTimer) clearTimeout(diagnosticTimer)
      const fileUri = `file:///${editor.getModel()?.uri.path}`
      if (fileUri) lspClient.didClose(fileUri)
      setCursorInfo(1, [])
    })
  }

  const handleChange: OnChange = useCallback((value) => {
    if (value !== undefined) {
      updateTabContent(tab.id, value)
    }
  }, [tab.id, updateTabContent])

  // Format on save
  const handleSave = useCallback(() => {
    if (formatOnSave && editorRef.current && monacoRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run()
    }
  }, [formatOnSave])

  // Listen for Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  // Update editor options dynamically
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: { enabled: isMinimapEnabled },
        wordWrap,
        fontSize,
        tabSize,
        stickyScroll: { enabled: stickyScroll },
        breadcrumb: { enabled: showBreadcrumbs },
      })
    }
  }, [isMinimapEnabled, wordWrap, fontSize, tabSize, stickyScroll, showBreadcrumbs])

  return (
    <div className="h-full w-full relative">
      {/* Multi-cursor toolbar */}
      <MultiCursorToolbar
        editor={editorRef.current}
        monaco={monacoRef.current}
        cursorCount={cursorCount}
        isColumnSelectionMode={isColumnSelectionMode}
        onToggleColumnMode={() => setIsColumnSelectionMode(p => !p)}
      />

      {/* Editor controls bar */}
      <div className="absolute top-1 right-4 z-10 flex items-center gap-1">
        <button
          onClick={() => setIsMinimapEnabled(!isMinimapEnabled)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            isMinimapEnabled ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent' : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Toggle Minimap"
        >Mini</button>
        <button
          onClick={() => setWordWrap(w => w === 'off' ? 'on' : 'off')}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            wordWrap === 'on' ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent' : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Toggle Word Wrap"
        >Wrap</button>
        <button
          onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            showBreadcrumbs ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent' : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Toggle Breadcrumbs"
        >Path</button>
        <button
          onClick={() => setStickyScroll(!stickyScroll)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            stickyScroll ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent' : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Toggle Sticky Scroll"
        >Sticky</button>
        <select
          value={fontSize}
          onChange={e => setFontSize(Number(e.target.value))}
          className="px-1 py-0.5 text-[10px] bg-ide-surface border border-ide-border rounded text-ide-text-muted"
          title="Font Size"
        >
          {[12, 13, 14, 15, 16, 18, 20].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <select
          value={tabSize}
          onChange={e => setTabSize(Number(e.target.value))}
          className="px-1 py-0.5 text-[10px] bg-ide-surface border border-ide-border rounded text-ide-text-muted"
          title="Tab Size"
        >
          {[2, 4, 8].map(s => <option key={s} value={s}>Tab {s}</option>)}
        </select>
        <button
          onClick={() => setFormatOnSave(!formatOnSave)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            formatOnSave ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Format on Save"
        >Save+</button>
      </div>

      <Editor
        height="100%"
        language={tab.language}
        value={tab.content}
        theme="idexal-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira FaCode', 'Cascadia FaCode', monospace",
          fontLigatures: true,
          lineHeight: 24,
          padding: { top: 12, bottom: 12 },
          minimap: {
            enabled: isMinimapEnabled,
            maxColumn: 80,
            renderCharacters: false,
            showSlider: 'mouseover',
          },
          wordWrap,
          tabSize,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
            verticalSliderSize: 10,
          },
          renderLineHighlight: 'all',
          renderWhitespace: 'selection',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            bracketPairsHorizontal: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          contextmenu: true,
          mouseWheelZoom: true,
          links: true,
          colorDecorators: true,
          inlineSuggest: { enabled: true },
          quickSuggestions: true,
          formatOnPaste: true,
          formatOnType: false,
          autoIndent: 'full',
          insertSpaces: true,
          renderLineHighlightOnlyWhenFocus: false,
          occurrencesHighlight: 'singleFile',
          selectionHighlight: true,
          automaticLayout: true,
          stickyScroll: { enabled: stickyScroll },
          multiCursorModifier: 'ctrlCmd',
          multiCursorMergeOverlapping: true,
          multiCursorPaste: 'full',
          columnSelection: true,
          suggest: {
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: true,
            preview: true,
          },
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-ide-editor">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-ide-accent border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-ide-text-muted">Loading editor...</div>
            </div>
          </div>
        }
      />
    </div>
  )
}
