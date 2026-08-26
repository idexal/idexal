import chalk from 'chalk';
import { AIProvider, ChatMessage } from './provider';
import { getAllToolDefinitions, executeTool, ToolResult, ToolDefinition } from './tools';
import { getAllTools, executeAnyTool } from './tools-registry';

const MAX_TOOL_ROUNDS = 20;
const MAX_TOOL_OUTPUT = 8000;

export interface ToolLoopOptions {
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onToolResult?: (result: ToolResult) => void;
  onText?: (text: string) => void;
  temperature?: number;
}

/**
 * Run the agentic tool-use loop: send messages with tool definitions,
 * execute any tool calls, feed results back, repeat until the model
 * produces a final text response with no tool calls.
 */
export async function runToolLoop(
  provider: AIProvider,
  options: ToolLoopOptions
): Promise<string> {
  const { model, systemPrompt, messages, onToolCall, onToolResult, onText } = options;
  const tools = getAllTools();

  let round = 0;
  const allMessages: ChatMessage[] = [...messages];
  let finalText = '';

  while (round < MAX_TOOL_ROUNDS) {
    round++;

    // Call the model with tools
    const response = await provider.chatWithTools(
      allMessages,
      systemPrompt,
      model,
      tools,
      { temperature: options.temperature ?? 0.7, maxTokens: 8192 }
    );

    // Process the response
    if (response.text) {
      finalText += response.text;
      if (onText) onText(response.text);
    }

    // If no tool calls, we're done
    if (!response.toolCalls || response.toolCalls.length === 0) {
      break;
    }

    // Execute each tool call
    const toolResults: ToolResult[] = [];

    for (const toolCall of response.toolCalls) {
      if (onToolCall) onToolCall(toolCall.name, toolCall.arguments);

      let result = await executeAnyTool(toolCall.name, toolCall.arguments);

      // Truncate large outputs
      if (result.content.length > MAX_TOOL_OUTPUT) {
        result = {
          ...result,
          content: result.content.slice(0, MAX_TOOL_OUTPUT) + `\n\n... (truncated, ${result.content.length} total chars)`,
        };
      }

      if (onToolResult) onToolResult(result);
      toolResults.push(result);
    }

    // Add assistant message and tool results to conversation
    allMessages.push({
      role: 'assistant',
      content: response.text || '',
      tool_calls: response.toolCalls,
    });

    for (const tr of toolResults) {
      allMessages.push({
        role: 'tool',
        content: tr.content,
        tool_call_id: tr.tool_call_id,
      } as any);
    }
  }

  if (round >= MAX_TOOL_ROUNDS) {
    finalText += `\n\n${chalk.yellow('⚠ Reached maximum tool rounds (20). Stopping.')}`;
  }

  return finalText;
}

/**
 * Format tool call for display
 */
export function formatToolCall(name: string, args: Record<string, any>): string {
  const argStr = Object.entries(args)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      const truncated = val.length > 100 ? val.slice(0, 100) + '...' : val;
      return `${chalk.dim(`${k}:`)} ${truncated}`;
    })
    .join('\n  ');

  return `${chalk.cyan('⚡')} ${chalk.bold.cyan(name)}\n  ${argStr}`;
}

/**
 * Format tool result for display
 */
export function formatToolResult(result: ToolResult): string {
  const icon = result.success ? chalk.green('✓') : chalk.red('✗');
  const preview = result.content.length > 200
    ? result.content.slice(0, 200) + '...'
    : result.content;
  return `${icon} ${chalk.dim(`${result.name}:`)} ${preview}`;
}
