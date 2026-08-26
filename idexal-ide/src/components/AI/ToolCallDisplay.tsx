/**
 * ToolCallDisplay — renders AI tool calls as beautiful collapsible cards
 * with real-time status, icons, and output previews.
 */
import React, { useState } from 'react'
import {
  FaFileCode, FaEdit, FaSearch, FaTerminal, FaFolderOpen,
  FaCodeBranch, FaSync, FaChevronDown, FaChevronRight,
  FaCheck, FaTimes, FaSpinner, FaBolt, FaBug, FaShieldAlt,
  FaFlask, FaRocket, FaBrain, FaLightbulb, FaDatabase,
  FaCloud, FaCogs, FaList, FaBook, FaBolt as FaBoltIcon,
} from '../Icon'

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  result?: string
  success?: boolean
  timestamp: number
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  read_file: <FaFileCode size={14} className="text-blue-400" />,
  write_file: <FaEdit size={14} className="text-green-400" />,
  edit_file: <FaEdit size={14} className="text-yellow-400" />,
  search_code: <FaSearch size={14} className="text-purple-400" />,
  run_command: <FaTerminal size={14} className="text-orange-400" />,
  list_files: <FaFolderOpen size={14} className="text-cyan-400" />,
  git_status: <FaCodeBranch size={14} className="text-green-400" />,
  git_diff: <FaCodeBranch size={14} className="text-yellow-400" />,
  git_log: <FaCodeBranch size={14} className="text-blue-400" />,
  git_commit: <FaSync size={14} className="text-green-400" />,
  analyze_project: <FaCogs size={14} className="text-purple-400" />,
  get_project_tree: <FaFolderOpen size={14} className="text-cyan-400" />,
  run_tests: <FaFlask size={14} className="text-pink-400" />,
  run_build: <FaRocket size={14} className="text-orange-400" />,
  find_definitions: <FaSearch size={14} className="text-blue-400" />,
  find_references: <FaSearch size={14} className="text-indigo-400" />,
  read_dependencies: <FaCogs size={14} className="text-gray-400" />,
  find_todos: <FaLightbulb size={14} className="text-yellow-400" />,
  get_imports: <FaList size={14} className="text-blue-400" />,
  get_file_info: <FaFileCode size={14} className="text-gray-400" />,
}

const TOOL_LABELS: Record<string, string> = {
  read_file: 'Read File',
  write_file: 'Write File',
  edit_file: 'Edit File',
  search_code: 'Search Code',
  run_command: 'Run Command',
  list_files: 'List Files',
  git_status: 'Git Status',
  git_diff: 'Git Diff',
  git_log: 'Git Log',
  git_commit: 'Git Commit',
  analyze_project: 'Analyze Project',
  get_project_tree: 'Project Tree',
  run_tests: 'Run Tests',
  run_build: 'Build Project',
  find_definitions: 'Find Definitions',
  find_references: 'Find References',
  read_dependencies: 'Read Dependencies',
  find_todos: 'Find TODOs',
  get_imports: 'Get Imports',
  get_file_info: 'File Info',
}

function getToolSummary(name: string, args: Record<string, any>): string {
  switch (name) {
    case 'read_file': return args.path || 'file'
    case 'write_file': return args.path || 'file'
    case 'edit_file': return args.path || 'file'
    case 'search_code': return `"${args.pattern || ''}"`
    case 'run_command': return args.command || 'command'
    case 'list_files': return args.path || '.'
    case 'git_status': return 'repository'
    case 'git_diff': return args.file || 'all'
    case 'git_log': return `${args.count || 10} commits`
    case 'git_commit': return `"${(args.message || '').substring(0, 40)}"`
    case 'analyze_project': return args.path || 'project'
    case 'get_project_tree': return args.path || 'project'
    case 'run_tests': return args.pattern || 'all'
    case 'run_build': return args.command || 'auto-detect'
    case 'find_definitions': return args.name || 'symbol'
    case 'find_references': return args.name || 'symbol'
    case 'read_dependencies': return args.path || 'project'
    case 'find_todos': return args.type || 'all'
    case 'get_imports': return args.file || args.module || 'module'
    case 'get_file_info': return args.path || 'file'
    default: return JSON.stringify(args).substring(0, 50)
  }
}

interface ToolCallCardProps {
  tool: ToolCall
  defaultExpanded?: boolean
}

function ToolCallCard({ tool, defaultExpanded = false }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const icon = TOOL_ICONS[tool.name] || <FaBolt size={14} className="text-yellow-400" />
  const label = TOOL_LABELS[tool.name] || tool.name
  const summary = getToolSummary(tool.name, tool.arguments)

  const statusIcon = tool.success === undefined
    ? <FaSpinner size={12} className="text-blue-400 animate-spin" />
    : tool.success
      ? <FaCheck size={12} className="text-green-400" />
      : <FaTimes size={12} className="text-red-400" />

  const statusColor = tool.success === undefined
    ? 'border-blue-500/30 bg-blue-500/5'
    : tool.success
      ? 'border-green-500/20 bg-green-500/5'
      : 'border-red-500/20 bg-red-500/5'

  return (
    <div className={`border rounded-md ${statusColor} text-xs`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors"
      >
        <span className="flex-shrink-0">{expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}</span>
        {icon}
        <span className="font-semibold text-ide-text">{label}</span>
        <span className="text-ide-text-muted truncate flex-1 text-left">— {summary}</span>
        {statusIcon}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-ide-border px-3 py-2 space-y-2">
          {/* Arguments */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ide-text-muted mb-1">Arguments</div>
            <pre className="bg-ide-bg rounded p-2 text-ide-text overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(tool.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {tool.result && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ide-text-muted mb-1">Result</div>
              <pre className="bg-ide-bg rounded p-2 text-ide-text overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {tool.result.length > 1000 ? tool.result.substring(0, 1000) + '\n... (truncated)' : tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ToolCallGroupProps {
  tools: ToolCall[]
}

export function ToolCallGroup({ tools }: ToolCallGroupProps) {
  if (tools.length === 0) return null

  const completedCount = tools.filter(t => t.success !== undefined).length
  const failedCount = tools.filter(t => t.success === false).length

  return (
    <div className="my-2 space-y-1">
      <div className="flex items-center gap-2 px-1 mb-1">
        <FaBolt size={12} className="text-yellow-400" />
        <span className="text-[10px] uppercase tracking-wider text-ide-text-muted">
          {tools.length} tool call{tools.length > 1 ? 's' : ''}
        </span>
        {completedCount < tools.length && (
          <span className="text-[10px] text-blue-400">
            ({completedCount}/{tools.length} done)
          </span>
        )}
        {failedCount > 0 && (
          <span className="text-[10px] text-red-400">
            ({failedCount} failed)
          </span>
        )}
      </div>
      {tools.map(tool => (
        <ToolCallCard key={tool.id} tool={tool} defaultExpanded={false} />
      ))}
    </div>
  )
}

export default ToolCallCard
