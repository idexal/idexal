#!/usr/bin/env node
// Idexal Cloud Gateway — HTTP server
// Zero-dependency OpenAI-compatible gateway: /healthz, /v1/models,
// /v1/chat/completions (JSON + SSE streaming), /v1/embeddings. Enforces
// freemium quotas per anonymous device / registered key, and routes to
// OpenAI/Anthropic/Ollama upstreams with automatic fallback.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadConfig, describeConfig, maybeReadEnvFile, upstreamKey, type GatewayConfig } from './config.ts';
import { QuotaStore, BurstLimiter, QuotaExceededError } from './quota.ts';
import { resolveIdentity, clientIp, AuthError, type Identity } from './auth.ts';
import { Router, GatewayError } from './router.ts';
import { listModels } from './models.ts';
import { startSse, sseData, sseDone, sseError } from './sse.ts';

export interface GatewayServer {
	config: GatewayConfig;
	router: Router;
	quota: QuotaStore;
	listen: () => Promise<{ port: number }>;
	close: () => Promise<void>;
}

const MAX_BODY = 5 * 1024 * 1024; // 5 MB

/**
 * Create the gateway server. `overrides` win over env-loaded config (used
 * by tests to bind an ephemeral port and inject stub upstreams).
 */
export async function createGatewayServer(
	env: NodeJS.ProcessEnv = process.env,
	overrides: Partial<GatewayConfig> = {},
): Promise<GatewayServer> {
	maybeReadEnvFile();
	const config = { ...loadConfig(env), ...overrides };
	const router = new Router(config.upstreams);
	const quota = new QuotaStore(config.quotaDbPath);
	const burst = new BurstLimiter(config.burstPerMinuteAnon);

	let server: ReturnType<typeof createServer>;
	// Track sockets so close() can destroy keep-alive connections promptly
	// (server.close() alone waits for idle sockets to time out).
	const sockets = new Set<import('node:net').Socket>();

	const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
		setCommonHeaders(res, config);

		// CORS preflight.
		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
		const pathname = url.pathname;

		try {
			if (req.method === 'GET' && pathname === '/healthz') {
				return respondJson(res, 200, {
					status: 'ok',
					version: '0.1.0',
					models: router.advertisedModels(),
					upstreams: router.health().upstreams,
					time: new Date().toISOString(),
				});
			}
			if (req.method === 'GET' && pathname === '/v1/models') {
				return respondJson(res, 200, {
					object: 'list',
					data: listModels().map((m) => ({
						id: m.id,
						object: 'model',
						created: 0,
						owned_by: 'idexal',
						kind: m.kind,
						description: m.description,
					})),
				});
			}
			if (req.method === 'POST' && pathname === '/v1/chat/completions') {
				await handleChat(req, res, config, router, quota, burst);
				return;
			}
			if (req.method === 'POST' && pathname === '/v1/embeddings') {
				await handleEmbeddings(req, res, config, router, quota, burst);
				return;
			}
			return respondError(res, 404, 'Not found', 'not_found');
		} catch (err) {
			if (err instanceof AuthError) return respondError(res, 401, err.message, err.code);
			if (err instanceof QuotaExceededError) return respondError(res, 429, err.message, err.code);
			if (err instanceof GatewayError) return respondError(res, err.status, err.message, err.code);
			// Body too large / malformed JSON etc.
			const status = err instanceof BodyTooLargeError ? 413 : 400;
			return respondError(res, status, err instanceof Error ? err.message : String(err), 'bad_request');
		}
	};

	server = createServer((req, res) => {
		handle(req, res).catch((err) => {
			// Never let an unhandled rejection kill the process mid-request.
			try {
				respondError(res, 500, err instanceof Error ? err.message : String(err), 'internal_error');
			} catch {
				res.end();
			}
		});
	});
	// Track live sockets so close() can destroy keep-alive connections
	// promptly (server.close() alone waits for idle sockets to time out).
	server.on('connection', (socket) => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
	});

	return {
		config,
		router,
		quota,
		listen: () =>
			new Promise((resolvePromise, reject) => {
				server.once('error', reject);
				server.listen(config.port, config.host, () => {
					const addr = server.address();
					const port = typeof addr === 'object' && addr ? addr.port : config.port;
					resolvePromise({ port });
				});
			}),
		close: () =>
			new Promise((resolvePromise) => {
				quota.close();
				for (const s of sockets) s.destroy();
				sockets.clear();
				server.close(() => resolvePromise());
				// Safety net in case an in-flight request refuses to finish.
				setTimeout(() => resolvePromise(), 500);
			}),
	};
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleChat(
	req: IncomingMessage,
	res: ServerResponse,
	config: GatewayConfig,
	router: Router,
	quota: QuotaStore,
	burst: BurstLimiter,
): Promise<void> {
	const identity = identify(req, config);
	enforceBurst(burst, identity, config);

	const body = (await readBody(req)) as Record<string, unknown> & {
		model?: string;
		messages?: unknown[];
		stream?: boolean;
		max_tokens?: number;
		maxTokens?: number;
		temperature?: number;
		stop?: string | string[];
		tools?: unknown[];
		tool_choice?: unknown;
		stream_options?: unknown;
	};
	if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object.');
	if (!Array.isArray(body.messages)) throw new Error('"messages" is required and must be an array.');
	if (!body.model) throw new Error('"model" is required.');

	const outputTokens = estimateOutputTokens(body);

	if (body.stream) {
		// Stream: quota check before the first byte; tokens are charged on
		// the final usage chunk (approximated from the request).
		consumeChat(quota, identity, config, outputTokens);
		startSse(res);
		try {
			const result = await router.chat({ ...(body as object), stream: true });
			if (result.stream) {
				await pipeStream(result.stream, res);
			} else {
				sseError(res, 502, 'Upstream returned no stream', 'upstream_error');
			}
		} catch (err) {
			if (err instanceof GatewayError) {
				sseError(res, err.status, err.message, err.code);
			} else {
				sseError(res, 500, err instanceof Error ? err.message : String(err), 'internal_error');
			}
		}
		return;
	}

	// Non-streaming: pre-check + charge the estimate BEFORE hitting the
	// upstream, so an over-quota request is rejected with 429 instead of
	// spending upstream tokens first. After success, reconcile with the
	// actual usage (refund the unused estimate).
	consumeChat(quota, identity, config, estimateOutputTokens(body));
	const result = await router.chat({ ...(body as object), stream: false });
	if (result.status !== 200 || result.body === undefined) {
		throw new GatewayError(
			typeof result.body === 'object' && result.body !== null && 'error' in result.body
				? String((result.body as { error: { message?: string } }).error?.message ?? 'upstream error')
				: `Upstream error (HTTP ${result.status})`,
			502,
			'upstream_error',
		);
	}
	const usage = (result.body as { usage?: { completion_tokens?: number } }).usage;
	quota.adjustTokens(identity.id, (usage?.completion_tokens ?? 0) - estimateOutputTokens(body));
	respondJson(res, 200, result.body);
}

async function handleEmbeddings(
	req: IncomingMessage,
	res: ServerResponse,
	config: GatewayConfig,
	router: Router,
	quota: QuotaStore,
	burst: BurstLimiter,
): Promise<void> {
	const identity = identify(req, config);
	enforceBurst(burst, identity, config);

	const body = (await readBody(req)) as { model?: string; input?: string | string[] };
	if (!body || !body.model) throw new Error('"model" is required.');
	if (body.input === undefined) throw new Error('"input" is required.');

	consumeEmbedding(quota, identity, config);
	const result = await router.embeddings({ model: body.model, input: body.input });
	if (result.status !== 200) {
		throw new GatewayError(`Embeddings upstream error (HTTP ${result.status})`, 502, 'upstream_error');
	}
	respondJson(res, 200, result.body);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function identify(req: IncomingMessage, config: GatewayConfig): Identity {
	const auth = req.headers.authorization;
	const device = config.trustDeviceHeader ? (req.headers['x-idexal-device'] as string | undefined) : undefined;
	const ip = clientIp(req.socket.remoteAddress, req.headers['x-forwarded-for'] as string | undefined);
	return resolveIdentity(auth, device, ip, config.keys);
}

function enforceBurst(burst: BurstLimiter, identity: Identity, config: GatewayConfig): void {
	const limit = identity.tier === 'key' ? config.burstPerMinuteKey : config.burstPerMinuteAnon;
	if (!burst.allow(identity.id, limit)) {
		throw new GatewayError('Too many requests — slow down and try again in a minute.', 429, 'rate_limit');
	}
}

function consumeChat(quota: QuotaStore, identity: Identity, config: GatewayConfig, outputTokens: number): void {
	quota.consumeChat(identity.id, outputTokens, identity.tier === 'key' ? config.keyLimits : config.anonLimits);
}

function consumeEmbedding(quota: QuotaStore, identity: Identity, config: GatewayConfig): void {
	quota.consumeEmbedding(identity.id, identity.tier === 'key' ? config.keyLimits : config.anonLimits);
}

/** Rough output-token estimate for the quota (before the model answers). */
function estimateOutputTokens(body: { max_tokens?: number; maxTokens?: number }): number {
	return body.max_tokens ?? body.maxTokens ?? 1024;
}

class BodyTooLargeError extends Error {}

function readBody(req: IncomingMessage): Promise<unknown> {
	return new Promise((resolvePromise, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on('data', (c: Buffer) => {
			size += c.length;
			if (size > MAX_BODY) {
				reject(new BodyTooLargeError('Request body too large (max 5 MB).'));
				req.destroy();
				return;
			}
			chunks.push(c);
		});
		req.on('end', () => {
			if (chunks.length === 0) {
				resolvePromise({});
				return;
			}
			try {
				resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch (err) {
				reject(new Error(`Invalid JSON body: ${err instanceof Error ? err.message : String(err)}`));
			}
		});
		req.on('error', reject);
	});
}

async function pipeStream(source: ReadableStream<Uint8Array>, res: ServerResponse): Promise<void> {
	const reader = source.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			// OpenAI-compatible passthrough: forward complete `data:` lines.
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.startsWith('data:')) {
					res.write(line + '\n');
					if (trimmed === 'data: [DONE]') {
						res.end();
						return;
					}
				} else if (trimmed) {
					res.write(line + '\n');
				}
			}
		}
		if (buffer.trim()) res.write(buffer);
		if (!res.writableEnded) res.end();
	} catch {
		// Client aborted mid-stream (or upstream died): cancel the source
		// reader so the upstream fetch body connection is released, then end.
		void reader.cancel().catch(() => undefined);
		if (!res.writableEnded) res.end();
	}
}

function setCommonHeaders(res: ServerResponse, config: GatewayConfig): void {
	res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Idexal-Device');
	res.setHeader('X-Idexal-Gateway', '0.1.0');
	res.setHeader('Cache-Control', 'no-store');
}

function respondJson(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

function respondError(res: ServerResponse, status: number, message: string, code: string): void {
	respondJson(res, status, { error: { message, type: 'error', code, status } });
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

// Run directly: `node src/server.ts` (also `npm start`). Guarded so tests
// can import createGatewayServer without starting a listener. Compare the
// module's own URL against the resolved argv[1] (pathToFileURL handles
// Windows drive letters; the old `new URL('.', import.meta.url).pathname`
// trick produced `file:///C:/C:/…` on Windows).
const isMain =
	process.argv[1] !== undefined &&
	import.meta.url ===
		(await import('node:url')).pathToFileURL((await import('node:path')).resolve(process.argv[1])).href;

if (isMain) {
	const gateway = await createGatewayServer();
	const { port } = await gateway.listen();
	console.log('\n  ╭──────────────────────────────────────────────╮');
	console.log('  │        Idexal Cloud Gateway (v0.1.0)        │');
	console.log('  ╰──────────────────────────────────────────────╯\n');
	console.log(describeConfig({ ...gateway.config, port }));
	console.log(`\n  Health:   http://127.0.0.1:${port}/healthz`);
	console.log(`  Models:   http://127.0.0.1:${port}/v1/models`);
	console.log(`  Chat:     POST http://127.0.0.1:${port}/v1/chat/completions`);
	console.log(`  Embed:    POST http://127.0.0.1:${port}/v1/embeddings\n`);

	process.on('SIGINT', () => {
		void gateway.close().then(() => process.exit(0));
	});
	process.on('SIGTERM', () => {
		void gateway.close().then(() => process.exit(0));
	});
}
