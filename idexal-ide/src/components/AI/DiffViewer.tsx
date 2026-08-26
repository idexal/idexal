import React, { useState, useCallback, useMemo } from 'react';

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

interface FileDiff {
  filePath: string;
  language?: string;
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
}

interface DiffViewerProps {
  diffs: FileDiff[];
  onApply?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
  onApplyAll?: () => void;
  onRejectAll?: () => void;
}

function parseDiffToLines(oldContent: string, newContent: string, filePath: string): FileDiff {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const lines: DiffLine[] = [];
  let added = 0, removed = 0;

  // Simple line-by-line diff (LCS-based would be better but this is sufficient)
  const maxLen = Math.max(oldLines.length, newLines.length);
  let oldIdx = 0, newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        lines.push({
          type: 'context',
          content: oldLines[oldIdx],
          oldLineNum: oldIdx + 1,
          newLineNum: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      } else {
        // Look ahead to find if old line appears later
        const oldSearch = oldLines.indexOf(newLines[newIdx], oldIdx);
        const newSearch = newLines.indexOf(oldLines[oldIdx], newIdx);

        if (oldSearch === -1 || (newSearch !== -1 && newSearch < oldSearch)) {
          // Old line was removed
          lines.push({
            type: 'remove',
            content: oldLines[oldIdx],
            oldLineNum: oldIdx + 1,
          });
          removed++;
          oldIdx++;
        } else {
          // New line was added
          lines.push({
            type: 'add',
            content: newLines[newIdx],
            newLineNum: newIdx + 1,
          });
          added++;
          newIdx++;
        }
      }
    } else if (oldIdx < oldLines.length) {
      lines.push({
        type: 'remove',
        content: oldLines[oldIdx],
        oldLineNum: oldIdx + 1,
      });
      removed++;
      oldIdx++;
    } else {
      lines.push({
        type: 'add',
        content: newLines[newIdx],
        newLineNum: newIdx + 1,
      });
      added++;
      newIdx++;
    }
  }

  const ext = filePath.split('.').pop() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', css: 'css', html: 'html',
  };

  return {
    filePath,
    language: langMap[ext] || ext,
    lines,
    addedCount: added,
    removedCount: removed,
  };
}

function DiffLineComponent({ line, isSelected }: { line: DiffLine; isSelected?: boolean }) {
  const bgColor = line.type === 'add'
    ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
    : line.type === 'remove'
    ? 'bg-red-500/10 border-l-2 border-red-500'
    : 'bg-transparent border-l-2 border-transparent';

  const lineNumColor = line.type === 'add'
    ? 'text-emerald-400'
    : line.type === 'remove'
    ? 'text-red-400'
    : 'text-zinc-500';

  return (
    <div className={`flex font-mono text-xs leading-5 ${bgColor} ${isSelected ? 'ring-1 ring-blue-500/30' : ''}`}>
      <span className={`w-12 text-right pr-2 select-none shrink-0 ${lineNumColor}`}>
        {line.oldLineNum || ''}
      </span>
      <span className={`w-12 text-right pr-2 select-none shrink-0 ${lineNumColor}`}>
        {line.newLineNum || ''}
      </span>
      <span className={`w-6 text-center select-none shrink-0 ${lineNumColor}`}>
        {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
      </span>
      <span className="flex-1 pr-4 whitespace-pre overflow-x-auto">
        {line.content || ' '}
      </span>
    </div>
  );
}

function FileDiffCard({
  diff,
  onApply,
  onReject,
}: {
  diff: FileDiff;
  onApply?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [applied, setApplied] = useState(false);
  const [rejected, setRejected] = useState(false);

  const handleApply = () => {
    setApplied(true);
    setRejected(false);
    onApply?.(diff.filePath);
  };

  const handleReject = () => {
    setRejected(true);
    setApplied(false);
    onReject?.(diff.filePath);
  };

  return (
    <div className="border border-zinc-700/50 rounded-lg overflow-hidden bg-zinc-900/50 transition-all duration-200">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 cursor-pointer hover:bg-zinc-800/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm">{expanded ? '▾' : '▸'}</span>
          <span className="text-zinc-200 text-sm font-mono">{diff.filePath}</span>
          <span className="text-zinc-500 text-xs">({diff.language})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 text-xs">+{diff.addedCount}</span>
          <span className="text-red-400 text-xs">-{diff.removedCount}</span>
          {!applied && !rejected && (
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleApply(); }}
                className="px-2 py-0.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
              >
                ✓ Apply
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReject(); }}
                className="px-2 py-0.5 text-xs bg-zinc-600 hover:bg-zinc-500 text-zinc-300 rounded transition-colors"
              >
                ✗ Reject
              </button>
            </div>
          )}
          {applied && (
            <span className="text-emerald-400 text-xs font-medium">✓ Applied</span>
          )}
          {rejected && (
            <span className="text-zinc-500 text-xs font-medium">✗ Rejected</span>
          )}
        </div>
      </div>

      {/* Diff content */}
      {expanded && (
        <div className="overflow-hidden transition-all duration-200">
          <div className="max-h-80 overflow-y-auto bg-zinc-950/50">
            {diff.lines.map((line, i) => (
              <DiffLineComponent
                key={i}
                line={line}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DiffViewer({
  diffs,
  onApply,
  onReject,
  onApplyAll,
  onRejectAll,
}: DiffViewerProps) {
  const totalAdded = diffs.reduce((sum, d) => sum + d.addedCount, 0);
  const totalRemoved = diffs.reduce((sum, d) => sum + d.removedCount, 0);

  if (diffs.length === 0) {
    return (
      <div className="text-zinc-500 text-sm p-4 text-center">
        No changes to display
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-400">
            {diffs.length} file{diffs.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-emerald-400">+{totalAdded}</span>
          <span className="text-red-400">-{totalRemoved}</span>
        </div>
        <div className="flex gap-2">
          {onApplyAll && (
            <button
              onClick={onApplyAll}
              className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
            >
              ✓ Apply All
            </button>
          )}
          {onRejectAll && (
            <button
              onClick={onRejectAll}
              className="px-3 py-1 text-xs bg-zinc-600 hover:bg-zinc-500 text-zinc-300 rounded font-medium transition-colors"
            >
              ✗ Reject All
            </button>
          )}
        </div>
      </div>

      {/* File diffs */}
      {diffs.map((diff) => (
        <FileDiffCard
          key={diff.filePath}
          diff={diff}
          onApply={(fp) => onApply?.(fp)}
          onReject={(fp) => onReject?.(fp)}
        />
      ))}
    </div>
  );
}

export { parseDiffToLines };
export type { DiffLine, FileDiff, DiffViewerProps };
