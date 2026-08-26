/**
 * AI Command History Panel
 * Track, search, and reuse past AI interactions
 */

import React, { useState, useMemo } from 'react';
import {
  FaClock, FaSearch, FaCode, FaCopy, FaTrash, FaUndo, FaStar, FaComments, FaCodeBranch, FaFilter, FaTimes, FaChevronDown, FaChevronRight, FaTag, FaUser, FaRobot, FaDownload
} from '../Icon';

interface HistoryEntry {
  id: string;
  prompt: string;
  response: string;
  agent: string;
  model: string;
  timestamp: number;
  tokens: number;
  pinned: boolean;
  tags: string[];
  files?: string[];
  success: boolean;
}

const AGENT_COLORS: Record<string, string> = {
  code: '#58a6ff', review: '#3fb950', debug: '#f85149',
  architect: '#bc8cff', test: '#d29922', devops: '#39d353',
  security: '#f778ba', perf: '#d29922',
};

export default function AIHistoryPanel() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('idexal-ai-history') || '[]');
    } catch { return []; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Filter history ──────────────────────────────
  const filtered = useMemo(() => {
    return history.filter(entry => {
      if (showPinnedOnly && !entry.pinned) return false;
      if (filterAgent && entry.agent !== filterAgent) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return entry.prompt.toLowerCase().includes(q) ||
          entry.response.toLowerCase().includes(q) ||
          entry.agent.toLowerCase().includes(q);
      }
      return true;
    });
  }, [history, searchQuery, filterAgent, showPinnedOnly]);

  // ── Actions ────────────────────────────────────
  const togglePin = (id: string) => {
    setHistory(prev => prev.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e));
    saveHistory(history.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e));
  };

  const deleteEntry = (id: string) => {
    const updated = history.filter(e => e.id !== id);
    setHistory(updated);
    saveHistory(updated);
  };

  const clearAll = () => {
    setHistory([]);
    saveHistory([]);
  };

  const copyPrompt = (prompt: string) => navigator.clipboard.writeText(prompt);

  const reusePrompt = (prompt: string) => {
    window.dispatchEvent(new CustomEvent('ai-reuse-prompt', { detail: { prompt } }));
  };

  const exportHistory = () => {
    const json = JSON.stringify(history, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ai-history.json'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Stats ──────────────────────────────────────
  const totalTokens = history.reduce((sum, e) => sum + e.tokens, 0);
  const agents = [...new Set(history.map(e => e.agent))];
  const pinnedCount = history.filter(e => e.pinned).length;

  // ── Relative time ──────────────────────────────
  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary, #0d1117)', color: 'var(--text-primary, #e6edf3)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #30363d)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FaClock size={14} />
          <span style={{ fontWeight: 600, fontSize: 12 }}>AI History</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)' }}>
            {history.length} entries · {pinnedCount} pinned
          </span>
        </div>

        {/* ── Search ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
            borderRadius: 4, padding: '4px 8px', gap: 4,
          }}>
            <FaSearch size={12} style={{ color: 'var(--text-secondary, #8b949e)' }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              style={{
                flex: 1, background: 'none', border: 'none', color: 'inherit',
                fontSize: 12, outline: 'none',
              }} />
          </div>
          <button onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            style={{
              background: showPinnedOnly ? 'rgba(210,153,34,0.15)' : 'transparent',
              border: `1px solid ${showPinnedOnly ? 'var(--warning, #d29922)' : 'var(--border, #30363d)'}`,
              color: showPinnedOnly ? 'var(--warning, #d29922)' : 'var(--text-secondary, #8b949e)',
              borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 10,
            }}>
            <FaCode size={10} />
          </button>
        </div>

        {/* ── Agent filter ── */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <FilterBtn active={!filterAgent} onClick={() => setFilterAgent(null)}>All</FilterBtn>
          {agents.map(agent => (
            <FilterBtn key={agent} active={filterAgent === agent}
              onClick={() => setFilterAgent(filterAgent === agent ? null : agent)}
              color={AGENT_COLORS[agent]}>
              {agent}
            </FilterBtn>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        padding: '4px 12px', borderBottom: '1px solid var(--border, #30363d)',
        display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-secondary, #8b949e)',
      }}>
        <span>{totalTokens.toLocaleString()} tokens</span>
        <span>{agents.length} agents</span>
        <span style={{ flex: 1 }} />
        <button onClick={exportHistory}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <FaDownload size={10} /> Export
        </button>
        <button onClick={clearAll}
          style={{ background: 'none', border: 'none', color: 'var(--danger, #f85149)', cursor: 'pointer', fontSize: 10 }}>
          Clear All
        </button>
      </div>

      {/* ── History list ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary, #8b949e)', fontSize: 12 }}>
            <FaClock size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>No history entries{searchQuery ? ' matching search' : ''}</div>
          </div>
        )}

        {filtered.map(entry => {
          const expanded = expandedId === entry.id;
          return (
            <div key={entry.id}
              style={{
                borderBottom: '1px solid rgba(48,54,61,0.5)',
                background: expanded ? 'rgba(88,166,255,0.03)' : 'transparent',
              }}>
              {/* ── Entry header ── */}
              <div onClick={() => setExpandedId(expanded ? null : entry.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  cursor: 'pointer', fontSize: 11,
                }}>
                {expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                {entry.pinned && <FaCode size={10} style={{ color: 'var(--warning, #d29922)' }} />}
                <span style={{
                  background: AGENT_COLORS[entry.agent] || 'var(--text-secondary)',
                  color: '#fff', padding: '1px 5px', borderRadius: 3,
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {entry.agent}
                </span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.prompt.slice(0, 80)}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-secondary, #8b949e)', whiteSpace: 'nowrap' }}>
                  {timeAgo(entry.timestamp)}
                </span>
              </div>

              {/* ── Expanded details ── */}
              {expanded && (
                <div style={{ padding: '4px 12px 8px 28px', fontSize: 11 }}>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)', marginBottom: 2 }}>Prompt</div>
                    <div style={{
                      background: 'var(--bg-tertiary, #161b22)', padding: 6, borderRadius: 4,
                      fontFamily: 'var(--font-mono, monospace)', fontSize: 10, whiteSpace: 'pre-wrap',
                      maxHeight: 100, overflow: 'auto',
                    }}>
                      {entry.prompt}
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)', marginBottom: 2 }}>Response</div>
                    <div style={{
                      background: 'var(--bg-tertiary, #161b22)', padding: 6, borderRadius: 4,
                      fontFamily: 'var(--font-mono, monospace)', fontSize: 10, whiteSpace: 'pre-wrap',
                      maxHeight: 150, overflow: 'auto',
                    }}>
                      {entry.response.slice(0, 500)}{entry.response.length > 500 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                      Model: {entry.model} · Tokens: {entry.tokens}
                    </span>
                    {entry.files?.map(f => (
                      <span key={f} style={{ fontSize: 9, background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <ActionBtn icon={<FaUndo size={10} />} label="Reuse" onClick={() => reusePrompt(entry.prompt)} />
                    <ActionBtn icon={<FaCopy size={10} />} label="Copy" onClick={() => copyPrompt(entry.prompt)} />
                    <ActionBtn icon={<FaCode size={10} />} label={entry.pinned ? 'Unpin' : 'Pin'}
                      onClick={() => togglePin(entry.id)} color={entry.pinned ? 'var(--warning, #d29922)' : undefined} />
                    <ActionBtn icon={<FaTrash size={10} />} label="Delete" onClick={() => deleteEntry(entry.id)}
                      color="var(--danger, #f85149)" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Filter button ────────────────────────────────
function FilterBtn({ active, onClick, children, color }: {
  active: boolean; onClick: () => void; children: React.ReactNode; color?: string;
}) {
  return (
    <button onClick={onClick}
      style={{
        padding: '2px 6px', borderRadius: 4, border: '1px solid',
        borderColor: active ? (color || 'var(--accent, #58a6ff)') : 'var(--border, #30363d)',
        background: active ? `${color || 'var(--accent, #58a6ff)'}20` : 'transparent',
        color: active ? (color || 'var(--accent, #58a6ff)') : 'var(--text-secondary, #8b949e)',
        fontSize: 9, cursor: 'pointer', textTransform: 'capitalize',
      }}>
      {children}
    </button>
  );
}

// ── Action button ────────────────────────────────
function ActionBtn({ icon, label, onClick, color }: {
  icon: React.ReactNode; label: string; onClick: () => void; color?: string;
}) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: 'none', border: '1px solid var(--border, #30363d)',
        color: color || 'var(--text-secondary, #8b949e)',
        borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
      {icon} {label}
    </button>
  );
}

// ── Save to localStorage ─────────────────────────
function saveHistory(history: HistoryEntry[]) {
  localStorage.setItem('idexal-ai-history', JSON.stringify(history));
}
