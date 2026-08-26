/**
 * Multi-File Search & Replace Panel
 * Project-wide search with regex, file filters, and inline replace
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FaSearch, FaCode, FaChevronDown, FaChevronRight, FaCopy, FaArrowRight, FaTimes, FaFilter, FaFileAlt, FaFolder, FaFolderOpen, FaCheck, FaExclamationCircle
} from '../Icon';

interface SearchResult {
  file: string;
  line: number;
  column: number;
  text: string;
  context: string; // surrounding lines
  matchStart: number;
  matchEnd: number;
}

interface FileResult {
  path: string;
  matches: SearchResult[];
  expanded: boolean;
}

interface SearchOptions {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  includePattern: string;  // e.g. "*.ts,*.tsx"
  excludePattern: string;  // e.g. "node_modules,*.test.*"
}

export default function MultiFileSearch() {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    regex: false,
    caseSensitive: false,
    wholeWord: false,
    includePattern: '',
    excludePattern: 'node_modules,dist,*.min.*,.git',
  });
  const [results, setResults] = useState<FileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [replacedCount, setReplacedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Search execution ────────────────────────────
  const executeSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setSearching(true);
    try {
      // Build regex from query
      let regex: RegExp;
      try {
        const flags = options.caseSensitive ? 'g' : 'gi';
        regex = options.regex
          ? new RegExp(query, flags)
          : new RegExp(escapeRegex(query), flags);
      } catch {
        setResults([]);
        setTotalMatches(0);
        setSearching(false);
        return;
      }

      // Add word boundaries if wholeWord
      if (options.wholeWord && !options.regex) {
        regex = new RegExp(`\\b${regex.source}\\b`, options.caseSensitive ? 'g' : 'gi');
      }

      // Request search from Electron main process
      const searchResults: FileResult[] = await (window as any).electronAPI?.projectSearch?.({
        query,
        regex: regex.source,
        include: options.includePattern,
        exclude: options.excludePattern,
      }) || [];

      setResults(searchResults);
      const total = searchResults.reduce((sum, f) => sum + f.matches.length, 0);
      setTotalMatches(total);
      setCurrentMatch(0);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setTotalMatches(0);
    } finally {
      setSearching(false);
    }
  }, [query, options]);

  // ── Keyboard shortcut ───────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        executeSearch();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [executeSearch]);

  // ── Toggle file expand ──────────────────────────
  const toggleFile = (path: string) => {
    setResults((prev) =>
      prev.map((f) => (f.path === path ? { ...f, expanded: !f.expanded } : f))
    );
  };

  // ── Copy all results ────────────────────────────
  const copyResults = () => {
    const text = results
      .flatMap((f) =>
        f.matches.map((m) => `${f.path}:${m.line}:${m.column}: ${m.text.trim()}`)
      )
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  // ── Replace all in file ─────────────────────────
  const replaceAllInFile = async (filePath: string) => {
    if (!replaceText && replaceText !== '') return;
    await (window as any).electronAPI?.replaceInFile?.({
      path: filePath,
      search: query,
      replace: replaceText,
      regex: options.regex,
      caseSensitive: options.caseSensitive,
      wholeWord: options.wholeWord,
    });
    setReplacedCount((c) => c + 1);
    executeSearch(); // Re-search
  };

  // ── Replace all in project ──────────────────────
  const replaceAllInProject = async () => {
    if (!replaceText && replaceText !== '') return;
    for (const file of results) {
      await replaceAllInFile(file.path);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary, #0d1117)', color: 'var(--text-primary, #e6edf3)',
      fontFamily: 'var(--font-ui, system-ui)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #30363d)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FaSearch size={14} />
          <span style={{ fontWeight: 600, fontSize: 12 }}>Search in Files</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #8b949e)' }}>
            {'Ctrl+Shift+F'}
          </span>
        </div>

        {/* ── Search input ── */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
            borderRadius: 4, padding: '4px 8px', gap: 4,
          }}>
            <FaSearch size={12} style={{ color: 'var(--text-secondary, #8b949e)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pattern..."
              style={{
                flex: 1, background: 'none', border: 'none', color: 'inherit',
                fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono, monospace)',
              }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }}>
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {/* ── Option toggles ── */}
          <OptBtn active={options.regex} onClick={() => setOptions(o => ({...o, regex: !o.regex}))} title="Regex">
            <FaCode size={12} />
          </OptBtn>
          <OptBtn active={options.caseSensitive} onClick={() => setOptions(o => ({...o, caseSensitive: !o.caseSensitive}))} title="Match Case">
            <FaCode size={12} />
          </OptBtn>
          <OptBtn active={options.wholeWord} onClick={() => setOptions(o => ({...o, wholeWord: !o.wholeWord}))} title="Whole Word">
            <FaCode size={12} />
          </OptBtn>
          <OptBtn active={showReplace} onClick={() => setShowReplace(!showReplace)} title="Toggle Replace">
            <FaCode size={12} />
          </OptBtn>
        </div>

        {/* ── Replace input ── */}
        {showReplace && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
              borderRadius: 4, padding: '4px 8px', gap: 4,
            }}>
              <FaCode size={12} style={{ color: 'var(--text-secondary, #8b949e)' }} />
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with..."
                style={{
                  flex: 1, background: 'none', border: 'none', color: 'inherit',
                  fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono, monospace)',
                }}
              />
            </div>
            <button onClick={replaceAllInProject}
              style={{
                background: 'rgba(88,166,255,0.15)', border: 'none', color: 'var(--accent, #58a6ff)',
                borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
              }}>
              Replace All
            </button>
          </div>
        )}

        {/* ── File filters ── */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
            borderRadius: 4, padding: '3px 8px', gap: 4,
          }}>
            <FaFilter size={10} style={{ color: 'var(--text-secondary, #8b949e)' }} />
            <input
              type="text"
              value={options.includePattern}
              onChange={(e) => setOptions(o => ({...o, includePattern: e.target.value}))}
              placeholder="Include: *.ts, *.tsx"
              style={{
                flex: 1, background: 'none', border: 'none', color: 'inherit',
                fontSize: 11, outline: 'none', fontFamily: 'var(--font-mono, monospace)',
              }}
            />
          </div>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
            borderRadius: 4, padding: '3px 8px', gap: 4,
          }}>
            <FaTimes size={10} style={{ color: 'var(--text-secondary, #8b949e)' }} />
            <input
              type="text"
              value={options.excludePattern}
              onChange={(e) => setOptions(o => ({...o, excludePattern: e.target.value}))}
              placeholder="Exclude: node_modules"
              style={{
                flex: 1, background: 'none', border: 'none', color: 'inherit',
                fontSize: 11, outline: 'none', fontFamily: 'var(--font-mono, monospace)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Results summary ── */}
      {totalMatches > 0 && (
        <div style={{
          padding: '6px 12px', borderBottom: '1px solid var(--border, #30363d)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
          color: 'var(--text-secondary, #8b949e)',
        }}>
          <span>{totalMatches} result{totalMatches !== 1 ? 's' : ''} in {results.length} file{results.length !== 1 ? 's' : ''}</span>
          <span style={{ flex: 1 }} />
          {currentMatch > 0 && (
            <span>{currentMatch} / {totalMatches}</span>
          )}
          <button onClick={copyResults}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 6px', borderRadius: 4,
            }}>
            <FaCopy size={10} /> Copy
          </button>
        </div>
      )}

      {/* ── Results list ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {searching && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
            Searching...
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
            <FaExclamationCircle size={16} style={{ marginBottom: 8 }} />
            <div>No results found</div>
          </div>
        )}

        {results.map((file) => (
          <div key={file.path}>
            {/* ── File header ── */}
            <div
              onClick={() => toggleFile(file.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: 'rgba(88,166,255,0.03)',
                borderBottom: '1px solid var(--border, #30363d)',
              }}
            >
              {file.expanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              {file.expanded ? <FaFolderOpen size={12} /> : <FaFolder size={12} />}
              <span style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}>
                {file.path}
              </span>
              <span style={{
                background: 'rgba(88,166,255,0.15)', color: 'var(--accent, #58a6ff)',
                borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              }}>
                {file.matches.length}
              </span>
              {showReplace && (
                <button
                  onClick={(e) => { e.stopPropagation(); replaceAllInFile(file.path); }}
                  style={{
                    background: 'rgba(63,185,80,0.15)', border: 'none', color: 'var(--success, #3fb950)',
                    borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer',
                  }}>
                  Replace
                </button>
              )}
            </div>

            {/* ── Match lines ── */}
            {file.expanded && file.matches.map((match, i) => (
              <div
                key={i}
                onClick={() => {
                  // Open file at line
                  (window as any).electronAPI?.openFileAtLine?.(file.path, match.line);
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 12px 3px 36px',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: 1.4, borderBottom: '1px solid rgba(48,54,61,0.5)',
                }}
              >
                <span style={{ color: 'var(--text-secondary, #8b949e)', minWidth: 28, textAlign: 'right' }}>
                  {match.line}
                </span>
                <span style={{ color: 'var(--text-secondary, #8b949e)' }}>:</span>
                <span style={{ color: 'var(--text-secondary, #8b949e)', minWidth: 20, textAlign: 'right' }}>
                  {match.column}
                </span>
                <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  <MatchHighlight text={match.text} query={query} options={options} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '6px 12px', borderTop: '1px solid var(--border, #30363d)',
        fontSize: 10, color: 'var(--text-secondary, #8b949e)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{results.length} files, {totalMatches} matches</span>
        {replacedCount > 0 && (
          <span style={{ color: 'var(--success, #3fb950)' }}>
            <FaCheck size={10} /> {replacedCount} file{replacedCount !== 1 ? 's' : ''} replaced
          </span>
        )}
      </div>
    </div>
  );
}

// ── Option toggle button ──────────────────────────
function OptBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgba(88,166,255,0.2)' : 'var(--bg-tertiary, #161b22)',
        border: `1px solid ${active ? 'var(--accent, #58a6ff)' : 'var(--border, #30363d)'}`,
        color: active ? 'var(--accent, #58a6ff)' : 'var(--text-secondary, #8b949e)',
        borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

// ── Match highlight component ──────────────────────
function MatchHighlight({ text, query, options }: { text: string; query: string; options: SearchOptions }) {
  if (!query) return <span>{text}</span>;

  try {
    const flags = options.caseSensitive ? 'g' : 'gi';
    let pattern = options.regex ? query : escapeRegex(query);
    if (options.wholeWord) pattern = `\\b${pattern}\\b`;
    const regex = new RegExp(`(${pattern})`, flags);
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = regex.test(part);
          // Reset lastIndex since we used 'g' flag
          regex.lastIndex = 0;
          return isMatch ? (
            <span key={i} style={{ background: 'rgba(210,153,34,0.3)', color: '#d29922', borderRadius: 2 }}>
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  } catch {
    return <span>{text}</span>;
  }
}

// ── Utility ────────────────────────────────────────
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
