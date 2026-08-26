import React, { useState, useCallback, useEffect } from 'react';

export interface CursorInfo {
  lineNumber: number;
  column: number;
}

export type MultiCursorMode = 'normal' | 'column' | 'add-cursor';

interface MultiCursorToolbarProps {
  editor: any;
  monaco: any;
  cursorCount: number;
  isColumnSelectionMode: boolean;
  onToggleColumnMode: () => void;
}

export function MultiCursorToolbar({
  editor,
  monaco,
  cursorCount,
  isColumnSelectionMode,
  onToggleColumnMode,
}: MultiCursorToolbarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [selectionWidth, setSelectionWidth] = useState<number | null>(null);

  // Track column selection width
  useEffect(() => {
    if (!editor) return;
    const disposable = editor.onDidChangeCursorSelection((e: any) => {
      if (isColumnSelectionMode && e.selection) {
        const sel = e.selection;
        if (sel.startColumn !== sel.endColumn) {
          setSelectionWidth(Math.abs(sel.endColumn - sel.startColumn));
        }
      }
    });
    return () => disposable?.dispose();
  }, [editor, isColumnSelectionMode]);

  const addCursorAbove = useCallback(() => {
    editor?.getAction('editor.action.insertCursorAbove')?.run();
  }, [editor]);

  const addCursorBelow = useCallback(() => {
    editor?.getAction('editor.action.insertCursorBelow')?.run();
  }, [editor]);

  const selectNextOccurrence = useCallback(() => {
    editor?.getAction('editor.action.addSelectionToNextFindMatch')?.run();
  }, [editor]);

  const selectAllOccurrences = useCallback(() => {
    editor?.getAction('editor.action.selectHighlights')?.run();
  }, [editor]);

  const selectAllWithSameWord = useCallback(() => {
    editor?.getAction('editor.action.changeAll')?.run();
  }, [editor]);

  const removeLastCursor = useCallback(() => {
    if (!editor || !monaco) return;
    const selections = editor.getSelections();
    if (selections && selections.length > 1) {
      editor.setSelections(selections.slice(0, -1));
    }
  }, [editor, monaco]);

  const removeAllExtraCursors = useCallback(() => {
    if (!editor) return;
    const pos = editor.getPosition();
    if (pos) {
      editor.setSelections([new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)]);
    }
  }, [editor, monaco]);

  const switchToColumnMode = useCallback(() => {
    if (!editor || !monaco) return;
    // Enable column selection via Alt+Shift+Arrow
    // Monaco supports this natively when multiCursorModifier is set
    const pos = editor.getPosition();
    if (pos) {
      // Create a column selection from cursor position
      editor.setSelection(new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column));
    }
    onToggleColumnMode();
  }, [editor, monaco, onToggleColumnMode]);

  if (cursorCount <= 1) return null;

  return (
    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/95 border border-zinc-700/50 shadow-lg backdrop-blur-sm transition-all duration-200">
        {/* Cursor count badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[11px] font-medium text-blue-300">
            {cursorCount} cursors
          </span>
        </div>

        {isColumnSelectionMode && selectionWidth !== null && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30">
            <span className="text-[11px] text-purple-300">Col: {selectionWidth}</span>
          </div>
        )}

        <div className="w-px h-4 bg-zinc-600" />

        <ToolbarButton onClick={addCursorAbove} title="Add cursor above (Ctrl+Alt+↑)" icon="↑+" />
        <ToolbarButton onClick={addCursorBelow} title="Add cursor below (Ctrl+Alt+↓)" icon="↓+" />
        <ToolbarButton onClick={selectNextOccurrence} title="Add next occurrence (Ctrl+D)" icon="D+" />
        <ToolbarButton onClick={selectAllOccurrences} title="Select all occurrences (Ctrl+Shift+L)" icon="All" />

        <div className="w-px h-4 bg-zinc-600" />

        <button
          onClick={switchToColumnMode}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            isColumnSelectionMode
              ? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
              : 'bg-zinc-700/50 border-zinc-600/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
          }`}
          title="Column Selection Mode (Ctrl+Shift+Alt+M)"
        >Col</button>

        <div className="w-px h-4 bg-zinc-600" />

        <ToolbarButton onClick={removeLastCursor} title="Remove last cursor" icon="-1" danger />
        <ToolbarButton onClick={removeAllExtraCursors} title="Collapse to single cursor" icon="1" danger />

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="px-1 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 rounded transition-colors"
          title="Multi-cursor shortcuts"
        >?</button>
      </div>

      {/* Help tooltip */}
      {showHelp && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 p-3 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl w-80">
          <h4 className="text-xs font-semibold text-zinc-200 mb-2">Multi-Cursor Shortcuts</h4>
          <div className="grid grid-cols-1 gap-1 text-[11px]">
            <ShortcutRow keys="Ctrl+Click" desc="Add cursor at click position" />
            <ShortcutRow keys="Ctrl+Alt+↑/↓" desc="Add cursor above/below" />
            <ShortcutRow keys="Ctrl+D" desc="Add next occurrence to selection" />
            <ShortcutRow keys="Ctrl+Shift+D" desc="Remove last cursor" />
            <ShortcutRow keys="Ctrl+Shift+L" desc="Select all occurrences" />
            <ShortcutRow keys="Ctrl+Shift+Alt+M" desc="Toggle column selection" />
            <ShortcutRow keys="Alt+Shift+↑/↓" desc="Column selection up/down" />
            <ShortcutRow keys="Alt+Shift+Drag" desc="Column select with mouse" />
            <ShortcutRow keys="Esc" desc="Collapse to single cursor" />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  icon,
  danger = false,
}: {
  onClick: () => void;
  title: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
        danger
          ? 'bg-zinc-700/50 border-zinc-600/50 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
          : 'bg-zinc-700/50 border-zinc-600/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
      }`}
    >
      {icon}
    </button>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <kbd className="px-1.5 py-0.5 rounded bg-zinc-700 border border-zinc-600 text-zinc-300 font-mono text-[10px]">
        {keys}
      </kbd>
      <span className="text-zinc-400 text-[11px]">{desc}</span>
    </div>
  );
}
