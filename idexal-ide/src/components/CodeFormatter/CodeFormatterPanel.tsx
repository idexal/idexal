import React, { useState, useMemo } from 'react'
import {
  FaCode, FaSearch, FaCopy, FaCheck, FaCog, FaSync, FaChevronDown, FaChevronRight, FaPlay, FaSave, FaDownload, FaFileAlt, FaBolt
} from '../Icon'

interface FormatterConfig {
  language: string
  tabWidth: number
  printWidth: number
  useTabs: boolean
  singleQuote: boolean
  trailingComma: string
  semi: boolean
  bracketSpacing: boolean
  arrowParens: string
}

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', icon: '📘', color: 'text-blue-400' },
  { id: 'javascript', name: 'JavaScript', icon: '📒', color: 'text-yellow-400' },
  { id: 'json', name: 'JSON', icon: '📋', color: 'text-green-400' },
  { id: 'css', name: 'CSS', icon: '🎨', color: 'text-purple-400' },
  { id: 'html', name: 'HTML', icon: '🌐', color: 'text-red-400' },
  { id: 'markdown', name: 'Markdown', icon: '📝', color: 'text-gray-400' },
  { id: 'yaml', name: 'YAML', icon: '📄', color: 'text-cyan-400' },
]

const SAMPLE_CODE: Record<string, string> = {
  typescript: `import React,{useState,useEffect} from 'react';
import {useRouter} from 'next/router';

interface Props{id:number;name:string;onSelect:(id:number)=>void;}

export default function UserCard({id,name,onSelect}:Props){
const[loading,setLoading]=useState(false);
const[error,setError]=useState<string|null>(null);

useEffect(()=>{
async function fetchUser(){
setLoading(true);
try{
const res=await fetch(\`/api/users/\${id}\`);
const data=await res.json();
}catch(err){
setError(err.message);
}finally{
setLoading(false);
}
}
fetchUser();
},[id]);

if(loading)return <div>Loading...</div>;
if(error)return <div>Error: {error}</div>;

return(
<div className="user-card" onClick={()=>onSelect(id)}>
<h2>{name}</h2>
<p>ID: {id}</p>
</div>
);}`,
  javascript: `import React,{useState,useEffect} from 'react';
import {useRouter} from 'next/router';

export default function UserCard({id,name,onSelect}){
const[loading,setLoading]=useState(false);
const[error,setError]=useState(null);

useEffect(()=>{
async function fetchUser(){
setLoading(true);
try{
const res=await fetch(\`/api/users/\${id}\`);
const data=await res.json();
}catch(err){
setError(err.message);
}finally{
setLoading(false);
}
}
fetchUser();
},[id]);

if(loading)return <div>Loading...</div>;
if(error)return <div>Error: {error}</div>;

return(
<div className="user-card" onClick={()=>onSelect(id)}>
<h2>{name}</h2>
<p>ID: {id}</p>
</div>
);}`,
  json: `{"users":[{"id":1,"name":"Ahmed","email":"ahmed@example.com","role":"admin","active":true,"metadata":{"created":"2024-01-15","lastLogin":"2024-03-20","preferences":{"theme":"dark","notifications":true}}},{"id":2,"name":"Sara","email":"sara@example.com","role":"user","active":true,"metadata":{"created":"2024-02-20","lastLogin":"2024-03-19","preferences":{"theme":"light","notifications":false}}}]}`,
  css: `.user-card{display:flex;flex-direction:column;padding:1rem;margin:0.5rem;border-radius:8px;background:#1e1e2e;color:#cdd6f4;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:all 0.2s ease;}.user-card:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.2);}.user-card h2{margin:0 0 0.5rem 0;font-size:1.25rem;color:#cba6f7;}.user-card p{margin:0;color:#a6adc8;font-size:0.875rem;}`,
  html: `<div class="user-card" onclick="handleSelect(1)"><h2>Ahmed</h2><p>ID: 1</p><span class="badge">Admin</span></div>`,
  markdown: `# User Management System\n\n## Overview\n\nThis system manages user accounts and permissions.\n\n### Features\n- User registration\n- Authentication\n- Role-based access control\n\n## API Endpoints\n\n| Method | Endpoint | Description |\n|--------|----------|-------------|\n| GET | /users | List all users |\n| POST | /users | Create new user |\n| PUT | /users/:id | Update user |\n| DELETE | /users/:id | Delete user |`,
  yaml: `users:\n- id: 1\nname: Ahmed\nemail: ahmed@example.com\nrole: admin\nactive: true\nmetadata:\ncreated: 2024-01-15\npreferences:\ntheme: dark\nnotifications: true\n- id: 2\nname: Sara\nemail: sara@example.com\nrole: user\nactive: true\nmetadata:\ncreated: 2024-02-20\npreferences:\ntheme: light\nnotifications: false`,
}

function formatCode(code: string, config: FormatterConfig): string {
  let formatted = code

  if (config.language === 'json') {
    try {
      const parsed = JSON.parse(code)
      formatted = JSON.stringify(parsed, null, config.tabWidth)
    } catch { /* keep original */ }
  } else if (config.language === 'typescript' || config.language === 'javascript') {
    // Simple formatting simulation
    formatted = code
      .replace(/\{/g, ' {\n')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n')
      .replace(/,/g, ',\n')
      .replace(/\n\n\n/g, '\n\n')
    if (config.singleQuote) {
      formatted = formatted.replace(/"/g, "'")
    }
    if (!config.semi) {
      formatted = formatted.replace(/;/g, '')
    }
  } else if (config.language === 'css') {
    formatted = code
      .replace(/\{/g, ' {\n  ')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n  ')
      .replace(/\n  \n/g, '\n')
  } else if (config.language === 'html') {
    formatted = code
      .replace(/></g, '>\n<')
      .replace(/\n\n/g, '\n')
  } else if (config.language === 'yaml') {
    formatted = code
      .replace(/:\s+/g, ': ')
      .replace(/\n- /g, '\n  - ')
  } else if (config.language === 'markdown') {
    formatted = code
      .replace(/\n\n\n+/g, '\n\n')
      .replace(/\|/g, ' | ')
      .replace(/\n\|/g, '\n|')
  }

  return formatted
}

export default function CodeFormatterPanel({ onClose }: { onClose: () => void }) {
  const [inputCode, setInputCode] = useState(SAMPLE_CODE.typescript)
  const [config, setConfig] = useState<FormatterConfig>({
    language: 'typescript',
    tabWidth: 2,
    printWidth: 80,
    useTabs: false,
    singleQuote: true,
    trailingComma: 'es5',
    semi: true,
    bracketSpacing: true,
    arrowParens: 'always',
  })
  const [copied, setCopied] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [history, setHistory] = useState<Array<{ input: string; output: string; time: number }>>([])

  const output = useMemo(() => {
    const start = performance.now()
    const result = formatCode(inputCode, config)
    return result
  }, [inputCode, config])

  const handleFormat = () => {
    const start = performance.now()
    const result = formatCode(inputCode, config)
    const time = performance.now() - start
    setHistory(prev => [{ input: inputCode, output: result, time }, ...prev].slice(0, 10))
  }

  const handleLanguageChange = (lang: string) => {
    setConfig(prev => ({ ...prev, language: lang }))
    setInputCode(SAMPLE_CODE[lang] || '')
  }

  const copyOutput = () => {
    navigator.clipboard?.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const langInfo = LANGUAGES.find(l => l.id === config.language)

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">FaCode Formatter</span>
          <span className={`text-[10px] px-1.5 rounded ${langInfo?.color} bg-ide-bg-secondary`}>
            {langInfo?.icon} {langInfo?.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFormat}
            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs flex items-center gap-1"
          >
            <FaPlay size={10} /> Format
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1 rounded ${showConfig ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-secondary hover:text-ide-text'}`}
          >
            <FaCog size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Language Selector */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
        {LANGUAGES.map(lang => (
          <button
            key={lang.id}
            onClick={() => handleLanguageChange(lang.id)}
            className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 flex items-center gap-0.5 ${
              config.language === lang.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {lang.icon} {lang.name}
          </button>
        ))}
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="px-3 py-2 border-b border-ide-border bg-ide-bg-secondary/20">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">Tab Width</label>
              <select
                value={config.tabWidth}
                onChange={e => setConfig(prev => ({ ...prev, tabWidth: Number(e.target.value) }))}
                className="w-full bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">Print Width</label>
              <input
                type="number"
                value={config.printWidth}
                onChange={e => setConfig(prev => ({ ...prev, printWidth: Number(e.target.value) }))}
                className="w-full bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">Trailing Comma</label>
              <select
                value={config.trailingComma}
                onChange={e => setConfig(prev => ({ ...prev, trailingComma: e.target.value }))}
                className="w-full bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
              >
                <option value="none">None</option>
                <option value="es5">ES5</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">Arrow Parens</label>
              <select
                value={config.arrowParens}
                onChange={e => setConfig(prev => ({ ...prev, arrowParens: e.target.value }))}
                className="w-full bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
              >
                <option value="always">Always</option>
                <option value="avoid">Avoid</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <label className="flex items-center gap-1 text-[10px]">
              <input type="checkbox" checked={config.useTabs} onChange={e => setConfig(prev => ({ ...prev, useTabs: e.target.checked }))} className="rounded" />
              Use Tabs
            </label>
            <label className="flex items-center gap-1 text-[10px]">
              <input type="checkbox" checked={config.singleQuote} onChange={e => setConfig(prev => ({ ...prev, singleQuote: e.target.checked }))} className="rounded" />
              Single Quote
            </label>
            <label className="flex items-center gap-1 text-[10px]">
              <input type="checkbox" checked={config.semi} onChange={e => setConfig(prev => ({ ...prev, semi: e.target.checked }))} className="rounded" />
              Semicolons
            </label>
            <label className="flex items-center gap-1 text-[10px]">
              <input type="checkbox" checked={config.bracketSpacing} onChange={e => setConfig(prev => ({ ...prev, bracketSpacing: e.target.checked }))} className="rounded" />
              Bracket Spacing
            </label>
          </div>
        </div>
      )}

      {/* Editor Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input */}
        <div className="flex-1 flex flex-col border-r border-ide-border">
          <div className="px-2 py-1 text-[10px] text-ide-text-secondary bg-ide-bg-secondary/20 border-b border-ide-border flex items-center justify-between">
            <span>Input</span>
            <span className="text-ide-text-secondary/50">{inputCode.length} chars</span>
          </div>
          <textarea
            value={inputCode}
            onChange={e => setInputCode(e.target.value)}
            className="flex-1 bg-transparent text-[11px] font-mono p-2 outline-none text-ide-text resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col">
          <div className="px-2 py-1 text-[10px] text-ide-text-secondary bg-ide-bg-secondary/20 border-b border-ide-border flex items-center justify-between">
            <span>Output</span>
            <button
              onClick={copyOutput}
              className="flex items-center gap-0.5 hover:text-ide-text"
            >
              {copied ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="flex-1 bg-transparent text-[11px] font-mono p-2 text-ide-text overflow-auto whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-ide-border max-h-[80px] overflow-y-auto">
          <div className="px-3 py-1 text-[9px] text-ide-text-secondary bg-ide-bg-secondary/20">
            Recent Formats
          </div>
          {history.slice(0, 3).map((h, i) => (
            <div key={i} className="px-3 py-0.5 text-[9px] text-ide-text-secondary flex items-center gap-2 border-b border-ide-border/10">
              <FaBolt size={8} className="text-emerald-400" />
              <span>{h.output.length} chars output</span>
              <span>•</span>
              <span>{h.time.toFixed(1)}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>Format on Save: Enabled</span>
        <span>{output.length} chars output</span>
      </div>
    </div>
  )
}
