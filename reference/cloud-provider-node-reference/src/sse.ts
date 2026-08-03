// Idexal Cloud Gateway — SSE helpers
// OpenAI-compatible Server-Sent Events: every chunk is `data: <json>\n\n`,
// terminated by `data: [DONE]\n\n`.

import type { ServerResponse } from 'node:http';

export function startSse(res: ServerResponse, extraHeaders: Record<string, string> = {}): void {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
		...extraHeaders,
	});
	res.write('retry: 1000\n\n');
}

export function sseData(res: ServerResponse, obj: unknown): void {
	res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

export function sseDone(res: ServerResponse): void {
	res.write('data: [DONE]\n\n');
}

/** Emit a machine-readable OpenAI-style error event then end the stream. */
export function sseError(res: ServerResponse, status: number, message: string, code: string): void {
	sseData(res, { error: { message, type: 'server_error', code, status } });
	res.end();
}

export function sseComment(res: ServerResponse, text: string): void {
	res.write(`: ${text}\n\n`);
}
