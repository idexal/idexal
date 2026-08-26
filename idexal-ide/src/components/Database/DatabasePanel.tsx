/**
 * Database Query Panel
 * Connect to databases, write queries, view results, manage schemas
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FaDatabase, FaPlay, FaSquare, FaPlus, FaTrash, FaCode, FaSave, FaDownload, FaCopy, FaSync, FaChevronDown, FaChevronRight, FaColumns, FaKey, FaLink, FaSearch, FaTimes, FaCheck, FaClock, FaServer, FaShieldAlt
} from '../Icon';

type DBDriver = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';

interface DBConnection {
  id: string;
  name: string;
  driver: DBDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string; // stored encrypted in production
  ssl: boolean;
  lastUsed?: string;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  error?: string;
}

interface SchemaTable {
  name: string;
  columns: { name: string; type: string; nullable: boolean; key?: string }[];
  rowCount?: number;
}

const DRIVER_DEFAULTS: Record<DBDriver, { port: number; color: string }> = {
  postgresql: { port: 5432, color: '#336791' },
  mysql: { port: 3306, color: '#4479A1' },
  sqlite: { port: 0, color: '#003B57' },
  mongodb: { port: 27017, color: '#4DB33D' },
};

export default function DatabasePanel() {
  const [connections, setConnections] = useState<DBConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 100;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [executing, setExecuting] = useState(false);
  const [history, setHistory] = useState<{ query: string; time: string; success: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState<'query' | 'schema' | 'history' | 'connections'>('query');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState<Omit<DBConnection, 'id'>>({
    name: '', driver: 'postgresql', host: 'localhost', port: 5432,
    database: '', username: '', password: '', ssl: false,
  });

  // ── Connect to database ──────────────────────────
  const connect = useCallback(async (conn: DBConnection) => {
    try {
      await (window as any).electronAPI?.dbConnect?.(conn);
      setActiveConnection(conn.id);
      setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, lastUsed: new Date().toISOString() } : c));
      // Load schema
      const tables: SchemaTable[] = await (window as any).electronAPI?.dbSchema?.(conn.id) || [];
      setSchema(tables);
      setActiveTab('schema');
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }, []);

  // ── Execute query ────────────────────────────────
  const executeQuery = useCallback(async () => {
    if (!activeConnection || !query.trim()) return;
    setExecuting(true);
    const start = Date.now();

    try {
      const res: QueryResult = await (window as any).electronAPI?.dbQuery?.(activeConnection, query);
      setResult({ ...res, executionTime: Date.now() - start });
      setHistory(prev => [{ query: query.trim(), time: new Date().toISOString(), success: true }, ...prev].slice(0, 50));
      setActiveTab('query');
    } catch (err: any) {
      setResult({
        columns: ['error'], rows: [[err.message || 'Query failed']], rowCount: 0,
        executionTime: Date.now() - start, error: err.message,
      });
      setHistory(prev => [{ query: query.trim(), time: new Date().toISOString(), success: false }, ...prev].slice(0, 50));
    } finally {
      setExecuting(false);
    }
  }, [activeConnection, query]);

  // ── Keyboard shortcut ────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeQuery();
      }
    };
    const editor = editorRef.current;
    editor?.addEventListener('keydown', handleKey);
    return () => editor?.removeEventListener('keydown', handleKey);
  }, [executeQuery]);

  // ── Save connection ──────────────────────────────
  const saveConnection = () => {
    const conn: DBConnection = { ...form, id: `db_${Date.now()}` };
    setConnections(prev => [...prev, conn]);
    setShowForm(false);
    setForm({ name: '', driver: 'postgresql', host: 'localhost', port: 5432, database: '', username: '', password: '', ssl: false });
  };

  // ── Export results ───────────────────────────────
  const exportResults = (format: 'csv' | 'json') => {
    if (!result) return;
    let content: string;
    if (format === 'csv') {
      content = [result.columns.join(','), ...result.rows.map(r => r.join(','))].join('\n');
    } else {
      const objs = result.rows.map(r => {
        const obj: any = {};
        result.columns.forEach((col, i) => { obj[col] = r[i]; });
        return obj;
      });
      content = JSON.stringify(objs, null, 2);
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `query-result.${format}`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Toggle table expand ──────────────────────────
  const toggleTable = (name: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary, #0d1117)', color: 'var(--text-primary, #e6edf3)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #30363d)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FaDatabase size={14} />
          <span style={{ fontWeight: 600, fontSize: 12 }}>Database Explorer</span>
          <span style={{ flex: 1 }} />
          {activeConnection && (
            <span style={{ fontSize: 10, color: 'var(--success, #3fb950)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success, #3fb950)' }} />
              Connected
            </span>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['connections', 'query', 'schema', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '5px 0', background: 'none', border: 'none', borderBottom: '2px solid',
                borderColor: activeTab === tab ? 'var(--accent, #58a6ff)' : 'transparent',
                color: activeTab === tab ? 'var(--accent, #58a6ff)' : 'var(--text-secondary, #8b949e)',
                fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Connections tab ── */}
      {activeTab === 'connections' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              style={{
                width: '100%', padding: '8px', background: 'rgba(88,166,255,0.15)',
                border: '1px dashed var(--accent, #58a6ff)', borderRadius: 6,
                color: 'var(--accent, #58a6ff)', fontSize: 11, cursor: 'pointer', marginBottom: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
              <FaPlus size={12} /> New Connection
            </button>
          ) : (
            <div style={{ padding: 8, background: 'var(--bg-tertiary, #161b22)', borderRadius: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>New Connection</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <DBInput label="Name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} placeholder="My Database" />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>Driver</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Object.entries(DRIVER_DEFAULTS).map(([driver, info]) => (
                      <button key={driver} onClick={() => setForm(f => ({...f, driver: driver as DBDriver, port: info.port}))}
                        style={{
                          flex: 1, padding: '5px', borderRadius: 4, border: '1px solid',
                          borderColor: form.driver === driver ? info.color : 'var(--border, #30363d)',
                          background: form.driver === driver ? `${info.color}20` : 'transparent',
                          color: form.driver === driver ? info.color : 'var(--text-secondary)',
                          fontSize: 10, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize',
                        }}>
                        {driver}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6 }}>
                  <DBInput label="Host" value={form.host} onChange={v => setForm(f => ({...f, host: v}))} />
                  <DBInput label="Port" value={String(form.port)} onChange={v => setForm(f => ({...f, port: parseInt(v) || 0}))} />
                </div>
                <DBInput label="Database" value={form.database} onChange={v => setForm(f => ({...f, database: v}))} />
                <DBInput label="Username" value={form.username} onChange={v => setForm(f => ({...f, username: v}))} />
                <DBInput label="Password" value={form.password} onChange={v => setForm(f => ({...f, password: v}))} type="password" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.ssl} onChange={() => setForm(f => ({...f, ssl: !f.ssl}))} />
                  <FaShieldAlt size={10} /> Use SSL
                </label>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={saveConnection}
                  style={{ flex: 1, padding: '6px', background: 'var(--accent, #58a6ff)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Save
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border, #30363d)', color: 'var(--text-secondary)', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {connections.map(conn => (
            <div key={conn.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                background: activeConnection === conn.id ? 'rgba(88,166,255,0.08)' : 'var(--bg-tertiary, #161b22)',
                border: `1px solid ${activeConnection === conn.id ? DRIVER_DEFAULTS[conn.driver].color : 'var(--border, #30363d)'}`,
                borderRadius: 6, marginBottom: 6, cursor: 'pointer',
              }}
              onClick={() => connect(conn)}
            >
              <FaDatabase size={14} style={{ color: DRIVER_DEFAULTS[conn.driver].color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{conn.name || conn.database}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {conn.driver}://{conn.host}:{conn.port}/{conn.database}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setConnections(prev => prev.filter(c => c.id !== conn.id)); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
                <FaTrash size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Query tab ── */}
      {activeTab === 'query' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Editor */}
          <div style={{ borderBottom: '1px solid var(--border, #30363d)' }}>
            <textarea ref={editorRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Write your SQL query... (Ctrl+Enter to run)"
              style={{
                width: '100%', minHeight: 100, background: 'var(--bg-secondary, #161b22)',
                border: 'none', color: 'var(--text-primary, #e6edf3)', padding: 10,
                fontFamily: 'var(--font-mono, monospace)', fontSize: 12, lineHeight: 1.5,
                resize: 'vertical', outline: 'none',
              }} />
            <div style={{ padding: '4px 10px', display: 'flex', gap: 6 }}>
              <button onClick={executeQuery} disabled={!activeConnection || executing}
                style={{
                  padding: '4px 12px', background: 'var(--accent, #58a6ff)', color: '#fff',
                  border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  opacity: !activeConnection || executing ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {executing ? <FaSync size={10} className="spin" /> : <FaPlay size={10} />}
                Run Query
              </button>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                Ctrl+Enter
              </span>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              {result.error && (
                <div style={{ padding: 8, background: 'rgba(248,81,73,0.1)', color: 'var(--danger, #f85149)', fontSize: 11 }}>
                  {result.error}
                </div>
              )}
              <div style={{ padding: '4px 10px', borderBottom: '1px solid var(--border, #30363d)', display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-secondary)' }}>
                <span>{result.rowCount} rows</span>
                <span>{result.executionTime}ms</span>
                <span style={{ flex: 1 }} />
                <button onClick={() => exportResults('csv')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 10 }}>
                  Export CSV
                </button>
                <button onClick={() => exportResults('json')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 10 }}>
                  Export JSON
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}>
                <thead>
                  <tr>
                    {result.columns.map(col => (
                      <th key={col} style={{ padding: '5px 10px', textAlign: 'left', background: 'var(--bg-tertiary, #161b22)', borderBottom: '1px solid var(--border, #30363d)', fontWeight: 600, position: 'sticky', top: 0 }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '4px 10px', borderBottom: '1px solid rgba(48,54,61,0.5)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cell === null ? <span style={{ color: 'var(--text-tertiary)' }}>NULL</span> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Schema tab ── */}
      {activeTab === 'schema' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
          {schema.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              Connect to a database to view schema
            </div>
          ) : (
            schema.map(table => (
              <div key={table.name}>
                <div onClick={() => toggleTable(table.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                    cursor: 'pointer', fontSize: 12,
                  }}>
                  {expandedTables.has(table.name) ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                  <FaCode size={12} />
                  <span style={{ fontWeight: 600, flex: 1 }}>{table.name}</span>
                  {table.rowCount !== undefined && (
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{table.rowCount.toLocaleString()} rows</span>
                  )}
                </div>
                {expandedTables.has(table.name) && (
                  <div style={{ paddingLeft: 28 }}>
                    {table.columns.map(col => (
                      <div key={col.name}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 10px', fontSize: 11 }}>
                        {col.key && <FaKey size={10} style={{ color: 'var(--accent, #58a6ff)' }} />}
                        {!col.key && <span style={{ width: 10 }} />}
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', flex: 1 }}>{col.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{col.type}</span>
                        {!col.nullable && <span style={{ color: 'var(--danger, #f85149)', fontSize: 9 }}>NOT NULL</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              No query history yet
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} onClick={() => { setQuery(h.query); setActiveTab('query'); }}
                style={{
                  padding: '6px 12px', borderBottom: '1px solid rgba(48,54,61,0.5)',
                  cursor: 'pointer', fontSize: 11,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {h.success ? <FaCheck size={10} style={{ color: 'var(--success, #3fb950)' }} /> : <FaTimes size={10} style={{ color: 'var(--danger, #f85149)' }} />}
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {h.query}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                    {new Date(h.time).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Input component ────────────────────────────────
function DBInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--bg-primary, #0d1117)', border: '1px solid var(--border, #30363d)',
          borderRadius: 4, padding: '5px 8px', color: 'inherit', fontSize: 11, outline: 'none',
        }} />
    </div>
  );
}
