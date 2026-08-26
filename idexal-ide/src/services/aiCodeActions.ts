/**
 * AI Code Actions for Monaco Editor
 * Provides inline actions: quick fix, refactor, explain, test, document
 */

import type { editor } from 'monaco-editor';

export interface AICodeAction {
  id: string;
  label: string;
  kind: string;
  description: string;
  icon: string;
  apply: (editor: editor.IStandaloneCodeEditor) => Promise<void>;
}

export interface AIActionResult {
  originalCode: string;
  suggestedCode: string;
  explanation: string;
  confidence: number;
}

// ── Action definitions ──────────────────────────────
const AI_ACTIONS: Omit<AICodeAction, 'apply'>[] = [
  {
    id: 'ai.quickfix',
    label: 'Quick Fix (AI)',
    kind: 'quickfix',
    description: 'Automatically fix code issues',
    icon: '🩹',
  },
  {
    id: 'ai.refactor',
    label: 'Refactor (AI)',
    kind: 'refactor',
    description: 'Improve code structure and readability',
    icon: '♻️',
  },
  {
    id: 'ai.explain',
    label: 'Explain Code (AI)',
    kind: 'info',
    description: 'Get an explanation of the selected code',
    icon: '💡',
  },
  {
    id: 'ai.test',
    label: 'Generate Test (AI)',
    kind: 'test',
    description: 'Generate unit tests for the code',
    icon: '🧪',
  },
  {
    id: 'ai.document',
    label: 'Add Documentation (AI)',
    kind: 'documentation',
    description: 'Generate JSDoc/docstring comments',
    icon: '📚',
  },
  {
    id: 'ai.optimize',
    label: 'Optimize (AI)',
    kind: 'performance',
    description: 'Suggest performance optimizations',
    icon: '⚡',
  },
  {
    id: 'ai.security',
    label: 'Security Review (AI)',
    kind: 'security',
    description: 'Check for security vulnerabilities',
    icon: '🔒',
  },
  {
    id: 'ai.simplify',
    label: 'Simplify (AI)',
    kind: 'refactor',
    description: 'Reduce complexity and line count',
    icon: '✂️',
  },
];

// ── Language detection ──────────────────────────────
function detectLanguage(editor: editor.IStandaloneCodeEditor): string {
  const model = editor.getModel();
  if (!model) return 'unknown';
  const lang = model.getLanguageId();
  return lang;
}

// ── Get editor context ──────────────────────────────
function getEditorContext(editor: editor.IStandaloneCodeEditor): {
  selectedText: string;
  fullCode: string;
  language: string;
  fileName: string;
  cursorPosition: { line: number; column: number };
  surroundingLines: string;
} {
  const selection = editor.getSelection();
  const model = editor.getModel();
  const language = detectLanguage(editor);

  let selectedText = '';
  let fullCode = '';
  let surroundingLines = '';

  if (model && selection) {
    selectedText = model.getValueInRange(selection);
    fullCode = model.getValue();

    // Get 10 lines around cursor for context
    const startLine = Math.max(1, selection.startLineNumber - 5);
    const endLine = Math.min(model.getLineCount(), selection.endLineNumber + 5);
    surroundingLines = model.getValueInRange({
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine),
    });
  }

  const cursorPosition = selection
    ? { line: selection.startLineNumber, column: selection.startColumn }
    : { line: 1, column: 1 };

  return {
    selectedText,
    fullCode,
    language,
    fileName: model?.uri.toString() || 'untitled',
    cursorPosition,
    surroundingLines,
  };
}

// ── Build AI prompt for each action ──────────────────
function buildPrompt(
  actionId: string,
  context: ReturnType<typeof getEditorContext>
): string {
  const { selectedText, surroundingLines, language, fileName } = context;
  const code = selectedText || surroundingLines;

  switch (actionId) {
    case 'ai.quickfix':
      return `Analyze this ${language} code and fix any bugs, errors, or issues. Return ONLY the fixed code with brief comments explaining each fix:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.refactor':
      return `Refactor this ${language} code for better readability, maintainability, and following best practices. Return ONLY the refactored code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.explain':
      return `Explain this ${language} code in detail. Cover: what it does, how it works, key patterns used, and any edge cases. Be clear and thorough:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.test':
      return `Generate comprehensive unit tests for this ${language} code. Include edge cases, error paths, and happy paths. Use the testing framework appropriate for ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.document':
      return `Add comprehensive documentation comments (JSDoc/docstrings) to this ${language} code. Document parameters, return values, exceptions, and usage examples:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.optimize':
      return `Analyze this ${language} code for performance issues and suggest optimizations. Return the optimized code with explanations:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.security':
      return `Perform a security review of this ${language} code. Check for: injection, XSS, path traversal, secret exposure, unsafe operations. List findings and fix them:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case 'ai.simplify':
      return `Simplify this ${language} code. Reduce complexity, remove redundancy, and make it more concise while maintaining functionality:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    default:
      return `Process this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  }
}

// ── Register AI actions with Monaco ──────────────────
export function registerAICodeActions(
  monaco: typeof import('monaco-editor'),
  editor: editor.IStandaloneCodeEditor,
  aiCallback?: (prompt: string) => Promise<string>
): void {
  // Register action provider
  monaco.languages.registerCodeActionProvider('*', {
    provideCodeActions: (model, range, context) => {
      const actions = AI_ACTIONS.map((action) => ({
        title: `${action.icon} ${action.label}`,
        kind: action.kind,
        command: {
          id: action.id,
          title: action.label,
        },
        isPreferred: action.kind === 'quickfix',
      }));

      return {
        actions,
        dispose: () => {},
      };
    },
  });

  // Register each action
  AI_ACTIONS.forEach((actionDef) => {
    editor.addAction({
      id: actionDef.id,
      label: actionDef.label,
      keybindings: getKeybinding(actionDef.id),
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 1.5,
      run: async (ed) => {
        const standalone = ed as editor.IStandaloneCodeEditor;
        const context = getEditorContext(standalone);
        const prompt = buildPrompt(actionDef.id, context);

        // Show in-chat if callback provided
        if (aiCallback) {
          const result = await aiCallback(prompt);
          showResultInEditor(standalone, actionDef.id, result, context);
        } else {
          // Fallback: copy prompt to clipboard and notify
          await navigator.clipboard.writeText(prompt);
          showNotification(`${actionDef.icon} ${actionDef.label} prompt copied to clipboard`);
        }
      },
    });
  });
}

// ── Keybindings ─────────────────────────────────────
function getKeybinding(actionId: string): number[] | undefined {
  const mod = navigator.platform.includes('Mac')
    ? 256 // Cmd
    : 2048; // Ctrl

  switch (actionId) {
    case 'ai.quickfix':
      return [mod | 88]; // Ctrl/Cmd + .
    case 'ai.explain':
      return [mod | 2048 | 19]; // Ctrl/Cmd + Shift + I
    case 'ai.refactor':
      return [mod | 2048 | 52]; // Ctrl/Cmd + Shift + R
    case 'ai.test':
      return [mod | 2048 | 84]; // Ctrl/Cmd + Shift + T
    default:
      return undefined;
  }
}

// ── Show result in editor ───────────────────────────
function showResultInEditor(
  ed: editor.IStandaloneCodeEditor,
  actionId: string,
  result: string,
  context: ReturnType<typeof getEditorContext>
): void {
  const model = ed.getModel();
  if (!model) return;

  // For code-generating actions, replace selection
  if (['ai.quickfix', 'ai.refactor', 'ai.optimize', 'ai.simplify'].includes(actionId)) {
    const selection = ed.getSelection();
    if (selection && !selection.isEmpty()) {
      // Extract code block from result if present
      const codeMatch = result.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const codeToInsert = codeMatch ? codeMatch[1].trim() : result;

      ed.executeEdits('ai-code-action', [
        {
          range: selection,
          text: codeToInsert,
        },
      ]);
    }
  }

  // For explanation/documentation, insert as comment above
  if (['ai.explain', 'ai.document', 'ai.security'].includes(actionId)) {
    const comment = formatAsComment(result, context.language);
    const position = { lineNumber: context.cursorPosition.line, column: 1 };

    ed.executeEdits('ai-code-action', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: 1,
        },
        text: comment + '\n',
      },
    ]);
  }

  // For test generation, append at end of file
  if (actionId === 'ai.test') {
    const lastLine = model.getLineCount();
    const lastCol = model.getLineMaxColumn(lastLine);

    ed.executeEdits('ai-code-action', [
      {
        range: {
          startLineNumber: lastLine,
          startColumn: lastCol,
          endLineNumber: lastLine,
          endColumn: lastCol,
        },
        text: '\n\n' + result,
      },
    ]);
  }

  showNotification(`✅ AI action completed: ${actionId}`);
}

// ── Format as language-appropriate comment ───────────
function formatAsComment(text: string, language: string): string {
  const singleLineComment = ['javascript', 'typescript', 'rust', 'go', 'java', 'c', 'cpp', 'swift'].includes(language)
    ? '//'
    : language === 'python'
    ? '#'
    : language === 'html'
    ? '<!--'
    : '//';

  if (singleLineComment === '<!--') {
    return '<!--\n' + text.split('\n').map((l) => ' ' + l).join('\n') + '\n-->';
  }

  return text
    .split('\n')
    .map((line) => `${singleLineComment} ${line}`)
    .join('\n');
}

// ── Simple notification ─────────────────────────────
function showNotification(message: string): void {
  // Dispatch a custom event that the UI can handle
  window.dispatchEvent(
    new CustomEvent('ai-notification', {
      detail: { message, type: 'success' },
    })
  );
}

// ── Export for use ──────────────────────────────────
export { AI_ACTIONS, buildPrompt, getEditorContext };
