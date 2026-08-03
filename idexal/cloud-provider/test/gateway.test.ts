// Idexal Cloud Gateway — integration tests
// Run directly: `node test/gateway.test.ts`
// Spins the real gateway on an ephemeral port with stub upstreams, then
// exercises /healthz, /v1/models, chat (JSON + SSE), embeddings, quotas
// (429), auth (401), and upstream fallback.

import * as assert from 'node:assert';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createGatewayServer } from '../src/server.ts';
import type { GatewayConfig } from '../src/config.ts';

// ---------------------------------------------------------------------------
// Stub upstreams
// ---------------------------------------------------------------------------

/** OpenAI-compatible stub: echoes chat (JSON + SSE) and embeddings. */
function stubOpenAiUpstream(): { server: Server; port: Promise<number>; requests: Array<{ path: string; body: unknown }> } {
	const requests: Array<{ path: string; body: unknown }> = [];
	const server = createServer((req, res) => {
		let body = '';
		req.on('data', (c) => (body += c));
		req.on('end', () => {
			let parsed: unknown = {};
			try {
				parsed = JSON.parse(body);
			} catch {
				// keep {}
			}
			requests.push({ path: req.url ?? '/', body: parsed });
			const url = new URL(req.url ?? '/', 'http://localhost');
			if (url.pathname === '/v1/chat/completions') {
				const isStream = (parsed as { stream?: boolean }).stream === true;
				if (isStream) {
					res.writeHead(200, { 'Content-Type': 'text/event-stream' });
					res.write('data: {"choices":[{"delta":{"role":"assistant"},"index":0}]}\n\n');
					res.write('data: {"choices":[{"delta":{"content":"Hello "},"index":0}]}\n\n');
					res.write('data: {"choices":[{"delta":{"content":"world"},"index":0}]}\n\n');
					res.write('data: {"choices":[{"delta":{},"finish_reason":"stop","index":0}],"usage":{"prompt_tokens":5,"completion_tokens":2}}\n\n');
					res.write('data: [DONE]\n\n');
					res.end();
				} else {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(
						JSON.stringify({
							id: 'chatcmpl-stub',
							object: 'chat.completion',
							model: (parsed as { model?: string }).model ?? 'stub',
							choices: [{ index: 0, message: { role: 'assistant', content: `stub reply to ${(parsed as { messages?: Array<{ content?: string }> }).messages?.[0]?.content ?? ''}` }, finish_reason: 'stop' }],
							usage: { prompt_tokens: 3, completion_tokens: 4 },
						}),
					);
				}
				return;
			}
			if (url.pathname === '/v1/embeddings') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				const input = (parsed as { input?: string[] }).input ?? [];
				res.end(JSON.stringify({ data: (Array.isArray(input) ? input : [input]).map((_, i) => ({ index: i, embedding: [0.1, 0.2, 0.3] })) }));
				return;
			}
			res.writeHead(404);
			res.end('{}');
		});
	});
	return { server, port: listen(server), requests };
}

/** Anthropic stub: handles /v1/messages (JSON + SSE) with Anthropic shape. */
function stubAnthropicUpstream(): { server: Server; port: Promise<number>; requests: Array<{ path: string; body: unknown }> } {
	const requests: Array<{ path: string; body: unknown }> = [];
	const server = createServer((req, res) => {
		let body = '';
		req.on('data', (c) => (body += c));
		req.on('end', () => {
			let parsed: unknown = {};
			try {
				parsed = JSON.parse(body);
			} catch {
				// keep {}
			}
			requests.push({ path: req.url ?? '/', body: parsed });
			const url = new URL(req.url ?? '/', 'http://localhost');
			if (url.pathname === '/v1/messages') {
				const isStream = (parsed as { stream?: boolean }).stream === true;
				if (isStream) {
					res.writeHead(200, { 'Content-Type': 'text/event-stream' });
					res.write(`event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":4}}}\n\n`);
					res.write(`event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`);
					res.write(`event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Bonjour "}}\n\n`);
					res.write(`event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"monde"}}\n\n`);
					res.write(`event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n`);
					res.write(`event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}\n\n`);
					res.write(`event: message_stop\ndata: {"type":"message_stop"}\n\n`);
					res.end();
				} else {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(
						JSON.stringify({
							id: 'msg_stub',
							content: [{ type: 'text', text: 'anthropic reply' }],
							usage: { input_tokens: 4, output_tokens: 5 },
							stop_reason: 'end_turn',
						}),
					);
				}
				return;
			}
			res.writeHead(404);
			res.end('{}');
		});
	});
	return { server, port: listen(server), requests };
}

/** Upstream that always fails (tests fallback). */
function stubFailingUpstream(): { server: Server; port: Promise<number> } {
	const server = createServer((_req, res) => {
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: { message: 'boom' } }));
	});
	return { server, port: listen(server) };
}

function listen(server: Server): Promise<number> {
	return new Promise((resolvePromise) => {
		server.listen(0, '127.0.0.1', () => {
			const addr = server.address();
			resolvePromise(typeof addr === 'object' && addr ? addr.port : 0);
		});
	});
}

// ---------------------------------------------------------------------------
// Gateway factory
// ---------------------------------------------------------------------------

async function startGateway(overrides: Partial<GatewayConfig> = {}) {
	// Bind an ephemeral port (port 0) so parallel/sequential tests never
	// collide; overrides are passed at construction (server reads them).
	const gateway = await createGatewayServer(process.env, {
		host: '127.0.0.1',
		port: 0,
		upstreams: [],
		trustDeviceHeader: true,
		...overrides,
	});
	const { port } = await gateway.listen();
	return { gateway, port, config: gateway.config };
}

function makeBaseConfig(tmpDir: string): Partial<GatewayConfig> {
	return {
		host: '127.0.0.1',
		port: 0,
		quotaDbPath: path.join(tmpDir, 'quota.db'),
		upstreams: [],
		trustDeviceHeader: true,
	};
}

async function post(port: number, pathname: string, body: unknown, headers: Record<string, string> = {}) {
	const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
	return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

async function get(port: number, pathname: string) {
	const res = await fetch(`http://127.0.0.1:${port}${pathname}`);
	return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

async function postStream(port: number, pathname: string, body: unknown, headers: Record<string, string> = {}) {
	const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
	const text = await res.text();
	return { status: res.status, text };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testHealthzAndModels() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const { gateway, port } = await startGateway(makeBaseConfig(tmp));
	try {
		const health = await get(port, '/healthz');
		assert.equal(health.status, 200);
		assert.equal((health.json as { status?: string }).status, 'ok');
		const models = await get(port, '/v1/models');
		assert.equal(models.status, 200);
		const ids = ((models.json as { data?: Array<{ id: string }> }).data ?? []).map((m) => m.id);
		assert.ok(ids.includes('idexal-1'), `expected idexal-1 in ${ids}`);
		assert.ok(ids.includes('idexal-embed-1'), `expected idexal-embed-1 in ${ids}`);
		console.log('  ✓ /healthz + /v1/models (catalog advertised)');
	} finally {
		await gateway.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testChatOpenAiNonStream() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const stub = stubOpenAiUpstream();
	const port = await stub.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			upstreams: [
				{ id: 'stub', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${port}/v1`, modelMap: { 'idexal-1': 'stub-model' }, priority: 1, timeoutMs: 10_000 },
			],
		});
		try {
			const res = await post(gport, '/v1/chat/completions', {
				model: 'idexal-1',
				messages: [{ role: 'user', content: 'hello' }],
			});
			assert.equal(res.status, 200);
			const choice = (res.json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0];
			assert.ok(choice?.message?.content?.includes('hello'), `content: ${choice?.message?.content}`);
			// The upstream received the mapped model name.
			const seen = stub.requests[stub.requests.length - 1];
			assert.equal((seen.body as { model?: string }).model, 'stub-model');
			console.log('  ✓ chat completions (non-stream, OpenAI upstream, model mapping)');
		} finally {
			await gateway.close();
		}
	} finally {
		stub.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testChatSsePassthrough() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const stub = stubOpenAiUpstream();
	const port = await stub.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			upstreams: [
				{ id: 'stub', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${port}/v1`, modelMap: { 'idexal-1': 'stub-model' }, priority: 1, timeoutMs: 10_000 },
			],
		});
		try {
			const res = await postStream(gport, '/v1/chat/completions', {
				model: 'idexal-1',
				messages: [{ role: 'user', content: 'stream me' }],
				stream: true,
			});
			assert.equal(res.status, 200);
			assert.ok(res.text.includes('data:'), 'expected SSE data lines');
			// Text arrives in separate chunks: "Hello " then "world".
			assert.ok(res.text.includes('"content":"Hello "'), `expected streamed text, got: ${res.text}`);
			assert.ok(res.text.includes('"content":"world"'), `expected streamed text, got: ${res.text}`);
			assert.ok(res.text.includes('data: [DONE]'), 'expected [DONE] terminator');
			console.log('  ✓ chat completions (SSE streaming passthrough)');
		} finally {
			await gateway.close();
		}
	} finally {
		stub.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testAnthropicTranslation() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const stub = stubAnthropicUpstream();
	const port = await stub.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			upstreams: [
				{ id: 'anthropic-stub', kind: 'anthropic', baseUrl: `http://127.0.0.1:${port}`, modelMap: { 'idexal-1': 'claude-stub' }, priority: 1, timeoutMs: 10_000, apiKey: 'sk-stub' },
			],
		});
		try {
			// Non-stream: Anthropic response → OpenAI shape.
			const res = await post(gport, '/v1/chat/completions', {
				model: 'idexal-1',
				messages: [{ role: 'user', content: 'hi' }],
			});
			assert.equal(res.status, 200);
			const choice = (res.json as { choices?: Array<{ message?: { content?: string }; finish_reason?: string | null }> }).choices?.[0];
			assert.equal(choice?.message?.content, 'anthropic reply');
			assert.equal(choice?.finish_reason, 'stop', 'anthropic end_turn → openai stop');
			const usage = (res.json as { usage?: { prompt_tokens?: number } }).usage;
			assert.equal(usage?.prompt_tokens, 4);

			// The upstream got the Anthropic wire format.
			const seen = stub.requests[stub.requests.length - 1];
			const body = seen.body as { model?: string; max_tokens?: number; messages?: unknown[] };
			assert.equal(body.model, 'claude-stub');
			assert.equal(typeof body.max_tokens, 'number', 'anthropic requires max_tokens');

			// Stream: Anthropic SSE → OpenAI SSE chunks.
			const stream = await postStream(gport, '/v1/chat/completions', {
				model: 'idexal-1',
				messages: [{ role: 'user', content: 'stream' }],
				stream: true,
			});
			assert.equal(stream.status, 200);
			// Text arrives in separate SSE chunks ("Bonjour " then "monde").
			assert.ok(stream.text.includes('"content":"Bonjour '), `expected translated stream text: ${stream.text}`);
			assert.ok(stream.text.includes('"content":"monde"'), `expected translated stream text: ${stream.text}`);
			assert.ok(stream.text.includes('data: [DONE]'), 'expected [DONE]');
			assert.ok(stream.text.includes('"content":"Bonjour'), 'expected OpenAI-style delta');

			console.log('  ✓ anthropic upstream (protocol translation: JSON + SSE)');
		} finally {
			await gateway.close();
		}
	} finally {
		stub.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testEmbeddings() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const stub = stubOpenAiUpstream();
	const port = await stub.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			upstreams: [
				{ id: 'stub', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${port}/v1`, modelMap: { 'idexal-embed-1': 'embed-stub' }, embeddingModel: 'embed-stub', priority: 1, timeoutMs: 10_000 },
			],
		});
		try {
			const res = await post(gport, '/v1/embeddings', { model: 'idexal-embed-1', input: ['a', 'b'] });
			assert.equal(res.status, 200);
			const data = (res.json as { data?: Array<{ index?: number; embedding?: number[] }> }).data;
			assert.equal(data?.length, 2);
			assert.deepEqual(data?.[0]?.embedding, [0.1, 0.2, 0.3]);
			console.log('  ✓ /v1/embeddings (forwarded + order preserved)');
		} finally {
			await gateway.close();
		}
	} finally {
		stub.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testAuth401() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			keys: ['secret-key-1'],
		});
		try {
			// Unknown key → 401.
			const res = await post(
				gport,
				'/v1/chat/completions',
				{ model: 'idexal-1', messages: [{ role: 'user', content: 'x' }] },
				{ Authorization: 'Bearer wrong-key' },
			);
			assert.equal(res.status, 401);
			const err = (res.json as { error?: { code?: string } }).error;
			assert.equal(err?.code, 'invalid_api_key');

			// No key at all → anonymous tier works (200 if an upstream exists).
			const anon = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: 'x' }] });
			assert.equal(anon.status, 503, 'no upstreams → 503 (anonymous still passes auth)');
			console.log('  ✓ auth (401 unknown key, anonymous tier passes)');
		} finally {
			await gateway.close();
		}
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testQuota429() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const stub = stubOpenAiUpstream();
	const port = await stub.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			anonLimits: { requestsPerDay: 2, outputTokensPerDay: 10_000, embeddingsPerDay: 2 },
			upstreams: [
				{ id: 'stub', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${port}/v1`, modelMap: { 'idexal-1': 'stub-model' }, priority: 1, timeoutMs: 10_000 },
			],
		});
		try {
			const first = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: '1' }] });
			const second = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: '2' }] });
			assert.equal(first.status, 200);
			assert.equal(second.status, 200);
			const third = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: '3' }] });
			assert.equal(third.status, 429, 'third request must exceed the daily quota');
			const err = (third.json as { error?: { code?: string } }).error;
			assert.equal(err?.code, 'requests_per_day');
			console.log('  ✓ quota (daily request limit → 429, retryable code)');
		} finally {
			await gateway.close();
		}
	} finally {
		stub.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

/**
 * Regression test for the burst-limiter tier bug: `enforceBurst()` computed
 * the correct per-tier limit but `BurstLimiter.allow()` ignored it and always
 * enforced the limiter's single constructor-time default (the anon rate),
 * so registered-key clients were silently throttled at the anonymous rate.
 */
async function testBurstLimitPerTier() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			keys: ['secret-key-1'],
			burstPerMinuteAnon: 2,
			burstPerMinuteKey: 5,
		});
		try {
			// Anonymous tier (burstPerMinuteAnon = 2): the 3rd request within
			// the window must be rate-limited.
			const a1 = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: '1' }] });
			const a2 = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: '2' }] });
			const a3 = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: '3' }] });
			assert.equal(a1.status, 503, 'no upstreams configured → 503 once past auth/burst/quota checks');
			assert.equal(a2.status, 503);
			assert.equal(a3.status, 429, 'anon tier must be limited at burstPerMinuteAnon (2)');
			assert.equal((a3.json as { error?: { code?: string } }).error?.code, 'rate_limit');

			// Registered-key tier (burstPerMinuteKey = 5): 5 requests — more
			// than the anon limit already exhausted above — must all clear the
			// burst check (503 = no upstream, never 429), proving the key
			// identity gets its own higher budget instead of the anon rate.
			for (let i = 0; i < 5; i++) {
				const res = await post(
					gport,
					'/v1/chat/completions',
					{ model: 'idexal-1', messages: [{ role: 'user', content: String(i) }] },
					{ Authorization: 'Bearer secret-key-1' },
				);
				assert.equal(res.status, 503, `key-tier request ${i} must pass the burst check (503 = no upstream, not 429)`);
			}
			console.log('  ✓ burst limiter applies the correct per-tier rate (anon vs registered key)');
		} finally {
			await gateway.close();
		}
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function testFallback() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const failing = stubFailingUpstream();
	const good = stubOpenAiUpstream();
	const fPort = await failing.port;
	const gPort = await good.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			upstreams: [
				{ id: 'failing', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${fPort}/v1`, modelMap: { 'idexal-1': 'm' }, priority: 1, timeoutMs: 10_000 },
				{ id: 'good', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${gPort}/v1`, modelMap: { 'idexal-1': 'm' }, priority: 2, timeoutMs: 10_000 },
			],
		});
		try {
			const res = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: 'fallback' }] });
			assert.equal(res.status, 200, 'must fall back to the healthy upstream');
			const content = (res.json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '';
			assert.ok(content.includes('fallback'), `got: ${content}`);
			console.log('  ✓ upstream fallback (500 upstream → healthy upstream serves)');
		} finally {
			await gateway.close();
		}
	} finally {
		failing.server.close();
		good.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

/**
 * Regression: the Anthropic SSE translator must stream tool-call arguments
 * as INCREMENTAL deltas (the core client accumulates across chunks with
 * `acc.arguments += …`). Emitting the full accumulated string per chunk
 * would duplicate the JSON and corrupt it.
 */
async function testAnthropicToolCallStreaming() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	// Stub that streams an Anthropic tool_use with split input_json_delta.
	const server = createServer((req, res) => {
		let body = '';
		req.on('data', (c) => (body += c));
		req.on('end', () => {
			let parsed: unknown = {};
			try {
				parsed = JSON.parse(body);
			} catch {
				// keep {}
			}
			if ((parsed as { stream?: boolean }).stream) {
				res.writeHead(200, { 'Content-Type': 'text/event-stream' });
				res.write(`event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":4}}}\n\n`);
				res.write(`event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"read_file"}}\n\n`);
				// Build the input_json_delta payloads with JSON.stringify so the
				// embedded quotes are ALWAYS escaped correctly on the wire
				// (hand-escaped `\"` in a template literal is fragile across
				// editors/tools and silently corrupts the SSE JSON).
				const d1 = JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"path":"a' } });
				const d2 = JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: 'b.txt"}' } });
				res.write(`event: content_block_delta\ndata: ${d1}\n\n`);
				res.write(`event: content_block_delta\ndata: ${d2}\n\n`);
				res.write(`event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n`);
				res.write(`event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":6}}\n\n`);
				res.write(`event: message_stop\ndata: {"type":"message_stop"}\n\n`);
				res.end();
			} else {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ content: [{ type: 'tool_use', id: 'toolu_1', name: 'read_file', input: { path: 'ab.txt' } }], usage: { input_tokens: 4, output_tokens: 6 }, stop_reason: 'tool_use' }));
			}
		});
	});
	const port = await listen(server);
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			upstreams: [
				{ id: 'anthropic-stub', kind: 'anthropic', baseUrl: `http://127.0.0.1:${port}`, modelMap: { 'idexal-1': 'claude-stub' }, priority: 1, timeoutMs: 10_000, apiKey: 'sk-stub' },
			],
		});
		try {
			const stream = await postStream(gport, '/v1/chat/completions', {
				model: 'idexal-1',
				messages: [{ role: 'user', content: 'read a file' }],
				stream: true,
			});
			assert.equal(stream.status, 200);

			// Reconstruct the tool-call arguments the way the core client
			// does (concatenate every arguments fragment) and verify the
			// result is valid, unduplicated JSON.
			let accumulated = '';
			let name = '';
			for (const line of stream.text.split('\n')) {
				if (!line.startsWith('data:') || line.includes('[DONE]')) continue;
				try {
					const chunk = JSON.parse(line.slice(5).trim()) as {
						choices?: Array<{ delta?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
					};
					const tc = chunk.choices?.[0]?.delta?.tool_calls?.[0];
					if (!tc) continue;
					if (tc.function?.name) name = tc.function.name;
					if (tc.function?.arguments) accumulated += tc.function.arguments;
				} catch {
					// skip non-JSON lines
				}
			}
			assert.equal(name, 'read_file');
			assert.equal(accumulated, '{"path":"ab.txt"}', `accumulated arguments must be exact JSON, got: ${accumulated}`);
			assert.deepEqual(JSON.parse(accumulated), { path: 'ab.txt' }, 'accumulated arguments must parse as valid JSON');
			console.log('  ✓ anthropic tool-call streaming (incremental arguments, JSON intact)');
		} finally {
			await gateway.close();
		}
	} finally {
		server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

/** Quota reconcile: refund of the unused estimate after a successful call. */
async function testQuotaReconcile() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
	const stub = stubOpenAiUpstream();
	const port = await stub.port;
	try {
		const { gateway, port: gport } = await startGateway({
			...makeBaseConfig(tmp),
			// Tiny token budget so the estimate (1024) alone would exceed it
			// — the pre-charge must NOT reject, and the refund must restore.
			anonLimits: { requestsPerDay: 10, outputTokensPerDay: 2_000, embeddingsPerDay: 2 },
			upstreams: [
				{ id: 'stub', kind: 'openai-compatible', baseUrl: `http://127.0.0.1:${port}/v1`, modelMap: { 'idexal-1': 'stub-model' }, priority: 1, timeoutMs: 10_000 },
			],
		});
		try {
			// Stub returns usage.completion_tokens=4, but the estimate is 1024.
			const res = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: 'hi' }] });
			assert.equal(res.status, 200);
			// After refund, the counter must reflect ~4 tokens, not 1024, so a
			// second request still fits in the 2000-token budget.
			const second = await post(gport, '/v1/chat/completions', { model: 'idexal-1', messages: [{ role: 'user', content: 'hi again' }] });
			assert.equal(second.status, 200, 'refund must keep the token budget from being consumed by estimates');
			console.log('  ✓ quota reconcile (estimate pre-charge refunded to actual usage)');
		} finally {
			await gateway.close();
		}
	} finally {
		stub.server.close();
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
	console.log('\nIdexal Cloud Gateway — integration tests\n');
	await testHealthzAndModels();
	await testChatOpenAiNonStream();
	await testChatSsePassthrough();
	await testAnthropicTranslation();
	await testEmbeddings();
	await testAuth401();
	await testQuota429();
	await testBurstLimitPerTier();
	await testQuotaReconcile();
	await testFallback();
	await testAnthropicToolCallStreaming();
	console.log('\nAll gateway tests passed ✓\n');
}

main().catch((err) => {
	console.error('\nGateway test failure:', err);
	process.exitCode = 1;
});
