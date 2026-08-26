/**
 * Registers extended tools into the main tool registry.
 * Call this at startup to add all extended tools.
 */
import { getAllToolDefinitions, executeTool, ToolResult, ToolDefinition } from './tools';
import { extendedTools } from './tools-extended';

// The extended tools are already exported as an array.
// We need to make them available to the tool loop.
// Since the tool loop calls getAllToolDefinitions() and executeTool(),
// we'll export a combined version.

export function getAllTools(): ToolDefinition[] {
  return [
    ...getAllToolDefinitions(),
    ...extendedTools.map(t => t.definition),
  ];
}

export async function executeAnyTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  // Try base tools first
  const baseResult = await executeTool(name, args);
  if (baseResult.content !== `Unknown tool: ${name}`) {
    return baseResult;
  }
  // Try extended tools
  const ext = extendedTools.find(t => t.definition.function.name === name);
  if (ext) {
    try {
      const content = await ext.executor(args);
      return { tool_call_id: '', name, content, success: true };
    } catch (err: any) {
      return { tool_call_id: '', name, content: `Tool error: ${err.message}`, success: false };
    }
  }
  return { tool_call_id: '', name, content: `Unknown tool: ${name}`, success: false };
}

export function getExtendedToolCount(): number {
  return extendedTools.length;
}

export function getExtendedToolNames(): string[] {
  return extendedTools.map(t => t.definition.function.name);
}
