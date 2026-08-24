import React, { useRef, useEffect, useState } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import { useEditorStore, Tab } from '../../stores/editorStore'
import { aiStreamingService } from '../../services/aiStreamingService'

interface MonacoEditorProps {
  tab: Tab
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
    'input.background': '#0d1117',
    'input.border': '#30363d',
    'input.foreground': '#c9d1d9',
    'focusBorder': '#58a6ff',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#484f5840',
    'scrollbarSlider.hoverBackground': '#484f5880',
    'scrollbarSlider.activeBackground': '#484f58b0',
    'minimap.background': '#0d1117',
    'minimap.selectionHighlight': '#264f7860',
  },
}

export default function MonacoEditor({ tab }: MonacoEditorProps) {
  const { updateTabContent } = useEditorStore()
  const editorRef = useRef<any>(null)
  const [isMinimapEnabled, setIsMinimapEnabled] = useState(true)
  const [wordWrap, setWordWrap] = useState<'off' | 'on'>('off')
  const themeDefined = useRef(false)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Define custom theme only once
    if (!themeDefined.current) {
      monaco.editor.defineTheme('idexal-dark', IDEXAL_THEME as any)
      themeDefined.current = true
    }
    monaco.editor.setTheme('idexal-dark')

    // Focus editor
    editor.focus()

    // Add custom keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run()
    })

    // AI Inline Completion Provider (ghost text)
    monaco.languages.registerInlineComplementProvider({ language: '*' })
    monaco.languages.registerInlineComplementProvider({ language: 'typescript' })
    monaco.languages.registerInlineComplementProvider({ language: 'tsx' })
    monaco.languages.registerInlineComplementProvider({ language: 'javascript' })
    monaco.languages.registerInlineComplementProvider({ language: 'rust' })
    monaco.languages.registerInlineComplementProvider({ language: 'python' })

    const disposables: any[] = []
    const languages = ['typescript', 'tsx', 'javascript', 'rust', 'python']
    for (const lang of languages) {
      disposables.push(
        monaco.languages.registerInlineComplementProvider(lang, {
          provideInlineCompletions: async (model: any, position: any) => {
            // Get context: current line and surrounding lines
            const currentLine = model.getLineContent(position.lineNumber)
            const startLine = Math.max(1, position.lineNumber - 20)
            const endLine = Math.min(model.getLineCount(), position.lineNumber + 5)
            const surroundingCode = model.getValueInRange({
              startLineNumber: startLine,
              startColumn: 1,
              endLineNumber: endLine,
              endColumn: model.getLineMaxColumn(endLine),
            })

            // Build prompt for AI
            const prompt = `Complete this code. Only output the completion text, no explanation.\n\nContext:\n\`\`\`${lang}\n${surroundingCode}\n\`\`\`\n\nComplete after: ${currentLine}`

            try {
              const response = await aiStreamingService.chat(
                [{ role: 'user', content: prompt }],
                { maxTokens: 150, temperature: 0.3 }
              )

              // Extract code from response
              let completion = response.content.trim()
              // Remove markdown code block markers
              completion = completion.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
              // Only take first line or up to semicolon
              completion = completion.split('\n')[0]

              if (!completion || completion.length < 2) return { items: [] }

              return {
                items: [{
                  insertText: completion,
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                }],
              }
            } catch {
              return { items: [] }
            }
          },
          freeInlineCompletions: () => {},
        })
      )
    }
  }

  const handleChange: OnChange = (value) => {
    if (value !== undefined) {
      updateTabContent(tab.id, value)
    }
  }

  // Toggle minimap
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ minimap: { enabled: isMinimapEnabled } })
    }
  }, [isMinimapEnabled])

  // Toggle word wrap
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap })
    }
  }, [wordWrap])

  return (
    <div className="h-full w-full relative">
      {/* Editor controls bar */}
      <div className="absolute top-1 right-4 z-10 flex items-center gap-1">
        <button
          onClick={() => setIsMinimapEnabled(!isMinimapEnabled)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            isMinimapEnabled
              ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent'
              : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Toggle Minimap"
        >
          Minimap
        </button>
        <button
          onClick={() => setWordWrap(w => w === 'off' ? 'on' : 'off')}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            wordWrap === 'on'
              ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent'
              : 'bg-ide-surface border-ide-border text-ide-text-muted hover:text-ide-text'
          }`}
          title="Toggle Word Wrap"
        >
          Wrap
        </button>
      </div>

      <Editor
        height="100%"
        language={tab.language}
        value={tab.content}
        theme="idexal-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
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
          formatOnType: true,
          autoIndent: 'full',
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlightOnlyWhenFocus: false,
          occurrencesHighlight: 'singleFile',
          selectionHighlight: true,
          automaticLayout: true,
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
