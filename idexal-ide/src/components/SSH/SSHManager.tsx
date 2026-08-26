/**
 * SSH/Remote Connection Manager
 * Save, connect, and manage SSH sessions from within the IDE
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FaServer, FaPlus, FaTrash, FaCode, FaPlay, FaSquare, FaCopy, FaTerminal, FaFolder, FaKey, FaShieldAlt, FaClock, FaChevronDown, FaChevronRight, FaSync, FaSearch, FaTimes
} from '../Icon';

interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  keyPath?: string;
  lastConnected?: string;
  group: string;
  tags: string[];
}

interface ActiveSession {
  connectionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  pid?: number;
  startedAt: string;
}

// ── Storage key ────────────────────────────────────
const STORAGE_KEY = 'idexal-ssh-connections';

export default function SSHManager() {
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedConn, setSelectedConn] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState<SSHConnection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['default']));

  // ── Form state ──────────────────────────────────
  const [form, setForm] = useState({
    name: '', host: '', port: 22, username: '',
    authType: 'password' as 'password' | 'key',
    keyPath: '', group: 'default',
  });

  // ── Load saved connections ───────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setConnections(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ── Save connections ─────────────────────────────
  const saveConnections = (conns: SSHConnection[]) => {
    setConnections(conns);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
  };

  // ── Connect to SSH ──────────────────────────────
  const connect = useCallback(async (conn: SSHConnection) => {
    // Check if already connected
    if (activeSessions.find(s => s.connectionId === conn.id && s.status === 'connected')) {
      return;
    }

    const session: ActiveSession = {
      connectionId: conn.id,
      status: 'connecting',
      startedAt: new Date().toISOString(),
    };
    setActiveSessions(prev => [...prev.filter(s => s.connectionId !== conn.id), session]);

    try {
      const result = await (window as any).electronAPI?.sshConnect?.({
        host: conn.host,
        port: conn.port,
        username: conn.username,
        authType: conn.authType,
        keyPath: conn.keyPath,
      });

      setActiveSessions(prev => prev.map(s =>
        s.connectionId === conn.id
          ? { ...s, status: 'connected', pid: result?.pid }
          : s
      ));

      // Update last connected
      saveConnections(connections.map(c =>
        c.id === conn.id ? { ...c, lastConnected: new Date().toISOString() } : c
      ));
    } catch (err) {
      setActiveSessions(prev => prev.map(s =>
        s.connectionId === conn.id ? { ...s, status: 'error' } : s
      ));
    }
  }, [activeSessions, connections]);

  // ── Disconnect ──────────────────────────────────
  const disconnect = useCallback(async (connId: string) => {
    const session = activeSessions.find(s => s.connectionId === connId);
    if (session?.pid) {
      await (window as any).electronAPI?.sshDisconnect?.(session.pid);
    }
    setActiveSessions(prev => prev.filter(s => s.connectionId !== connId));
  }, [activeSessions]);

  // ── Open SSH terminal ───────────────────────────
  const openTerminal = useCallback(async (conn: SSHConnection) => {
    await (window as any).electronAPI?.sshTerminal?.({
      host: conn.host,
      port: conn.port,
      username: conn.username,
      authType: conn.authType,
      keyPath: conn.keyPath,
    });
  }, []);

  // ── Save connection ─────────────────────────────
  const saveForm = () => {
    const conn: SSHConnection = {
      id: editingConn?.id || `ssh_${Date.now()}`,
      ...form,
      tags: editingConn?.tags || [],
    };
    const updated = editingConn
      ? connections.map(c => c.id === conn.id ? conn : c)
      : [...connections, conn];
    saveConnections(updated);
    setShowForm(false);
    setEditingConn(null);
    setForm({ name: '', host: '', port: 22, username: '', authType: 'password', keyPath: '', group: 'default' });
  };

  // ── Delete connection ───────────────────────────
  const deleteConn = (id: string) => {
    saveConnections(connections.filter(c => c.id !== id));
    disconnect(id);
  };

  // ── Filter connections ──────────────────────────
  const filtered = connections.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q)
      || c.username.toLowerCase().includes(q);
  });

  // ── Group connections ───────────────────────────
  const groups = new Map<string, SSHConnection[]>();
  filtered.forEach(c => {
    const g = c.group || 'default';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(c);
  });

  // ── Get session status ──────────────────────────
  const getSessionStatus = (connId: string) => activeSessions.find(s => s.connectionId === connId);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary, #0d1117)', color: 'var(--text-primary, #e6edf3)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #30363d)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FaServer size={14} />
          <span style={{ fontWeight: 600, fontSize: 12 }}>SSH Connections</span>
          <span style={{ flex: 1 }} />
          <button onClick={() => { setShowForm(true); setEditingConn(null); }}
            style={{
              background: 'rgba(88,166,255,0.15)', border: 'none', color: 'var(--accent, #58a6ff)',
              borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <FaPlus size={10} /> New
          </button>
        </div>

        {/* ── Search ── */}
        <div style={{
          display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary, #161b22)',
          border: '1px solid var(--border, #30363d)', borderRadius: 4, padding: '4px 8px', gap: 4,
        }}>
          <FaSearch size={12} style={{ color: 'var(--text-secondary, #8b949e)' }} />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            style={{
              flex: 1, background: 'none', border: 'none', color: 'inherit',
              fontSize: 12, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Connection form ── */}
      {showForm && (
        <div style={{
          padding: 12, borderBottom: '1px solid var(--border, #30363d)',
          background: 'rgba(88,166,255,0.03)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
            {editingConn ? 'Edit Connection' : 'New Connection'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Input label="Name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} placeholder="My Server" />
            <Input label="Host" value={form.host} onChange={v => setForm(f => ({...f, host: v}))} placeholder="192.168.1.100" />
            <Input label="Port" value={String(form.port)} onChange={v => setForm(f => ({...f, port: parseInt(v) || 22}))} placeholder="22" />
            <Input label="Username" value={form.username} onChange={v => setForm(f => ({...f, username: v}))} placeholder="root" />
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)', marginBottom: 3 }}>Auth Type</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['password', 'key'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({...f, authType: t}))}
                    style={{
                      flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid',
                      borderColor: form.authType === t ? 'var(--accent, #58a6ff)' : 'var(--border, #30363d)',
                      background: form.authType === t ? 'rgba(88,166,255,0.15)' : 'transparent',
                      color: form.authType === t ? 'var(--accent, #58a6ff)' : 'var(--text-secondary, #8b949e)',
                      fontSize: 11, cursor: 'pointer',
                    }}>
                    {t === 'password' ? <FaKey size={10} style={{ marginRight: 4 }} /> : <FaShieldAlt size={10} style={{ marginRight: 4 }} />}
                    {t === 'password' ? 'Password' : 'SSH Key'}
                  </button>
                ))}
              </div>
            </div>
            {form.authType === 'key' && (
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Key Path" value={form.keyPath} onChange={v => setForm(f => ({...f, keyPath: v}))} placeholder="~/.ssh/id_rsa" />
              </div>
            )}
            <Input label="Group" value={form.group} onChange={v => setForm(f => ({...f, group: v}))} placeholder="default" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={saveForm}
              style={{
                flex: 1, padding: '6px 12px', background: 'var(--accent, #58a6ff)', color: '#fff',
                border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>
              {editingConn ? 'Update' : 'Save'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingConn(null); }}
              style={{
                padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary, #8b949e)',
                border: '1px solid var(--border, #30363d)', borderRadius: 4, fontSize: 11, cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Connections list ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {Array.from(groups.entries()).map(([groupName, groupConns]) => (
          <div key={groupName}>
            <div
              onClick={() => {
                setExpandedGroups(prev => {
                  const next = new Set(prev);
                  next.has(groupName) ? next.delete(groupName) : next.add(groupName);
                  return next;
                });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-secondary, #8b949e)',
              }}
            >
              {expandedGroups.has(groupName) ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              {groupName}
              <span style={{ marginLeft: 4, fontSize: 10 }}>({groupConns.length})</span>
            </div>

            {expandedGroups.has(groupName) && groupConns.map((conn) => {
              const session = getSessionStatus(conn.id);
              const isConnected = session?.status === 'connected';
              const isConnecting = session?.status === 'connecting';

              return (
                <div key={conn.id}
                  onClick={() => setSelectedConn(conn.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 28px',
                    cursor: 'pointer', fontSize: 12,
                    background: selectedConn === conn.id ? 'rgba(88,166,255,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isConnected ? 'var(--success, #3fb950)' : selectedConn === conn.id ? 'var(--accent, #58a6ff)' : 'transparent'}`,
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isConnected ? 'var(--success, #3fb950)'
                      : isConnecting ? 'var(--warning, #d29922)'
                      : session?.status === 'error' ? 'var(--danger, #f85149)'
                      : 'var(--text-tertiary, #484f58)',
                    animation: isConnecting ? 'pulse 1s infinite' : 'none',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conn.name || conn.host}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {conn.username}@{conn.host}:{conn.port}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 2 }}>
                    {isConnected ? (
                      <>
                        <ActionBtn icon={<FaTerminal size={10} />} title="Terminal" onClick={() => openTerminal(conn)} />
                        <ActionBtn icon={<FaSquare size={10} />} title="Disconnect" onClick={() => disconnect(conn.id)}
                          color="var(--danger, #f85149)" />
                      </>
                    ) : (
                      <ActionBtn icon={<FaPlay size={10} />} title="Connect" onClick={() => connect(conn)}
                        color="var(--success, #3fb950)" disabled={isConnecting} />
                    )}
                    <ActionBtn icon={<FaCode size={10} />} title="Edit" onClick={() => {
                      setEditingConn(conn);
                      setForm({
                        name: conn.name, host: conn.host, port: conn.port,
                        username: conn.username, authType: conn.authType,
                        keyPath: conn.keyPath || '', group: conn.group,
                      });
                      setShowForm(true);
                    }} />
                    <ActionBtn icon={<FaTrash size={10} />} title="Delete" onClick={() => deleteConn(conn.id)}
                      color="var(--danger, #f85149)" />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {connections.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary, #8b949e)', fontSize: 12 }}>
            <FaServer size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>No SSH connections yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Click "New" to add a connection</div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '6px 12px', borderTop: '1px solid var(--border, #30363d)',
        fontSize: 10, color: 'var(--text-secondary, #8b949e)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{connections.length} connection{connections.length !== 1 ? 's' : ''}</span>
        <span>{activeSessions.filter(s => s.status === 'connected').length} active</span>
      </div>
    </div>
  );
}

// ── Input component ────────────────────────────────
function Input({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)', marginBottom: 3 }}>{label}</div>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
          borderRadius: 4, padding: '5px 8px', color: 'inherit', fontSize: 11, outline: 'none',
        }}
      />
    </div>
  );
}

// ── Action button ──────────────────────────────────
function ActionBtn({ icon, title, onClick, color, disabled }: {
  icon: React.ReactNode; title: string; onClick: () => void; color?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title} disabled={disabled}
      style={{
        background: 'none', border: 'none', color: color || 'var(--text-secondary, #8b949e)',
        cursor: disabled ? 'not-allowed' : 'pointer', padding: 4, borderRadius: 4,
        opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center',
      }}
    >
      {icon}
    </button>
  );
}
