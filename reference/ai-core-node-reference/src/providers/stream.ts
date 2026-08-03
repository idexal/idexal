// Idexal AI Core — streaming helpers
// Accumulates provider stream deltas into a full ChatResponse, and runs a
// single chat request against a provider with streaming when available.

import {
	type ChatRequest,
	type ChatResponse,
	type LLMProvider,
	type StreamDelta,
	type ToolCall,
	type TokenUsage,
} from './types.ts';

/**
 * Runs a chat request against one provider, preferring `provider.stream()`
 * when available and mirroring every delta to `request.onStream`. Falls back
 * to `provider.chat()` for non-streaming providers. Returns the accumulated
 * response plus the raw stream events (useful for progress UIs).
 */
export async function streamChat(
	provider: LLMProvider,
	request: ChatRequest,
): Promise<{ response: ChatResponse; events: StreamDelta[] }> {
	const events: StreamDelta[] = [];
	const emit = (delta: StreamDelta) => {
		events.push(delta);
		request.onStream?.(delta);
	};

	if (provider.stream) {
		const acc = await accumulateStream(provider, request, emit);
		return { response: acc, events };
	}

	const response = await provider.chat(request);
	if (response.usage) {
		emit({ type: 'usage', usage: response.usage });
	}
	for (const tc of response.toolCalls ?? []) {
		emit({ type: 'toolCall', toolCall: tc });
	}
	if (response.content) {
		emit({ type: 'text', text: response.content });
	}
	return { response, events };
}

/**
 * Consume `provider.stream(request)` and accumulate text / tool calls /
 * usage into a single ChatResponse. Every delta is forwarded to `emit`
 * (which by default also forwards to `request.onStream`).
 */
export async function accumulateStream(
	provider: LLMProvider,
	request: ChatRequest,
	emit: (delta: StreamDelta) => void = (d) => request.onStream?.(d),
): Promise<ChatResponse> {
	if (!provider.stream) {
		return provider.chat(request);
	}

	let content = '';
	// One tool call per id: SSE streams emit a `toolCall` delta on *every*
	// chunk while a call is in flight (arguments grow per chunk). We must
	// not push each delta as a separate call — the chat loop would execute
	// the same tool repeatedly. Merge by id, updating in place.
	const toolCalls = new Map<string, ToolCall>();
	let usage: TokenUsage | undefined;

	for await (const delta of provider.stream(request)) {
		switch (delta.type) {
			case 'text':
				content += delta.text;
				emit(delta);
				break;
			case 'toolCall': {
				const existing = toolCalls.get(delta.toolCall.id);
				if (existing) {
					// Keep the newest arguments (later chunks carry the full
					// accumulated string for OpenAI-style servers).
					if (delta.toolCall.name) existing.name = delta.toolCall.name;
					if (delta.toolCall.arguments) existing.arguments = delta.toolCall.arguments;
				} else {
					toolCalls.set(delta.toolCall.id, { ...delta.toolCall });
				}
				emit(delta);
				break;
			}
			case 'usage':
				usage = delta.usage;
				emit(delta);
				break;
			default:
				emit(delta);
		}
	}

	const merged = [...toolCalls.values()];
	return {
		content,
		toolCalls: merged.length > 0 ? merged : undefined,
		usage,
		model: request.model ?? provider.defaultModel,
	};
}


