import React, { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorStore, Tab } from '../../stores/editorStore'

interface MonacoEditorProps {
  tab: Tab
}

export default function MonacoEditor({ tab }: MonacoEditorProps) {
  const { updateTabContent } = useEditorStore()
  const editorRef = useRef<any>(null)
  
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Define custom theme
    monaco.editor.defineTheme('freebuff-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'ffa657' },
        { token: 'operator', foreground: 'ff7b72' },
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
      },
    })
    
    monaco.editor.setTheme('freebuff-dark')
    
    // Focus editor
    editor.focus()
  }
  
  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      updateTabContent(tab.id, value)
    }
  }
  
  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={tab.language}
        value={tab.content}
        theme="freebuff-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineHeight: 24,
          padding: { top: 16 },
          minimap: { enabled: true, maxColumn: 80 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
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
          },
          quickSuggestions: true,
          formatOnPaste: true,
          formatOnType: true,
          autoIndent: 'full',
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-ide-editor">
            <div className="text-ide-text-muted">Loading editor...</div>
          </div>
        }
      />
    </div>
  )
}
