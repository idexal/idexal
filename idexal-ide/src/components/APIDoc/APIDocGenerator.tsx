/**
 * API Documentation Generator
 * Generate and view API docs from OpenAPI specs or code analysis
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FaFileAlt, FaCode, FaDownload, FaCopy, FaSync, FaEye, FaChevronDown, FaChevronRight, FaArrowRight, FaCheck, FaExclamationCircle, FaGlobe, FaLock, FaTag, FaComments, FaLayerGroup, FaBolt
} from '../Icon';

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
  deprecated: boolean;
}

interface Parameter {
  name: string;
  in: string; // path, query, header
  required: boolean;
  type: string;
  description: string;
}

interface RequestBody {
  contentType: string;
  schema: string;
  description: string;
}

interface Response {
  code: string;
  description: string;
  schema?: string;
}

interface DocConfig {
  title: string;
  version: string;
  baseUrl: string;
  description: string;
  generateMarkdown: boolean;
  generateHTML: boolean;
  generateJSON: boolean;
  includeExamples: boolean;
  includeSchemas: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#3fb950',
  POST: '#58a6ff',
  PUT: '#d29922',
  DELETE: '#f85149',
  PATCH: '#bc8cff',
  OPTIONS: '#8b949e',
  HEAD: '#8b949e',
};

export default function APIDocGenerator() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [config, setConfig] = useState<DocConfig>({
    title: 'API Documentation',
    version: '1.0.0',
    baseUrl: '',
    description: '',
    generateMarkdown: true,
    generateHTML: true,
    generateJSON: false,
    includeExamples: true,
    includeSchemas: true,
  });
  const [preview, setPreview] = useState('');
  const [generating, setGenerating] = useState(false);
  const [source, setSource] = useState<'openapi' | 'code' | 'manual'>('code');
  const [specUrl, setSpecUrl] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'preview' | 'config' | 'endpoints'>('preview');

  // ── Analyze current project for endpoints ───────
  const analyzeProject = useCallback(async () => {
    setGenerating(true);
    try {
      const detected: Endpoint[] = await (window as any).electronAPI?.analyzeAPI?.() || [];
      if (detected.length > 0) {
        setEndpoints(detected);
      } else {
        // Fallback: generate demo endpoints
        setEndpoints(generateDemoEndpoints());
      }
    } catch {
      setEndpoints(generateDemoEndpoints());
    } finally {
      setGenerating(false);
    }
  }, []);

  // ── Load OpenAPI spec ───────────────────────────
  const loadSpec = useCallback(async (url: string) => {
    setGenerating(true);
    try {
      const result = await (window as any).electronAPI?.loadOpenAPISpec?.(url);
      if (result?.endpoints) {
        setEndpoints(result.endpoints);
        if (result.info) {
          setConfig(c => ({
            ...c,
            title: result.info.title || c.title,
            version: result.info.version || c.version,
            description: result.info.description || c.description,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load OpenAPI spec:', err);
    } finally {
      setGenerating(false);
    }
  }, []);

  // ── Generate documentation ───────────────────────
  const generateDocs = useCallback(() => {
    const format = config.generateMarkdown ? 'markdown' : config.generateHTML ? 'html' : 'json';

    if (format === 'markdown') {
      setPreview(generateMarkdown(endpoints, config));
    } else if (format === 'html') {
      setPreview(generateHTML(endpoints, config));
    } else {
      setPreview(JSON.stringify({ openapi: '3.0.0', info: { title: config.title, version: config.version }, endpoints }, null, 2));
    }
  }, [endpoints, config]);

  useEffect(() => {
    if (endpoints.length > 0) generateDocs();
  }, [endpoints, config, generateDocs]);

  // ── Copy to clipboard ───────────────────────────
  const copyDocs = () => navigator.clipboard.writeText(preview);

  // ── Download ────────────────────────────────────
  const downloadDocs = () => {
    const ext = config.generateMarkdown ? 'md' : config.generateHTML ? 'html' : 'json';
    const blob = new Blob([preview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-docs.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Toggle path expand ──────────────────────────
  const togglePath = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  // ── Add new endpoint ────────────────────────────
  const addEndpoint = () => {
    setEndpoints(prev => [...prev, {
      method: 'GET', path: '/new-endpoint', summary: 'New endpoint',
      description: '', tags: [], parameters: [], responses: [{ code: '200', description: 'Success' }],
      deprecated: false,
    }]);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary, #0d1117)', color: 'var(--text-primary, #e6edf3)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #30363d)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FaFileAlt size={14} />
          <span style={{ fontWeight: 600, fontSize: 12 }}>API Documentation Generator</span>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['endpoints', 'config', 'preview'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '6px 0', background: 'none', border: 'none', borderBottom: '2px solid',
                borderColor: activeTab === tab ? 'var(--accent, #58a6ff)' : 'transparent',
                color: activeTab === tab ? 'var(--accent, #58a6ff)' : 'var(--text-secondary, #8b949e)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Endpoints tab ── */}
      {activeTab === 'endpoints' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Source selection */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #30363d)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {(['code', 'openapi', 'manual'] as const).map(s => (
                <button key={s} onClick={() => setSource(s)}
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 4, border: '1px solid',
                    borderColor: source === s ? 'var(--accent, #58a6ff)' : 'var(--border, #30363d)',
                    background: source === s ? 'rgba(88,166,255,0.15)' : 'transparent',
                    color: source === s ? 'var(--accent, #58a6ff)' : 'var(--text-secondary, #8b949e)',
                    fontSize: 11, cursor: 'pointer',
                  }}>
                  {s === 'code' ? <FaCode size={10} style={{ marginRight: 4 }} /> : null}
                  {s === 'openapi' ? <FaGlobe size={10} style={{ marginRight: 4 }} /> : null}
                  {s === 'manual' ? <FaCode size={10} style={{ marginRight: 4 }} /> : null}
                  {s === 'code' ? 'From FaCode' : s === 'openapi' ? 'OpenAPI Spec' : 'Manual'}
                </button>
              ))}
            </div>

            {source === 'openapi' && (
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="text" value={specUrl} onChange={(e) => setSpecUrl(e.target.value)}
                  placeholder="https://petstore.swagger.io/v2/swagger.json"
                  style={{
                    flex: 1, background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
                    borderRadius: 4, padding: '5px 8px', color: 'inherit', fontSize: 11, outline: 'none',
                  }} />
                <button onClick={() => loadSpec(specUrl)}
                  style={{
                    background: 'rgba(88,166,255,0.15)', border: 'none', color: 'var(--accent, #58a6ff)',
                    borderRadius: 4, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  }}>
                  Load
                </button>
              </div>
            )}

            {source === 'code' && (
              <button onClick={analyzeProject}
                style={{
                  width: '100%', padding: '6px 12px', background: 'rgba(88,166,255,0.15)',
                  border: '1px solid var(--accent, #58a6ff)', color: 'var(--accent, #58a6ff)',
                  borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {generating ? <FaSync size={12} className="spin" /> : <FaCode size={12} />}
                {generating ? 'Analyzing...' : 'Analyze Project'}
              </button>
            )}
          </div>

          {/* Endpoints list */}
          <div style={{ padding: '4px 0' }}>
            {endpoints.map((ep, i) => {
              const key = `${ep.method}-${ep.path}`;
              const expanded = expandedPaths.has(key);

              return (
                <div key={i}>
                  <div onClick={() => togglePath(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                      cursor: 'pointer', fontSize: 12,
                    }}>
                    {expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    <span style={{
                      background: METHOD_COLORS[ep.method] || '#8b949e',
                      color: '#fff', padding: '1px 6px', borderRadius: 3,
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
                      minWidth: 45, textAlign: 'center',
                    }}>
                      {ep.method}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, flex: 1 }}>
                      {ep.path}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)' }}>
                      {ep.summary}
                    </span>
                    {ep.deprecated && (
                      <span style={{ fontSize: 9, color: 'var(--danger, #f85149)', fontWeight: 600 }}>DEPRECATED</span>
                    )}
                  </div>

                  {expanded && (
                    <div style={{ padding: '4px 12px 8px 36px', fontSize: 11 }}>
                      <div style={{ marginBottom: 6, color: 'var(--text-secondary, #8b949e)' }}>{ep.description}</div>
                      {ep.parameters.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, marginBottom: 3, fontSize: 10, color: 'var(--text-secondary)' }}>Parameters</div>
                          {ep.parameters.map((p, j) => (
                            <div key={j} style={{ padding: '2px 0', display: 'flex', gap: 8, fontFamily: 'var(--font-mono, monospace)' }}>
                              <span style={{ color: 'var(--accent, #58a6ff)' }}>{p.name}</span>
                              <span style={{ color: 'var(--text-secondary, #8b949e)' }}>{p.in}</span>
                              {p.required && <span style={{ color: 'var(--danger, #f85149)', fontSize: 9 }}>required</span>}
                              <span style={{ color: 'var(--text-secondary, #8b949e)' }}>— {p.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {ep.responses.map((r, j) => (
                        <div key={j} style={{ padding: '2px 0', display: 'flex', gap: 8, fontFamily: 'var(--font-mono, monospace)' }}>
                          <span style={{ color: parseInt(r.code) < 400 ? 'var(--success, #3fb950)' : 'var(--danger, #f85149)' }}>{r.code}</span>
                          <span style={{ color: 'var(--text-secondary, #8b949e)' }}>{r.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: '8px 12px' }}>
            <button onClick={addEndpoint}
              style={{
                width: '100%', padding: '6px', background: 'transparent',
                border: '1px dashed var(--border, #30363d)', borderRadius: 4,
                color: 'var(--text-secondary, #8b949e)', fontSize: 11, cursor: 'pointer',
              }}>
              + Add Endpoint
            </button>
          </div>
        </div>
      )}

      {/* ── Config tab ── */}
      {activeTab === 'config' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <FormField label="Title" value={config.title} onChange={v => setConfig(c => ({...c, title: v}))} />
            <FormField label="Version" value={config.version} onChange={v => setConfig(c => ({...c, version: v}))} />
            <FormField label="Base URL" value={config.baseUrl} onChange={v => setConfig(c => ({...c, baseUrl: v}))} placeholder="https://api.example.com" />
            <FormField label="Description" value={config.description} onChange={v => setConfig(c => ({...c, description: v}))} multiline />

            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Output Format</div>
            {(['generateMarkdown', 'generateHTML', 'generateJSON'] as const).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
                <input type="checkbox" checked={config[key]} onChange={() => setConfig(c => ({...c, [key]: !c[key]}))} />
                {key.replace('generate', '')}
              </label>
            ))}

            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Options</div>
            {(['includeExamples', 'includeSchemas'] as const).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
                <input type="checkbox" checked={config[key]} onChange={() => setConfig(c => ({...c, [key]: !c[key]}))} />
                {key.replace('include', '')}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Preview tab ── */}
      {activeTab === 'preview' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border, #30363d)', display: 'flex', gap: 6 }}>
            <button onClick={copyDocs}
              style={{
                flex: 1, padding: '5px 8px', background: 'rgba(88,166,255,0.15)',
                border: 'none', color: 'var(--accent, #58a6ff)', borderRadius: 4,
                fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
              <FaCopy size={10} /> Copy
            </button>
            <button onClick={downloadDocs}
              style={{
                flex: 1, padding: '5px 8px', background: 'rgba(63,185,80,0.15)',
                border: 'none', color: 'var(--success, #3fb950)', borderRadius: 4,
                fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
              <FaDownload size={10} /> Download
            </button>
            <button onClick={generateDocs}
              style={{
                padding: '5px 8px', background: 'transparent',
                border: '1px solid var(--border, #30363d)', borderRadius: 4,
                color: 'var(--text-secondary, #8b949e)', fontSize: 11, cursor: 'pointer',
              }}>
              <FaSync size={10} />
            </button>
          </div>
          <pre style={{
            flex: 1, overflow: 'auto', padding: 12, margin: 0, fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)', lineHeight: 1.5,
            background: 'var(--bg-secondary, #161b22)', whiteSpace: 'pre-wrap',
          }}>
            {preview || 'Click "Analyze Project" or add endpoints to generate documentation.'}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Helper: Markdown generator ─────────────────────
function generateMarkdown(endpoints: Endpoint[], config: DocConfig): string {
  let md = `# ${config.title}\n\n> ${config.description || 'Auto-generated API documentation'}\n\n`;
  md += `**Version:** ${config.version}`;
  if (config.baseUrl) md += `\n**Base URL:** \`${config.baseUrl}\``;
  md += '\n\n---\n\n';

  // Group by tags
  const tagged = new Map<string, Endpoint[]>();
  endpoints.forEach(ep => {
    const tag = ep.tags[0] || 'Endpoints';
    if (!tagged.has(tag)) tagged.set(tag, []);
    tagged.get(tag)!.push(ep);
  });

  tagged.forEach((eps, tag) => {
    md += `## ${tag}\n\n`;
    eps.forEach(ep => {
      md += `### \`${ep.method}\` ${ep.path}\n\n`;
      md += `${ep.summary}\n\n`;
      if (ep.description) md += `${ep.description}\n\n`;
      if (ep.deprecated) md += `> ⚠️ **DEPRECATED**\n\n`;

      if (ep.parameters.length > 0) {
        md += `| Name | In | Required | Type | Description |\n|---|---|---|---|---|\n`;
        ep.parameters.forEach(p => {
          md += `| \`${p.name}\` | ${p.in} | ${p.required ? '✅' : '❌'} | ${p.type} | ${p.description} |\n`;
        });
        md += '\n';
      }

      ep.responses.forEach(r => {
        md += `**Response \`${r.code}\`:** ${r.description}\n\n`;
      });

      md += '---\n\n';
    });
  });

  return md;
}

// ── Helper: HTML generator ────────────────────────
function generateHTML(endpoints: Endpoint[], config: DocConfig): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
  h1 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
  .endpoint { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
  .method { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-weight: 700; font-size: 0.8rem; }
  .method-GET { background: #3fb950; }
  .method-POST { background: #58a6ff; }
  .method-PUT { background: #d29922; }
  .method-DELETE { background: #f85149; }
  .path { font-family: monospace; font-weight: 600; margin-left: 8px; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
  th, td { border: 1px solid #e0e0e0; padding: 6px 10px; text-align: left; font-size: 0.9rem; }
  th { background: #f5f5f5; }
  code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 0.85rem; }
</style>
</head>
<body>
<h1>${config.title}</h1>
<p>${config.description}</p>
<p><strong>Version:</strong> ${config.version}</p>
`;

  endpoints.forEach(ep => {
    html += `<div class="endpoint">
  <div><span class="method method-${ep.method}">${ep.method}</span><span class="path">${ep.path}</span></div>
  <p>${ep.summary}</p>
  ${ep.description ? `<p>${ep.description}</p>` : ''}
  ${ep.deprecated ? '<p>⚠️ <strong>DEPRECATED</strong></p>' : ''}
</div>\n`;
  });

  html += '</body></html>';
  return html;
}

// ── Helper: Demo endpoints ─────────────────────────
function generateDemoEndpoints(): Endpoint[] {
  return [
    { method: 'GET', path: '/api/v1/users', summary: 'List all users', description: 'Returns a paginated list of users', tags: ['Users'], parameters: [{ name: 'page', in: 'query', required: false, type: 'integer', description: 'Page number' }], responses: [{ code: '200', description: 'List of users' }], deprecated: false },
    { method: 'POST', path: '/api/v1/users', summary: 'Create user', description: 'Create a new user account', tags: ['Users'], parameters: [], requestBody: { contentType: 'application/json', schema: '{ name: string, email: string }', description: 'User data' }, responses: [{ code: '201', description: 'User created' }, { code: '400', description: 'Validation error' }], deprecated: false },
    { method: 'GET', path: '/api/v1/users/{id}', summary: 'Get user by ID', description: 'Returns a single user', tags: ['Users'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string', description: 'User ID' }], responses: [{ code: '200', description: 'User object' }, { code: '404', description: 'Not found' }], deprecated: false },
    { method: 'PUT', path: '/api/v1/users/{id}', summary: 'Update user', description: 'Update user fields', tags: ['Users'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string', description: 'User ID' }], responses: [{ code: '200', description: 'Updated user' }], deprecated: false },
    { method: 'DELETE', path: '/api/v1/users/{id}', summary: 'Delete user', description: 'Permanently delete a user', tags: ['Users'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string', description: 'User ID' }], responses: [{ code: '204', description: 'Deleted' }], deprecated: false },
    { method: 'GET', path: '/api/v1/projects', summary: 'List projects', description: 'Get all projects', tags: ['Projects'], parameters: [], responses: [{ code: '200', description: 'List of projects' }], deprecated: false },
    { method: 'POST', path: '/api/v1/projects', summary: 'Create project', description: 'Create a new project', tags: ['Projects'], parameters: [], responses: [{ code: '201', description: 'Project created' }], deprecated: false },
    { method: 'GET', path: '/api/v1/health', summary: 'Health check', description: 'Returns service health status', tags: ['System'], parameters: [], responses: [{ code: '200', description: 'Healthy' }], deprecated: false },
  ];
}

// ── Form field component ──────────────────────────
function FormField({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const style = {
    width: '100%', background: 'var(--bg-tertiary, #161b22)', border: '1px solid var(--border, #30363d)',
    borderRadius: 4, padding: '6px 8px', color: 'inherit', fontSize: 11, outline: 'none',
    resize: 'vertical' as const, minHeight: multiline ? 60 : undefined,
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary, #8b949e)', marginBottom: 3 }}>{label}</div>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}
