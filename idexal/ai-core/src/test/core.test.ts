// Idexal AI Core — integration tests
// Run directly with Node: `node idexal/ai-core/src/test/core.test.ts`
// Uses a MockProvider so no API keys or network are required.

import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { OpenAiCompatibleProvider } from '../providers/openaiCompat.ts';
import { AnthropicProvider } from '../providers/anthropic.ts';
import { createProvider } from '../providers/factory.ts';
import { ProviderRegistry } from '../providers/registry.ts';
import { expandEnv, extractEnvRefs, missingEnvRefs, expandEnvDeep, missingEnvRefsDeep } from '../providers/envRefs.ts';
import {
	type LLMProvider,
	type ChatRequest,
	type ChatResponse,
	type StreamDelta,
	supportsEmbeddings,
	ProviderError,
} from '../providers/types.ts';
import { streamChat } from '../providers/stream.ts';
import { MemoryStore } from '../memory/sqliteStore.ts';
import { MemoryService } from '../memory/memoryService.ts';
import { pickEmbedder } from '../memory/embedder.ts';
import { ChatLoop } from '../chat.ts';
import { ALL_TOOLS, READ_ONLY_TOOLS, readOnlyTools, executeTool } from '../tools/tools.ts';
import { TerminalManager } from '../terminal/terminalManager.ts';
import { Orchestrator } from '../agents/orchestrator.ts';
import { UsageStore } from '../usage/usageStore.ts';
import { type AgentConfig, loadConfig, CLOUD_PROVIDER_ID, DEFAULT_CLOUD, writeProviderToConfig, removeProviderFromConfig, getGlobalConfigPath } from '../config.ts';
import { suggestProviders, formatPriority } from '../setup/probe.ts';
import { writeConfigFile } from '../setup/write.ts';
import { createServer, type Server } from 'node:http';
import { readClaudeSettings, resolveClaudeModel, injectClaudeEnv, loadClaudeInstructions } from '../compat/claudeCode.ts';
import { parseFrontmatter, mapClaudeTools, loadClaudeSubagents } from '../compat/subagents.ts';
import { migrateClaudeMemory, claudeMdToFacts } from '../compat/migrate.ts';
import { probeProviderModels } from '../providers/connectionTest.ts';

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

class MockProvider implements LLMProvider {
	readonly id: string;
	readonly displayName: string;
	readonly defaultModel = 'mock-model';
	readonly capabilities = { toolCalling: true, contextWindow: 100_000 };
	readonly baseUrl = 'http://mock.local';
	// Keyless test double — must be treated as usable by the registry's
	// fallback filter (anonymous tier) so fallback tests exercise failover.
	readonly anonymous = true;

	failFirst: boolean;
	private calls = 0;

	constructor(id: string, failFirst = false) {
		this.id = id;
		this.failFirst = failFirst;
	}

	estimateCost() {
		return { input: 0, output: 0 };
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		this.calls++;
		if (this.failFirst && this.calls === 1) {
			throw new ProviderError('simulated 429 rate limit', 429, this.id);
		}

		// If the last message asks for a tool call in JSON, respond accordingly
		const last = request.messages[request.messages.length - 1];
		const userText = request.messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ');

		if (this.id.startsWith('planner') || userText.toLowerCase().includes('plan this task')) {
			return {
				content: '["Step 1: inspect project", "Step 2: implement"]',
				model: this.defaultModel,
				usage: { inputTokens: 10, outputTokens: 5 },
			};
		}

		if (userText.includes('review') || userText.toLowerCase().includes('assess and reply')) {
			return {
				content: '{"verdict": "ok"}',
				model: this.defaultModel,
				usage: { inputTokens: 10, outputTokens: 5 },
			};
		}

		const hasToolResult = request.messages.some(
			(m) => m.role === 'user' && 'toolCallId' in m && (m as { toolCallId?: string }).toolCallId,
		);

		if (request.tools?.length && !hasToolResult) {
			return {
				content: '',
				toolCalls: [{ id: 'call-1', name: 'list_dir', arguments: '{}' }],
				model: this.defaultModel,
				usage: { inputTokens: 10, outputTokens: 5 },
			};
		}

		if (hasToolResult) {
			// Tool result round-trip: final answer
			return {
				content: `Completed task. Last message: ${last?.content ?? ''}`,
				model: this.defaultModel,
				usage: { inputTokens: 10, outputTokens: 5 },
			};
		}

		return {
			content: `Mock response from ${this.id}: ${last?.content ?? ''}`,
			model: this.defaultModel,
			usage: { inputTokens: 10, outputTokens: 5 },
		};
	}
}

/** Mock provider with a streaming implementation (token-level deltas). */
class MockStreamProvider implements LLMProvider {
	readonly id: string;
	readonly displayName: string;
	readonly defaultModel = 'stream-model';
	readonly capabilities = { toolCalling: true, contextWindow: 100_000, embeddings: true };
	readonly baseUrl = 'http://mock-stream.local';
	// Keyless test double — usable by the registry's fallback filter.
	readonly anonymous = true;

	failFirst: boolean;
	private calls = 0;

	constructor(id: string, failFirst = false) {
		this.id = id;
		this.failFirst = failFirst;
	}

	async *stream(request: ChatRequest): AsyncGenerator<StreamDelta> {
		this.calls++;
		// Optional first-call failure mid-stream to exercise fallback: some
		// text is emitted, then a 429 error. The registry must retry on
		// another provider.
		if (this.failFirst && this.calls === 1) {
			yield { type: 'text', text: 'partial ' };
			throw new ProviderError('simulated mid-stream 429', 429, this.id);
		}
		yield { type: 'text', text: 'Hello, ' };
		yield { type: 'text', text: 'world!' };
		yield { type: 'toolCall', toolCall: { id: 'tc-1', name: 'read_file', arguments: '{}' } };
		yield { type: 'usage', usage: { inputTokens: 12, outputTokens: 4 } };
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		return {
			content: 'non-streaming',
			model: this.defaultModel,
			usage: { inputTokens: 1, outputTokens: 1 },
		};
	}
}

/** Deterministic fake embedder for semantic-memory tests. */
function fakeEmbedder(vocab: string[]) {
	return async (texts: string[]): Promise<number[][]> => {
		const out: number[][] = [];
		for (const t of texts) {
			const lower = t.toLowerCase();
			// One-hot-ish vector: dimension i = 1 if the vocab word is present.
			out.push(vocab.map((w) => (lower.includes(w) ? 1 : 0)));
		}
		return out;
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testProviderFactory() {
	const openai = new OpenAiCompatibleProvider({
		id: 'openai-test',
		displayName: 'OpenAI Test',
		baseUrl: 'http://localhost:9999/v1',
		defaultModel: 'gpt-test',
	});
	assert.equal(openai.id, 'openai-test');
	assert.equal(openai.baseUrl, 'http://localhost:9999/v1');

	const anthropic = new AnthropicProvider({ id: 'anthropic-test', defaultModel: 'claude-test' });
	assert.equal(anthropic.capabilities.toolCalling, true);
	console.log('  ✓ provider factory & capabilities');
}

async function testFallbackEngine() {
	const registry = new ProviderRegistry();
	const primary = new MockProvider('primary', /* failFirst */ true);
	const backup = new MockProvider('backup');
	registry.register(primary);
	registry.register(backup);

	let retries = 0;
	const response = await registry.chatWithFallback(
		{ messages: [{ role: 'user', content: 'hello' }] },
		{ onRetry: () => retries++ },
	);
	assert.ok(retries >= 1, 'expected at least one failover retry');
	assert.ok(response.content.includes('backup'), 'expected backup provider to answer');
	console.log('  ✓ automatic fallback engine (primary failed → backup succeeded, retries=' + retries + ')');
}

async function testLongTermMemory() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-mem-'));
	const store = new MemoryStore(path.join(dir, 'mem.db'));
	const service = new MemoryService(store, 'test-project');

	service.learnFact('The build command is npm run compile-client');
	service.rememberDecision('We use TypeScript with strict mode');
	service.rememberEpisode('Migrated settings editor to v2 API');

	// Recall by relevance
	const recalled = service.recall('how do we build?', { limit: 5 });
	assert.ok(recalled.length > 0, 'expected at least one memory recalled');
	assert.ok(recalled.some((e) => e.content.includes('compile-client')), 'expected build fact recalled');

	// Context augmentation (async now that semantic recall may be enabled)
	const prompt = await service.augmentSystemPrompt('You are Idexal.', 'how do we build the project?');
	assert.ok(prompt.includes('compile-client'), 'expected memory injected into system prompt');

	store.close();
	fs.rmSync(dir, { recursive: true, force: true });
	console.log('  ✓ long-term memory (fact, decision, episode, recall, context injection)');
}

async function testToolExecution() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-tools-'));
	fs.writeFileSync(path.join(dir, 'hello.txt'), 'hello idexal');

	const writeRes = await executeTool('write_file', { path: 'new.txt', content: 'data' }, { cwd: dir });
	assert.ok(writeRes.ok);
	const readRes = await executeTool('read_file', { path: 'hello.txt' }, { cwd: dir });
	assert.ok(readRes.ok && readRes.output.includes('hello idexal'));

	const listRes = await executeTool('list_dir', {}, { cwd: dir });
	assert.ok(listRes.output.includes('hello.txt'));

	// `echo` works in both cmd.exe (Windows) and /bin/sh (Unix)
	const runRes = await executeTool('run_command', { command: 'echo idexal-run-42' }, { cwd: dir });
	assert.ok(runRes.ok && runRes.output.includes('idexal-run-42'), `run_command output: ${JSON.stringify(runRes)}`);

	const searchRes = await executeTool('search_files', { pattern: 'idexal' }, { cwd: dir });
	assert.ok(searchRes.ok && searchRes.output.includes('hello.txt'));

	// Path traversal protection: direct escape
	const escapeRes = await executeTool('read_file', { path: '../outside.txt' }, { cwd: dir });
	assert.ok(!escapeRes.ok, 'expected direct path escape to be blocked');

	// Sibling-prefix bypass: cwd=.../idexal-tools-ABC, rel=../idexal-tools-ABC2/x
	// must NOT pass the boundary check even though it starts with the root name.
	const siblingDir = dir + '2';
	fs.mkdirSync(siblingDir, { recursive: true });
	fs.writeFileSync(path.join(siblingDir, 'secret.txt'), 'top-secret');
	const siblingRes = await executeTool('read_file', { path: '../' + path.basename(siblingDir) + '/secret.txt' }, { cwd: dir });
	assert.ok(!siblingRes.ok, 'expected sibling-prefix path escape to be blocked');

	fs.rmSync(dir, { recursive: true, force: true });
	fs.rmSync(siblingDir, { recursive: true, force: true });
	console.log('  ✓ tool execution (write/read/list/run/search + path safety)');
}

async function testChatLoopWithToolCalls() {
	const provider = new MockProvider('loop');
	const loop = new ChatLoop({
		provider,
		tools: ALL_TOOLS,
		maxToolCalls: 5,
	});
	const result = await loop.run('list the current directory');
	assert.ok(result.toolCalls > 0, 'expected at least one tool call');
	assert.ok(result.finalContent.length > 0, 'expected a final answer');
	console.log('  ✓ chat loop with tool calling (toolCalls=' + result.toolCalls + ')');
}

async function testStreamingDeltasAndFallback() {
	const registry = new ProviderRegistry();
	const primary = new MockStreamProvider('primary', /* failFirst */ true);
	const backup = new MockProvider('backup');
	registry.register(primary);
	registry.register(backup);

	// streamChat accumulation: text + tool call + usage deltas (fresh
	// provider that succeeds on its first call)
	const deltas: StreamDelta[] = [];
	const { response } = await streamChat(new MockStreamProvider('solo'), {
		messages: [{ role: 'user', content: 'hi' }],
		onStream: (d) => deltas.push(d),
	});
	assert.equal(response.content, 'Hello, world!');
	assert.equal(response.toolCalls?.length, 1);
	assert.equal(response.usage?.inputTokens, 12);
	assert.ok(deltas.some((d) => d.type === 'text'), 'expected text deltas');
	assert.ok(deltas.some((d) => d.type === 'toolCall'), 'expected toolCall delta');
	assert.ok(deltas.some((d) => d.type === 'usage'), 'expected usage delta');

	// registry.streamWithFallback: mid-stream failure → falls to backup,
	// and emits provider/error/done events.
	const events: string[] = [];
	const result = await registry.streamWithFallback(
		{
			messages: [{ role: 'user', content: 'fallback me' }],
			onStream: (d) => events.push(d.type),
		},
		{ maxAttempts: 3 },
	);
	assert.ok(result.attempts >= 2, 'expected failover to backup provider');
	assert.ok(events.includes('provider'), 'expected provider event');
	assert.ok(events.includes('error'), 'expected error event');
	assert.ok(events.includes('done'), 'expected done event');
	assert.ok(result.response.content.includes('backup'), 'expected backup to answer');

	console.log('  ✓ streaming deltas (text/toolCall/usage) + mid-stream fallback (' + result.attempts + ' attempts)');
}

async function testSemanticMemoryWithEmbeddings() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-sem-'));
	const store = new MemoryStore(path.join(dir, 'mem.db'));
	const vocab = ['build', 'compile', 'settings', 'migrate', 'typescript'];
	const service = new MemoryService({
		store,
		project: 'sem-project',
		embed: fakeEmbedder(vocab),
		embeddingModel: 'fake-embed',
	});

	assert.ok(service.semanticAvailable, 'expected semantic recall to be available');

	service.learnFact('The build command is npm run compile-client');
	service.rememberDecision('We use TypeScript with strict mode');
	service.rememberEpisode('Migrated the settings editor to v2');

	// Semantic recall ranks the build fact first for a build query.
	const results = await service.recallSemantic('how do we build the project?', { limit: 5 });
	assert.ok(results.length > 0, 'expected semantic recall results');
	assert.ok(
		results[0].content.includes('compile-client'),
		`expected build fact ranked first, got: ${results[0].content}`,
	);

	// Embeddings are persisted to the DB cache.
	assert.ok(store.embeddedCount() >= 3, 'expected embeddings cached for all entries');
	assert.equal(service.embeddedStats().cached, store.embeddedCount());

	// Second recall should still work (cache path) and return the same top hit.
	const again = await service.recallSemantic('how do we build?', { limit: 5 });
	assert.equal(again[0].id, results[0].id, 'expected stable top result across cached recalls');

	// Prompt augmentation injects semantic memory.
	const prompt = await service.augmentSystemPrompt('You are Idexal.', 'how do we build the project?');
	assert.ok(prompt.includes('compile-client'), 'expected semantic memory injected into prompt');

	// No embedder → lexical fallback still returns results.
	const lexical = new MemoryService(store, 'sem-project');
	const lexResults = await lexical.recallSemantic('build compile', { limit: 5 });
	assert.ok(lexResults.length > 0, 'expected lexical fallback recall');

	store.close();
	fs.rmSync(dir, { recursive: true, force: true });
	console.log('  ✓ semantic memory (embeddings ranking, caching, lexical fallback, prompt injection)');
}

async function testStreamingToolCallDedupe() {
	// A stream that emits MULTIPLE toolCall deltas for the SAME call id
	// (like real SSE: one delta per argument chunk). accumulateStream must
	// merge them into a single tool call — otherwise the chat loop would
	// execute the same tool repeatedly.
	const provider = new (class implements LLMProvider {
		readonly id = 'dedupe';
		readonly displayName = 'Dedupe';
		readonly defaultModel = 'dedupe-model';
		readonly capabilities = { toolCalling: true, contextWindow: 1000 };

		async *stream(): AsyncGenerator<StreamDelta> {
			yield { type: 'toolCall', toolCall: { id: 'tc-1', name: 'write_file', arguments: '{"path":' } };
			yield { type: 'toolCall', toolCall: { id: 'tc-1', name: 'write_file', arguments: '{"path":"a.txt",' } };
			yield { type: 'toolCall', toolCall: { id: 'tc-1', name: 'write_file', arguments: '{"path":"a.txt","content":"hi"}' } };
		}

		async chat(): Promise<ChatResponse> {
			return { content: '', model: this.defaultModel };
		}
	})();

	const { response } = await streamChat(provider, { messages: [{ role: 'user', content: 'go' }] });
	assert.equal(response.toolCalls?.length, 1, 'expected ONE merged tool call, got ' + response.toolCalls?.length);
	assert.equal(response.toolCalls?.[0].id, 'tc-1');
	assert.equal(response.toolCalls?.[0].arguments, '{"path":"a.txt","content":"hi"}', 'expected fully accumulated arguments');

	console.log('  ✓ streaming tool-call dedupe (multi-chunk → single call)');
}

async function testCloudConfigIntegration() {
	// Default: cloud enabled, registered as provider, works with zero config.
	const cfg = loadConfig();
	assert.ok(cfg.cloud.enabled, 'cloud should be enabled by default');
	assert.equal(cfg.cloud.baseUrl, DEFAULT_CLOUD.baseUrl);
	const cloudProvider = cfg.providers.find((p) => p.id === CLOUD_PROVIDER_ID);
	assert.ok(cloudProvider, 'expected idexal-cloud registered by default');
	assert.equal(cloudProvider?.baseUrl, DEFAULT_CLOUD.baseUrl);

	// Disabled → stripped from the list, user providers untouched.
	const off = loadConfig({ cloud: { ...DEFAULT_CLOUD, enabled: false } });
	assert.ok(!off.providers.some((p) => p.id === CLOUD_PROVIDER_ID), 'expected cloud removed when disabled');
	assert.ok(off.providers.some((p) => p.id === 'ollama'), 'expected other providers kept');

	// Customization → single entry with effective settings.
	const custom = loadConfig({
		cloud: { ...DEFAULT_CLOUD, baseUrl: 'http://localhost:9876/v1', model: 'my-model', priority: 7 },
	});
	const customCloud = custom.providers.filter((p) => p.id === CLOUD_PROVIDER_ID);
	assert.equal(customCloud.length, 1, 'expected exactly one cloud provider entry');
	assert.equal(customCloud[0].baseUrl, 'http://localhost:9876/v1');
	assert.equal(customCloud[0].model, 'my-model');
	assert.equal(customCloud[0].priority, 7);
	assert.equal(custom.cloud.baseUrl, 'http://localhost:9876/v1');
	console.log('  ✓ cloud config (default enabled, disable strips, customization applied)');
}

async function testCloudSmartPriority() {
	// Smart priority (cloud.priority === 0): the gateway must NOT lead while
	// any other provider is usable (local servers, anonymous tiers, or
	// configured keys) — no regression for existing setups. It leads only
	// when nothing else can be used, so a zero-config user still works.
	const savedKey = process.env.ANTHROPIC_API_KEY;
	try {
		// With a real key present, cloud must sit behind the keyed provider.
		process.env.ANTHROPIC_API_KEY = 'sk-test-not-real';
		const keyed = loadConfig();
		const cloudP = keyed.providers.find((p) => p.id === CLOUD_PROVIDER_ID);
		const anthropic = keyed.providers.find((p) => p.id === 'anthropic');
		assert.ok(cloudP && anthropic, 'expected cloud + anthropic registered');
		assert.ok(
			cloudP.priority! > anthropic.priority!,
			`cloud (${cloudP.priority}) must rank behind keyed anthropic (${anthropic.priority})`,
		);

		// Without keys and without local providers → cloud leads at 0.
		delete process.env.ANTHROPIC_API_KEY;
		const bare = loadConfig({
			providers: [
				{ id: 'anthropic', displayName: 'Anthropic', type: 'anthropic', model: 'claude-x', apiKeyEnv: 'ANTHROPIC_API_KEY', priority: 1 },
				{ id: 'openai', displayName: 'OpenAI', type: 'openai', model: 'gpt-4o', apiKeyEnv: 'OPENAI_API_KEY', priority: 2 },
			],
		});
		const leadCloud = bare.providers.find((p) => p.id === CLOUD_PROVIDER_ID);
		assert.equal(leadCloud?.priority, 0, 'cloud must lead when nothing else is usable');

		// Explicit non-zero priority is always respected.
		const forced = loadConfig({ cloud: { ...DEFAULT_CLOUD, priority: 9 } });
		assert.equal(forced.providers.find((p) => p.id === CLOUD_PROVIDER_ID)?.priority, 9);
	} finally {
		if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
		else process.env.ANTHROPIC_API_KEY = savedKey;
	}
	console.log('  ✓ cloud smart priority (leads only when nothing else usable, explicit priority honored)');
}

async function testCloudGatewayClient() {
	// Spin up a local OpenAI-compatible gateway stub, point the cloud
	// provider at it, and verify the full client path works (chat, streaming,
	// embeddings) exactly as it would against api.idexal.com.
	const server: Server = createServer((req, res) => {
		const url = new URL(req.url ?? '/', 'http://localhost');
		if (url.pathname === '/v1/models') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ data: [{ id: 'idexal-1' }, { id: 'idexal-embed-1' }] }));
			return;
		}
		if (url.pathname === '/v1/chat/completions') {
			let body = '';
			req.on('data', (c) => (body += c));
			req.on('end', () => {
				const parsed = JSON.parse(body) as { stream?: boolean; messages: Array<{ content: string }> };
				const reply = `Gateway says: ${parsed.messages[parsed.messages.length - 1]?.content ?? ''}`;
				if (parsed.stream) {
					res.writeHead(200, { 'Content-Type': 'text/event-stream' });
					res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello ' } }] })}\n\n`);
					res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'world' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } })}\n\n`);
					res.end('data: [DONE]\n\n');
				} else {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						choices: [{ message: { content: reply } }],
						usage: { prompt_tokens: 5, completion_tokens: 4 },
					}));
				}
			});
			return;
		}
		if (url.pathname === '/v1/embeddings') {
			let body = '';
			req.on('data', (c) => (body += c));
			req.on('end', () => {
				const parsed = JSON.parse(body) as { input: string[] };
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					data: parsed.input.map((_, i) => ({ index: i, embedding: [1, 0, 0, 0] })),
				}));
			});
			return;
		}
		res.writeHead(404);
		res.end('{}');
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	assert.ok(address && typeof address === 'object', 'expected server to be listening');
	const port = (address as { port: number }).port;

	try {
		const provider = new OpenAiCompatibleProvider({
			id: CLOUD_PROVIDER_ID,
			displayName: 'Idexal Cloud (test)',
			baseUrl: `http://127.0.0.1:${port}/v1`,
			defaultModel: 'idexal-1',
		});

		// Non-streaming chat
		const chat = await provider.chat({ messages: [{ role: 'user', content: 'ping' }] });
		assert.ok(chat.content.includes('Gateway says: ping'), `unexpected: ${chat.content}`);
		assert.equal(chat.usage?.inputTokens, 5);

		// Streaming chat (SSE) with deltas
		const deltas: string[] = [];
		const streamed = await (async () => {
			let content = '';
			for await (const d of provider.stream!({ messages: [{ role: 'user', content: 'ping' }] })) {
				if (d.type === 'text') {
					content += d.text;
					deltas.push(d.text);
				}
			}
			return content;
		})();
		assert.equal(streamed, 'Hello world', `unexpected stream: ${streamed}`);
		assert.equal(deltas.join(''), 'Hello world');

		// Embeddings
		const vectors = await provider.embed({ inputs: ['a', 'b'] });
		assert.equal(vectors.length, 2);
		assert.deepEqual(vectors[0], [1, 0, 0, 0]);

		console.log('  ✓ cloud gateway client (chat / SSE stream / embeddings against local stub)');
	} finally {
		server.close();
	}
}

async function testSemanticCacheInvalidation() {
	// Regression: cached vectors from a DIFFERENT embedding model have a
	// different dimension — cosine similarity on mismatched lengths is 0,
	// which would silently rank every memory last forever. recallSemantic
	// must detect the dimension mismatch, drop the stale vectors, and
	// re-embed with the current model.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-inv-'));
	const store = new MemoryStore(path.join(dir, 'mem.db'));
	try {
		// Model A: 3-dim embeddings.
		const serviceA = new MemoryService({
			store,
			embed: fakeEmbedder(['build', 'compile', 'settings']),
			embeddingModel: 'embed-v1',
		});
		serviceA.learnFact('The build command is npm run compile-client');
		serviceA.rememberDecision('We use TypeScript with strict mode');
		const first = await serviceA.recallSemantic('how do we build?', { limit: 5 });
		assert.ok(first.length > 0, 'expected results with model A');
		assert.equal(store.embeddedCount(), 2, 'expected both entries cached under model A');

		// Model B: different dimension (2-dim). The stale 3-dim cache must
		// NOT be reused — results must still come back (re-embedded), and
		// the cache must now hold 2-dim vectors.
		const serviceB = new MemoryService({
			store,
			embed: fakeEmbedder(['build', 'compile']),
			embeddingModel: 'embed-v2',
		});
		const second = await serviceB.recallSemantic('build the project', { limit: 5 });
		assert.ok(second.length > 0, 'expected results after model switch (no all-zero scores)');
		assert.ok(
			second.some((e) => e.content.includes('compile-client')),
			'expected build fact to rank after re-embedding under model B',
		);

		// The cached vectors must now match model B's dimension.
		const cached = store.loadEmbeddings(
			(await serviceB.recallSemantic('build', { limit: 50 })).map((e) => e.id),
			2,
		);
		assert.equal(cached.size, 2, 'expected both entries re-cached at 2-dim');
		for (const v of cached.values()) {
			assert.equal(v.length, 2, 'cached vector must have the new model dimension');
		}
	} finally {
		store.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ semantic cache invalidation (embedding model switch → re-embed, no stale zero-scores)');
}

async function testEmbedderPrefersLocalProviders() {
	// pickEmbedder must choose a LOCAL embeddings endpoint (Ollama, LM
	// Studio) over a keyed remote provider — semantic memory should work
	// for free, with no API key, when any local model server is running.
	const registry = new ProviderRegistry();
	registry.register(
		new OpenAiCompatibleProvider({
			id: 'openai',
			displayName: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
			defaultModel: 'gpt-4o',
			apiKey: 'sk-test',
		}),
		1,
	);
	registry.register(
		new OpenAiCompatibleProvider({
			id: 'ollama',
			displayName: 'Ollama (Local)',
			baseUrl: 'http://localhost:11434/v1',
			defaultModel: 'llama3.1',
		}),
		3,
	);

	// Local provider preferred over the keyed remote one.
	const spec = pickEmbedder(registry);
	assert.ok(spec, 'expected an embedder to be picked');
	assert.equal(spec.providerId, 'ollama', 'local embeddings provider must win');
	assert.ok(spec.local, 'selected provider must be marked local');

	// Explicit preferredId still wins.
	const explicit = pickEmbedder(registry, 'openai');
	assert.equal(explicit?.providerId, 'openai');

	// Model override beats the provider default.
	const overridden = pickEmbedder(registry, undefined, 'nomic-embed-text');
	assert.equal(overridden?.model, 'nomic-embed-text');

	// No local provider: a USABLE keyed remote embeddings provider is picked
	// (step 3) — but a keyless REMOTE one is skipped (would 401).
	const remoteOnly = new ProviderRegistry();
	remoteOnly.register(
		new OpenAiCompatibleProvider({
			id: 'keyed-openai',
			displayName: 'Keyed OpenAI',
			baseUrl: 'https://api.openai.com/v1',
			defaultModel: 'gpt-4o',
			apiKey: 'sk-real',
		}),
		1,
	);
	remoteOnly.register(
		new OpenAiCompatibleProvider({
			id: 'keyless-remote',
			displayName: 'Keyless Remote',
			baseUrl: 'https://api.example.com/v1',
			defaultModel: 'x',
		}),
		2,
	);
	const remoteSpec = pickEmbedder(remoteOnly);
	assert.ok(remoteSpec, 'expected a usable remote embeddings provider to be picked');
	assert.equal(remoteSpec.providerId, 'keyed-openai', 'keyless remote must be skipped, keyed remote selected');

	// No usable embeddings-capable provider → undefined (lexical fallback).
	const bare = new ProviderRegistry();
	bare.register(new AnthropicProvider({ id: 'anthropic', defaultModel: 'claude-x' }));
	bare.register(
		new OpenAiCompatibleProvider({
			id: 'keyless-only',
			displayName: 'Keyless Only',
			baseUrl: 'https://api.example.com/v1',
			defaultModel: 'x',
		}),
		1,
	);
	assert.equal(pickEmbedder(bare), undefined, 'keyless remote must not be picked');
	console.log('  ✓ embedder selection prefers local providers (Ollama) over keyed remotes');
}

async function testEmbeddingCapabilities() {
	const openai = new OpenAiCompatibleProvider({
		id: 'emb-test',
		displayName: 'Emb Test',
		baseUrl: 'http://localhost:9999/v1',
		defaultModel: 'gpt-test',
	});
	assert.ok(supportsEmbeddings(openai), 'expected OpenAI-compatible provider to support embeddings');

	const anthropic = new AnthropicProvider({ id: 'emb-anthropic', defaultModel: 'claude-test' });
	assert.ok(!supportsEmbeddings(anthropic), 'expected Anthropic to not advertise embeddings');
	console.log('  ✓ embeddings capability detection (openai-compatible ✓ / anthropic ✗)');
}

async function testWriteProviderToConfig() {
	// The `add-provider` wizard persists providers via writeProviderToConfig.
	// Verify: creates the file, appends new providers, replaces same-id
	// entries in place, and preserves every other config section.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-write-'));
	const cfgPath = path.join(dir, 'config.json');
	try {
		// 1. Fresh file: creates it with just the provider.
		writeProviderToConfig(cfgPath, {
			id: 'my-groq',
			displayName: 'My Groq',
			type: 'custom',
			baseUrl: 'https://api.groq.com/openai/v1',
			model: 'llama-3.3-70b',
			apiKeyEnv: 'MY_GROQ_API_KEY',
			priority: 4,
		});
		let parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: unknown[] };
		assert.equal(parsed.providers.length, 1);
		assert.equal(parsed.providers[0].id, 'my-groq');

		// 2. Append a second provider; existing sections (here: a fake
		// top-level key) survive untouched.
		fs.writeFileSync(cfgPath, JSON.stringify({ providers: [], agent: { maxIterations: 7 }, myCustomKey: 1 }));
		writeProviderToConfig(cfgPath, {
			id: 'my-llm',
			displayName: 'My LLM',
			type: 'custom',
			baseUrl: 'http://localhost:8080/v1',
			model: 'local-model',
			anonymous: true,
			priority: 9,
			headers: { 'X-Custom': 'yes' },
			extraBody: { temperature: 0.1 },
		});
		parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
			providers: Array<{ id: string; headers?: Record<string, string>; extraBody?: Record<string, unknown> }>;
			agent: { maxIterations: number };
			myCustomKey: number;
		};
		assert.equal(parsed.providers.length, 1, 'empty providers array in file should not block append');
		assert.equal(parsed.providers[0].id, 'my-llm');
		assert.equal(parsed.providers[0].headers?.['X-Custom'], 'yes');
		assert.equal(parsed.providers[0].extraBody?.temperature, 0.1);
		assert.equal(parsed.agent.maxIterations, 7, 'agent section must be preserved');
		assert.equal(parsed.myCustomKey, 1, 'unknown top-level keys must be preserved');

		// 3. Replace same-id entry in place (order stays stable, other
		// providers untouched).
		writeProviderToConfig(cfgPath, {
			id: 'my-groq',
			displayName: 'My Groq v2',
			type: 'custom',
			baseUrl: 'https://api.groq.com/openai/v1',
			model: 'llama-3.3-70b',
			priority: 4,
		});
		writeProviderToConfig(cfgPath, {
			id: 'my-llm',
			displayName: 'My LLM',
			type: 'custom',
			baseUrl: 'http://localhost:8080/v1',
			model: 'local-model',
			anonymous: true,
			priority: 9,
		});
		parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: Array<{ id: string; displayName?: string }> };
		assert.equal(parsed.providers.length, 2);
		const groq = parsed.providers.find((p) => p.id === 'my-groq');
		assert.ok(groq, 'my-groq must remain after replacement');
		assert.equal(groq.displayName, 'My Groq v2', 'same-id entry must be replaced');
		// Order: my-llm was appended first (step 2), then my-groq (step 3) —
		// replacement must keep my-groq in place, not move it to the front.
		assert.equal(parsed.providers[0].id, 'my-llm', 'first-appended provider keeps its position');
		assert.equal(parsed.providers[1].id, 'my-groq', 'replaced entry keeps its appended position');

		// 4. Invalid JSON in the file must abort (throw), not wipe the user's
		// config with only the new provider (silent data loss).
		fs.writeFileSync(cfgPath, '{ this is not valid json');
		assert.throws(
			() =>
				writeProviderToConfig(cfgPath, {
					id: 'x',
					displayName: 'X',
					type: 'custom',
					baseUrl: 'http://localhost:9/v1',
					model: 'm',
				}),
			/not valid JSON/,
			'expected writeProviderToConfig to abort on unreadable config',
		);
		// The file must be left untouched after the aborted write.
		assert.equal(fs.readFileSync(cfgPath, 'utf8'), '{ this is not valid json');

		// 5. Malformed `providers` value (not an array) must not crash the merge.
		fs.writeFileSync(cfgPath, JSON.stringify({ providers: { oops: true } }));
		const guarded = writeProviderToConfig(cfgPath, {
			id: 'guarded',
			displayName: 'Guarded',
			type: 'custom',
			baseUrl: 'http://localhost:9/v1',
			model: 'm',
		});
		assert.equal(guarded.length, 1, 'malformed providers value should be replaced by a fresh list');

		// 6. getGlobalConfigPath honors $IDEXAL_CONFIG_DIR (tests/portable setups).
		const prevDir = process.env.IDEXAL_CONFIG_DIR;
		try {
			process.env.IDEXAL_CONFIG_DIR = dir;
			assert.equal(getGlobalConfigPath(), path.join(dir, 'config.json'));
		} finally {
			if (prevDir === undefined) delete process.env.IDEXAL_CONFIG_DIR;
			else process.env.IDEXAL_CONFIG_DIR = prevDir;
		}
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ writeProviderToConfig (create / append / replace-in-place / preserve sections / invalid-JSON abort / malformed providers / config dir override)');
}

async function testConfigFileReplacesDefaultProviders() {
	// Regression: a config file that declares providers must REPLACE the
	// default provider set (anthropic/openai/ollama) — otherwise the local
	// ollama entry silently lingers in the pool, gets picked by fallback,
	// and ECONNREFUSEDs on a machine with no Ollama running (this broke the
	// VS Code extension's executor/reviewer roles end-to-end).
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-cfg-'));
	const workspaceCfg = path.join(dir, 'idexal.config.json');
	fs.writeFileSync(
		workspaceCfg,
		JSON.stringify({
			providers: [
				{ id: 'my-provider', type: 'custom', baseUrl: 'http://127.0.0.1:9111/v1', model: 'm', priority: 1 },
			],
			cloud: { enabled: false },
		}),
	);

	const prevCwd = process.cwd();
	try {
		process.chdir(dir);
		// Case 1: workspace file declares providers → defaults fully replaced.
		const cfg = loadConfig();
		const ids = cfg.providers.map((p) => p.id);
		assert.ok(ids.includes('my-provider'), `expected my-provider in ${ids}`);
		assert.ok(!ids.includes('ollama'), `default ollama must NOT linger when a config declares providers (got ${ids})`);
		assert.ok(!ids.includes('anthropic'), `default anthropic must not linger (got ${ids})`);
		assert.ok(!ids.includes('openai'), `default openai must not linger (got ${ids})`);

		// Case 2: a second (deeper) config merges by id on top — the same
		// layering a workspace file applies over a global one. Providers from
		// both files survive, defaults still don't reappear.
		const nestedDir = path.join(dir, '.idexal');
		fs.mkdirSync(nestedDir, { recursive: true });
		fs.writeFileSync(
			path.join(nestedDir, 'config.json'),
			JSON.stringify({
				providers: [
					{ id: 'layered-provider', type: 'custom', baseUrl: 'http://127.0.0.1:9112/v1', model: 'm2', priority: 2 },
				],
			}),
		);
		const layered = loadConfig();
		const layeredIds = layered.providers.map((p) => p.id);
		assert.ok(layeredIds.includes('my-provider'), `expected my-provider preserved by layering (got ${layeredIds})`);
		assert.ok(layeredIds.includes('layered-provider'), `expected layered-provider merged in (got ${layeredIds})`);
		assert.ok(!layeredIds.includes('ollama'), `defaults must stay replaced across layers (got ${layeredIds})`);
	} finally {
		process.chdir(prevCwd);
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ config file provider list replaces defaults + layers by id (no silent ollama linger)');
}

async function testOrchestratorSkipsKeylessProviders() {
	// Regression: the orchestrator's pickProvider() must not hand a role to
	// a keyless remote provider (would 401 on the first call). Only usable
	// providers (anonymous / local / keyed) may be selected.
	const registry = new ProviderRegistry();
	// A keyless REMOTE provider (not anonymous, not local, no key) — must be
	// skipped even though it is registered first.
	registry.register(new (class implements LLMProvider {
		readonly id = 'remote-no-key';
		readonly displayName = 'Remote (no key)';
		readonly defaultModel = 'remote-model';
		readonly capabilities = { toolCalling: true, contextWindow: 100_000 };
		readonly baseUrl = 'https://api.example.com/v1';
		async chat(): Promise<ChatResponse> {
			return { content: 'should never be called', model: this.defaultModel };
		}
	})());
	// A usable anonymous provider — the orchestrator must pick this one.
	registry.register(new MockProvider('usable'));

	const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-kp-'));
	const config: AgentConfig = {
		maxIterations: 3,
		maxParallelAgents: 2,
		useReviewer: true,
		maxToolCallsPerTurn: 5,
		memoryEnabled: true,
		memoryDbPath: path.join(memDir, 'mem.db'),
		temperature: 0,
		maxTokens: 2000,
		extraSystemPrompt: '',
	};
	const orchestrator = new Orchestrator({ registry, config, tools: ALL_TOOLS });
	const result = await orchestrator.run('explore the workspace and report what you find');
	assert.ok(result.steps.length > 0, 'expected plan steps');
	assert.ok(
		result.steps.every((s) => s.status === 'done' || s.status === 'pending'),
		'expected steps to complete without the keyless provider 401-ing',
	);
	fs.rmSync(memDir, { recursive: true, force: true });
	console.log('  ✓ orchestrator skips keyless remote providers when picking roles');
}

async function testMultiAgentOrchestrator() {
	const registry = new ProviderRegistry();
	registry.register(new MockProvider('planner'));
	registry.register(new MockProvider('executor'));
	registry.register(new MockProvider('reviewer'));

	const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-oa-'));
	const config: AgentConfig = {
		maxIterations: 5,
		maxParallelAgents: 2,
		useReviewer: true,
		maxToolCallsPerTurn: 5,
		memoryEnabled: true,
		memoryDbPath: path.join(memDir, 'mem.db'),
		temperature: 0,
		maxTokens: 2000,
		extraSystemPrompt: '',
	};

	const events: string[] = [];
	const orchestrator = new Orchestrator({
		registry,
		config,
		tools: ALL_TOOLS,
		onEvent: (e) => events.push(e.type),
	});
	const result = await orchestrator.run('explore the workspace and report what you find');
	assert.ok(result.steps.length > 0, 'expected plan steps');
	assert.ok(result.steps.some((s) => s.status === 'done' || s.status === 'failed'), 'expected steps to run');
	assert.ok(events.includes('plan'), 'expected plan event');
	console.log('  ✓ multi-agent orchestrator (steps=' + result.steps.length + ', events=' + events.join(',') + ')');

	// Clean up orchestrator temp memory dir
	fs.rmSync(memDir, { recursive: true, force: true });
}

async function testPlanOnlyOrchestrator() {
	// planOnly mode (used by the extension's /idexal:plan): the orchestrator
	// must emit the plan and stop — no steps execute, no agents run, and no
	// tool calls happen, even though tools and a reviewer are configured.
	const registry = new ProviderRegistry();
	registry.register(new MockProvider('planner'));
	registry.register(new MockProvider('executor'));
	registry.register(new MockProvider('reviewer'));

	const config: AgentConfig = {
		maxIterations: 5,
		maxParallelAgents: 2,
		useReviewer: true,
		maxToolCallsPerTurn: 5,
		memoryEnabled: false,
		memoryDbPath: '',
		temperature: 0,
		maxTokens: 2000,
		extraSystemPrompt: '',
		semanticMemory: false,
		usageEnabled: false,
		usageDbPath: '',
	};

	const events: string[] = [];
	const orchestrator = new Orchestrator({
		registry,
		config,
		tools: ALL_TOOLS,
		planOnly: true,
		onEvent: (e) => events.push(e.type),
	});
	const result = await orchestrator.run('explore the workspace and report what you find');
	assert.ok(result.steps.length > 0, 'expected plan steps');
	assert.ok(result.steps.every((s) => s.status === 'pending'), 'plan-only must leave steps pending');
	assert.ok(events.includes('plan'), 'expected a plan event');
	assert.ok(!events.includes('agent-start'), 'plan-only must not spawn agents: ' + events.join(','));
	assert.ok(!events.includes('tool-call'), 'plan-only must not call tools: ' + events.join(','));
	assert.ok(result.summary.includes('nothing executed'), 'expected plan-only summary, got: ' + result.summary);
	console.log('  ✓ plan-only orchestrator (steps=' + result.steps.length + ', no execution)');
}

async function testReadOnlyTools() {
	// /idexal:review runs `stream --read-only`: executors must only get
	// inspection tools — read_file, list_dir, search_files, git_status — and
	// never write_file, run_command, or the terminal tools.
	const names = new Set(readOnlyTools(ALL_TOOLS).map((t) => t.definition.name));
	assert.ok(names.has('read_file'), 'expected read_file in read-only set');
	assert.ok(names.has('list_dir'), 'expected list_dir in read-only set');
	assert.ok(names.has('search_files'), 'expected search_files in read-only set');
	assert.ok(names.has('git_status'), 'expected git_status in read-only set');
	assert.ok(!names.has('write_file'), 'write_file must NOT be in read-only set');
	assert.ok(!names.has('run_command'), 'run_command must NOT be in read-only set');
	assert.ok(!names.has('terminal_start'), 'terminal_start must NOT be in read-only set');
	// The exported subset is consistent with the filter helper.
	assert.equal(READ_ONLY_TOOLS.length, names.size);
	assert.ok(READ_ONLY_TOOLS.every((t) => names.has(t.definition.name)));

	// A read-only orchestrator run hands executors ONLY the inspection tool
	// definitions. A single provider serves every role here (the planner
	// ChatLoop uses tools: [], the executor gets the tool set), so capturing
	// request.tools whenever it is non-empty proves the executor's tools
	// exclude write_file / run_command — this would fail if readOnly were
	// ever silently ignored.
	let executorToolNames: string[] | undefined;
	const capturing = new (class extends MockProvider {
		override async chat(request: ChatRequest): Promise<ChatResponse> {
			if ((request.tools ?? []).length > 0) {
				executorToolNames = (request.tools ?? []).map((t) => t.name);
			}
			return super.chat(request);
		}
	})('capture');
	const registry = new ProviderRegistry();
	registry.register(capturing);
	const config: AgentConfig = {
		maxIterations: 3,
		maxParallelAgents: 2,
		useReviewer: false,
		maxToolCallsPerTurn: 5,
		memoryEnabled: false,
		memoryDbPath: '',
		temperature: 0,
		maxTokens: 2000,
		extraSystemPrompt: '',
		semanticMemory: false,
		usageEnabled: false,
		usageDbPath: '',
	};
	const events: Array<{ type: string; name?: string }> = [];
	const orchestrator = new Orchestrator({
		registry,
		config,
		tools: ALL_TOOLS,
		readOnly: true,
		onEvent: (e) => events.push(e),
	});
	const result = await orchestrator.run('review the workspace for issues');
	assert.ok(executorToolNames, 'expected the executor to receive tool definitions');
	assert.ok(
		!executorToolNames!.includes('write_file'),
		'executor must not receive write_file in read-only mode, got: ' + executorToolNames!.join(','),
	);
	assert.ok(
		!executorToolNames!.includes('run_command'),
		'executor must not receive run_command in read-only mode, got: ' + executorToolNames!.join(','),
	);
	assert.ok(executorToolNames!.includes('read_file'), 'executor should still get read_file');
	const writeCalls = events.filter((e) => e.type === 'tool-call' && ['write_file', 'run_command'].includes(e.name ?? ''));
	assert.equal(writeCalls.length, 0, 'read-only run must not call write/run tools');
	assert.ok(result.steps.length > 0, 'expected steps to run');
	console.log('  ✓ read-only tool enforcement (subset + executor toolset excludes write/run)');
}

async function testUsageStore() {
	// Per-call usage records (provider, model, role, tokens, latency, cost)
	// must persist to SQLite and roll up into per-provider summaries and
	// totals, scoped by task id.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-usage-'));
	const store = new UsageStore(path.join(dir, 'usage.db'));
	try {
		store.record({
			timestamp: 1_000,
			taskId: 'task-1',
			providerId: 'openai',
			model: 'gpt-4o',
			role: 'planner',
			inputTokens: 100,
			outputTokens: 50,
			latencyMs: 250,
			costUsd: 0.001,
			ok: true,
		});
		store.record({
			timestamp: 2_000,
			taskId: 'task-1',
			providerId: 'openai',
			model: 'gpt-4o',
			role: 'executor',
			inputTokens: 200,
			outputTokens: 100,
			latencyMs: 350,
			costUsd: 0.002,
			ok: true,
		});
		store.record({
			timestamp: 3_000,
			taskId: 'task-2',
			providerId: 'ollama',
			model: 'llama3.1',
			role: 'reviewer',
			inputTokens: 50,
			outputTokens: 25,
			latencyMs: 120,
			costUsd: 0,
			ok: false,
			error: 'simulated 429',
		});

		// Per-provider rollup (all time)
		const summary = store.summary();
		assert.equal(summary.length, 2, 'expected two providers in rollup');
		const openai = summary.find((p) => p.providerId === 'openai');
		assert.ok(openai, 'expected openai rollup');
		assert.equal(openai?.calls, 2);
		assert.equal(openai?.inputTokens, 300);
		assert.equal(openai?.outputTokens, 150);
		assert.equal(openai?.costUsd, 0.003);
		assert.equal(openai?.avgLatencyMs, 300);

		// Task-scoped rollup: task-1 only sees openai's two calls.
		const taskSummary = store.summary({ taskId: 'task-1' });
		assert.equal(taskSummary.length, 1);
		assert.equal(taskSummary[0].providerId, 'openai');
		assert.equal(taskSummary[0].calls, 2);

		// Totals across all tasks
		const totals = store.totals();
		assert.equal(totals.calls, 3);
		assert.equal(totals.failed, 1);
		assert.equal(totals.inputTokens, 350);
		assert.equal(totals.outputTokens, 175);

		// Task-scoped totals
		const taskTotals = store.totals({ taskId: 'task-1' });
		assert.equal(taskTotals.calls, 2);
		assert.equal(taskTotals.failed, 0);

		// Recent calls, newest first, with failure captured.
		const recent = store.recent(10);
		assert.equal(recent.length, 3);
		assert.equal(recent[0].providerId, 'ollama');
		assert.equal(recent[0].ok, false);
		assert.equal(recent[0].error, 'simulated 429');
		assert.equal(recent[0].role, 'reviewer');
	} finally {
		store.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ usage store (per-provider rollup, totals, task scoping, recent + failures)');
}

async function testChatLoopRecordsUsage() {
	// The ChatLoop must record every provider call — tokens, latency,
	// provider, model, role, taskId, and estimated cost — so `idexal-ai
	// usage` and per-task summaries have real data.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-usage-loop-'));
	const usage = new UsageStore(path.join(dir, 'usage.db'));
	try {
		const provider = new MockProvider('loop-usage');
		const loop = new ChatLoop({
			provider,
			tools: ALL_TOOLS,
			maxToolCalls: 5,
			usageStore: usage,
			taskId: 'task-live-1',
			role: 'executor',
		});
		const result = await loop.run('list the current directory');
		assert.ok(result.toolCalls > 0, 'expected tool calls to drive multiple turns');

		const records = usage.recent(50);
		assert.ok(records.length >= 2, 'expected at least the tool + final turns recorded');
		assert.ok(records.every((r) => r.taskId === 'task-live-1'), 'taskId must be stamped on every record');
		assert.ok(records.every((r) => r.role === 'executor'), 'role must be stamped on every record');
		assert.ok(records.every((r) => r.providerId === 'loop-usage'), 'provider id must be recorded');
		assert.ok(records.some((r) => r.inputTokens > 0), 'expected token counts recorded');
		assert.ok(records.every((r) => r.ok), 'mock calls should all succeed');

		const totals = usage.totals({ taskId: 'task-live-1' });
		assert.equal(totals.calls, records.length, 'totals must match recorded calls');
	} finally {
		usage.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ chat loop records usage (taskId, role, provider, tokens, cost)');
}

async function testChatLoopRecordsFailedCall() {
	// A call that errors (e.g. rate limit) must still be recorded with
	// ok:false, the error message, and counted in totals().failed — usage
	// reports show every attempt, not just the successes.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-usage-fail-'));
	const usage = new UsageStore(path.join(dir, 'usage.db'));
	try {
		const provider = new MockProvider('failing-usage', /* failFirst */ true);
		const loop = new ChatLoop({
			provider,
			tools: ALL_TOOLS,
			maxToolCalls: 5,
			usageStore: usage,
			taskId: 'task-fail-1',
			role: 'executor',
		});
		await assert.rejects(loop.run('list the current directory'), /429/, 'expected the failing call to propagate');

		const records = usage.recent(10);
		assert.equal(records.length, 1, 'expected exactly one recorded (failed) call');
		assert.equal(records[0].ok, false, 'failed call must be marked ok:false');
		assert.ok(records[0].error?.includes('429'), 'error message must be captured');
		assert.equal(records[0].taskId, 'task-fail-1');
		assert.equal(records[0].role, 'executor');

		const totals = usage.totals({ taskId: 'task-fail-1' });
		assert.equal(totals.calls, 1);
		assert.equal(totals.failed, 1, 'failed call must count toward totals.failed');
	} finally {
		usage.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ chat loop records failed calls (ok:false, error, counted in failed totals)');
}

async function testSetupSuggestion() {
	// suggestProviders must rank local Ollama first (free, no key), keyed
	// remotes after it, and the Idexal Cloud gateway LAST as the fallback.
	// With nothing usable, it must return an empty list + empty primary.

	// 1. Ollama running + cloud reachable → ollama leads, cloud trails.
	const withLocal = suggestProviders({
		ollama: { running: true, models: ['llama3.1', 'nomic-embed-text'] },
		keys: { anthropic: false, openai: false },
		cloud: { reachable: true },
	});
	assert.equal(withLocal.providers.length, 2, 'ollama + cloud expected');
	assert.equal(withLocal.providers[0].id, 'ollama', 'local provider must be first');
	assert.equal(withLocal.providers[0].baseUrl, 'http://localhost:11434/v1');
	assert.equal(withLocal.providers[0].model, 'llama3.1', 'ollama model should be detected from the probe');
	assert.equal(withLocal.providers[1].id, CLOUD_PROVIDER_ID, 'cloud must be the fallback, last');
	assert.equal(withLocal.primaryProvider, 'ollama');
	const localProbe = {
		ollama: { running: true, models: ['llama3.1'] },
		keys: { anthropic: false, openai: false },
		cloud: { reachable: true },
	};
	assert.ok(formatPriority(localProbe).includes('ollama → idexal-cloud'), formatPriority(localProbe));

	// 2. Keys only (no local, cloud reachable) → anthropic first, then openai.
	const withKeys = suggestProviders({
		ollama: { running: false, models: [] },
		keys: { anthropic: true, openai: true },
		cloud: { reachable: true },
	});
	assert.deepEqual(
		withKeys.providers.map((p) => p.id),
		['anthropic', 'openai', CLOUD_PROVIDER_ID],
		'keyed remotes in order, cloud last',
	);
	assert.equal(withKeys.providers[0].apiKeyEnv, 'ANTHROPIC_API_KEY');
	assert.equal(withKeys.primaryProvider, 'anthropic');

	// 3. Mixed: ollama + one key → ollama first, keyed second, cloud last.
	const mixed = suggestProviders({
		ollama: { running: true, models: [] },
		keys: { anthropic: true, openai: false },
		cloud: { reachable: false },
	});
	assert.deepEqual(
		mixed.providers.map((p) => p.id),
		['ollama', 'anthropic'],
		'cloud skipped when unreachable',
	);

	// 4. Nothing usable → empty providers, empty primary (caller prints guidance).
	const bare = suggestProviders({
		ollama: { running: false, models: [] },
		keys: { anthropic: false, openai: false },
		cloud: { reachable: false },
	});
	assert.equal(bare.providers.length, 0);
	assert.equal(bare.primaryProvider, '');

	console.log('  ✓ setup provider suggestion (ollama first → keys → cloud fallback, empty when nothing usable)');
}

async function testSetupWriteConfig() {
	// writeConfigFile must produce valid JSON that loadConfig can read back,
	// create parent dirs, and refuse to overwrite when asked not to.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-setup-'));
	const cfgPath = path.join(dir, 'nested', 'config.json');
	try {
		// Cloud disabled so loadConfig doesn't auto-append the gateway entry.
		const cfg = loadConfig({
			providers: [
				{ id: 'ollama', type: 'openai-compatible', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', priority: 1 },
			],
			cloud: { enabled: false },
		});
		cfg.primaryProvider = 'ollama';
		writeConfigFile(cfgPath, cfg);

		// Round-trip: file exists, parses, keeps the provider.
		assert.ok(fs.existsSync(cfgPath), 'config file must be created');
		const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: Array<{ id: string }>; primaryProvider?: string };
		assert.equal(parsed.providers.length, 1);
		assert.equal(parsed.providers[0].id, 'ollama');
		assert.equal(parsed.primaryProvider, 'ollama');

		// Overwrite guard.
		assert.throws(
			() => writeConfigFile(cfgPath, cfg, false),
			/Refusing to overwrite/,
			'overwrite=false must throw when the file exists',
		);

		// overwrite=true (the default) replaces it cleanly.
		writeConfigFile(cfgPath, cfg);
		assert.equal(JSON.parse(fs.readFileSync(cfgPath, 'utf8')).providers.length, 1);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ setup config write (valid JSON round-trip, dirs created, overwrite guard)');
}

async function testAgentTerminalTools() {
	// The Agent Terminal starts a REAL long-running process, streams its
	// output (drain semantics — only new output per read), accepts input
	// on stdin, and stops the process tree on demand.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-term-'));
	// A small Node script that prints periodically and reads stdin:
	// interactive, long-running, and stoppable — exactly the dev-server shape.
	const script = path.join(dir, 'server.cjs');
	fs.writeFileSync(
		script,
		[
			'let i = 0;',
			'const iv = setInterval(() => { console.log("tick-" + (++i)); if (i === 4) clearInterval(iv); }, 60);',
			"process.stdin.on('data', (d) => { const s = d.toString(); if (s.includes('q')) { console.log('bye'); process.exit(0); } });",
			'process.on("SIGTERM", () => process.exit(143));',
		].join('\n'),
	);
	const manager = new TerminalManager();
	try {
		// Quote each arg (paths with spaces). The manager wraps the whole
		// command for cmd.exe /c on Windows, so no extra outer quoting here.
		const q = (p: string): string => `"${p}"`;
		const command = `${q(process.execPath)} ${q(script)}`;

		// Start a long-running interactive command.
		const started = await executeTool('terminal_start', { command }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		assert.ok(started.ok, `terminal_start failed: ${started.output}`);
		assert.ok(started.output.includes('t1'), `expected terminal id in: ${started.output}`);
		assert.equal(manager.list().length, 1, 'expected one running terminal');

		// List tool shows it.
		const listed = await executeTool('terminal_list', {}, { cwd: dir, terminal: manager }, ALL_TOOLS);
		assert.ok(listed.ok && listed.output.includes('t1'), `terminal_list: ${listed.output}`);

		// Drain the output (waits up to waitMs for the ticks to appear).
		const out = await executeTool('terminal_output', { id: 't1', waitMs: 500 }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		assert.ok(out.ok, `terminal_output failed: ${out.output}`);
		assert.ok(out.output.includes('tick-1'), `expected tick output, got: ${out.output}`);

		// Drain semantics: a second read returns only NEW output, never the
		// already-drained tick-1 (either nothing new yet, or a later tick).
		const out2 = await executeTool('terminal_output', { id: 't1' }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		assert.ok(out2.ok, 'second drain should succeed');
		assert.ok(!out2.output.includes('tick-1'), `drain must not repeat already-read output: ${out2.output}`);
		const newOut = out2.output.includes('tick-2') || out2.output.includes('tick-3') || out2.output.includes('tick-4');
		assert.ok(out2.output.includes('(no new output)') || newOut, `second drain must be empty or newer: ${out2.output}`);

		// Send input (interactive): 'q' makes the process exit itself.
		const sent = await executeTool('terminal_send', { id: 't1', input: 'q\n' }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		assert.ok(sent.ok, `terminal_send failed: ${sent.output}`);
		await new Promise((r) => setTimeout(r, 300));
		const info = manager.get('t1');
		assert.ok(info && info.status === 'exited', 'process must exit after interactive input');

		// terminal_stop on a fresh process kills it (SIGTERM path on Unix,
		// taskkill tree on Windows).
		await executeTool('terminal_start', { command }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		const stopped = await executeTool('terminal_stop', { id: 't2' }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		assert.ok(stopped.ok, `terminal_stop failed: ${stopped.output}`);
		await new Promise((r) => setTimeout(r, 200));
		const t2 = manager.get('t2');
		assert.ok(t2 && t2.status === 'exited', 'stopped terminal must be exited');

		// closeAll kills everything left (session cleanup).
		await executeTool('terminal_start', { command }, { cwd: dir, terminal: manager }, ALL_TOOLS);
		manager.closeAll();
		assert.equal(manager.list().length, 0, 'closeAll must clear all terminals');

		// Without a terminal manager the tools report a clear error.
		const noMgr = await executeTool('terminal_start', { command: 'echo hi' }, { cwd: dir }, ALL_TOOLS);
		assert.ok(!noMgr.ok && noMgr.output.includes('terminal'), `expected unavailable error: ${noMgr.output}`);

		console.log('  ✓ agent terminal (start → live drain → interactive input → stop → closeAll)');
	} finally {
		manager.closeAll();
		// Windows: taskkill is async at the OS level — the killed process can
		// still hold the cwd open for a few ms, and rmSync would EPERM. Wait
		// for the exit events to settle before removing the temp dir.
		await new Promise((r) => setTimeout(r, 250));
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

async function testOrchestratorToolEvents() {
	// The executor agents use tools — the orchestrator must surface each
	// tool call and its outcome as first-class step-scoped events
	// (tool-call → tool-result) so UIs can show agents working step by step.
	const registry = new ProviderRegistry();
	registry.register(new MockProvider('planner'));
	registry.register(new MockProvider('executor'));
	registry.register(new MockProvider('reviewer'));

	const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-tool-ev-'));
	const config: AgentConfig = {
		maxIterations: 5,
		maxParallelAgents: 2,
		useReviewer: true,
		maxToolCallsPerTurn: 5,
		memoryEnabled: true,
		memoryDbPath: path.join(memDir, 'mem.db'),
		temperature: 0,
		maxTokens: 2000,
		extraSystemPrompt: '',
	};

	const toolCalls: Array<{ step: number; name: string }> = [];
	const toolResults: Array<{ step: number; name: string; ok: boolean }> = [];
	const orchestrator = new Orchestrator({
		registry,
		config,
		tools: ALL_TOOLS,
		onEvent: (e) => {
			if (e.type === 'tool-call') toolCalls.push({ step: e.step, name: e.name });
			if (e.type === 'tool-result') toolResults.push({ step: e.step, name: e.name, ok: e.ok });
		},
	});
	const result = await orchestrator.run('explore the workspace and report what you find');

	assert.ok(toolCalls.length > 0, 'expected at least one tool-call event');
	assert.ok(toolResults.length > 0, 'expected at least one tool-result event');
	assert.equal(toolCalls.length, toolResults.length, 'every tool call must produce a result event');
	assert.ok(toolCalls[0].name.length > 0, 'tool-call must carry the tool name');
	assert.ok(toolCalls[0].step >= 1, 'tool-call must be scoped to a step');
	assert.ok(toolResults.every((r) => r.ok), 'mock tools should all succeed');
	assert.ok(
		toolCalls.some((c) => ALL_TOOLS.some((t) => t.definition.name === c.name)),
		'tool-call names must be registered agent tools',
	);
	assert.ok(result.steps.length > 0, 'expected plan steps');

	fs.rmSync(memDir, { recursive: true, force: true });
	console.log(
		'  ✓ orchestrator tool events (tool-call→tool-result, step-scoped; tools=' +
			toolCalls.map((c) => c.name).join(',') + ')',
	);
}

async function testClaudeCompatSettings() {
	// Claude Code compatibility reads ~/.claude/settings.json (global) and
	// .claude/settings.json (project, wins per-key), exposes the env block
	// for injection (never overwriting real env vars), maps model aliases
	// (sonnet/opus/haiku) to concrete ids, and loads CLAUDE.md instructions
	// in scope order (global → project).
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-claude-'));
	const globalDir = path.join(dir, 'claude-home');
	const projectDir = path.join(dir, 'project');
	const prevHome = process.env.IDEXAL_CLAUDE_HOME;
	try {
		fs.mkdirSync(path.join(globalDir, 'agents'), { recursive: true });
		fs.mkdirSync(path.join(projectDir, '.claude', 'agents'), { recursive: true });
		process.env.IDEXAL_CLAUDE_HOME = globalDir;

		// Global settings: env key + model alias.
		fs.writeFileSync(
			path.join(globalDir, 'settings.json'),
			JSON.stringify({ env: { ANTHROPIC_API_KEY: 'sk-global', SHARED: 'global-val' }, model: 'sonnet' }),
		);
		// Project settings override per-key + model.
		fs.writeFileSync(
			path.join(projectDir, '.claude', 'settings.json'),
			JSON.stringify({ env: { SHARED: 'project-val', OPENAI_API_KEY: 'sk-project' }, model: 'opus' }),
		);

		const { settings, files } = readClaudeSettings(projectDir);
		assert.equal(files.length, 2, 'expected global + project settings files');
		assert.equal(settings.env.ANTHROPIC_API_KEY, 'sk-global', 'global env key read');
		assert.equal(settings.env.SHARED, 'project-val', 'project env must win per-key');
		assert.equal(settings.env.OPENAI_API_KEY, 'sk-project', 'project-only env key read');
		assert.equal(settings.model, 'opus', 'project model wins');

		// Alias map: sonnet/opus/haiku → concrete ids; unknown passes through.
		assert.equal(resolveClaudeModel('sonnet'), 'claude-sonnet-4-20250514');
		assert.equal(resolveClaudeModel('opus'), 'claude-opus-4-20250514');
		assert.equal(resolveClaudeModel('haiku'), 'claude-haiku-4-5-20251001');
		assert.equal(resolveClaudeModel('claude-sonnet-4-5-20250929'), 'claude-sonnet-4-5-20250929');

		// Env injection: missing keys applied, real env vars never overwritten.
		const prevEnv = process.env.SHARED;
		delete process.env.SHARED;
		try {
			const applied = injectClaudeEnv(settings.env);
			assert.ok(applied.includes('SHARED'), 'missing env var should be injected');
			assert.equal(process.env.SHARED, 'project-val');
			// Already set → NOT overwritten (real env wins).
			process.env.SHARED = 'real-env-wins';
			const applied2 = injectClaudeEnv({ SHARED: 'claude-tries' });
			assert.ok(!applied2.includes('SHARED'), 'existing env var must not be overwritten');
			assert.equal(process.env.SHARED, 'real-env-wins');
		} finally {
			if (prevEnv === undefined) delete process.env.SHARED;
			else process.env.SHARED = prevEnv;
		}

		// CLAUDE.md instructions: global + project, in scope order.
		fs.writeFileSync(path.join(globalDir, 'CLAUDE.md'), '# Global\nAlways use tabs.');
		fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\nRun `npm test` before pushing.');
		const instr = loadClaudeInstructions(projectDir);
		assert.equal(instr.files.length, 2, 'expected global + project CLAUDE.md');
		assert.ok(instr.instructions.includes('Always use tabs'), 'global instructions loaded');
		assert.ok(instr.instructions.includes('npm test'), 'project instructions loaded');
		assert.ok(
			instr.instructions.indexOf('Always use tabs') < instr.instructions.indexOf('npm test'),
			'global scope must come before project scope',
		);

		console.log('  ✓ claude compat settings (global+project merge, env injection, model aliases, CLAUDE.md order)');
	} finally {
		if (prevHome === undefined) delete process.env.IDEXAL_CLAUDE_HOME;
		else process.env.IDEXAL_CLAUDE_HOME = prevHome;
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

async function testClaudeCompatSubagents() {
	// .claude/agents/*.md frontmatter parses (block + indented list styles),
	// Claude tool names map to Idexal names, disallowedTools (including
	// glob patterns like `Bash(rm *)`) filter the mapped set, and project +
	// global agents are discovered with origins.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-sub-'));
	const globalDir = path.join(dir, 'claude-home');
	const projectDir = path.join(dir, 'project');
	const prevHome = process.env.IDEXAL_CLAUDE_HOME;
	try {
		fs.mkdirSync(path.join(globalDir, 'agents'), { recursive: true });
		fs.mkdirSync(path.join(projectDir, '.claude', 'agents'), { recursive: true });
		process.env.IDEXAL_CLAUDE_HOME = globalDir;

		// Project agent: comma-separated tools list + model alias.
		fs.writeFileSync(
			path.join(projectDir, '.claude', 'agents', 'code-reviewer.md'),
			[
				'---',
				'name: code-reviewer',
				'description: Reviews code quality and catches bugs',
				'tools: Read, Bash, Grep, Glob',
				'model: sonnet',
				'maxTurns: 8',
				'---',
				'Review the code strictly. Check for correctness, style, and security.',
			].join('\n'),
		);

		// Global agent: indented list tools + disallowedTools glob pattern.
		fs.writeFileSync(
			path.join(globalDir, 'agents', 'security.md'),
			[
				'---',
				'name: security-audit',
				'description: Audits for vulnerabilities',
				'tools:',
				'  - Read',
				'  - Grep',
				'  - Bash',
				'disallowedTools: Bash(rm *)',
				'---',
				'Hunt for injection, XSS, and auth flaws.',
			].join('\n'),
		);

		// Frontmatter parsing: block + comma list.
		const fm = parseFrontmatter('---\nname: tester\ntools: Read, Write\n---\nDo it.');
		assert.equal(fm.data.name, 'tester');
		assert.deepEqual(fm.data.tools, ['Read', 'Write'], 'comma list parses to array');
		assert.ok(fm.body.includes('Do it.'), 'body extracted');

		// Indented list style.
		const fm2 = parseFrontmatter('---\ntools:\n  - Read\n  - Bash\n---\nGo.');
		assert.deepEqual(fm2.data.tools, ['Read', 'Bash'], 'indented list parses to array');

		// Tool mapping.
		const mapped = mapClaudeTools(['Read', 'Bash', 'Grep', 'Glob', 'Write', 'Edit', 'WebFetch', 'WebSearch']);
		assert.ok(mapped.includes('read_file'), 'Read → read_file');
		assert.ok(mapped.includes('run_command'), 'Bash → run_command');
		assert.ok(mapped.includes('search_files'), 'Grep/WebFetch/WebSearch → search_files');
		assert.ok(mapped.includes('list_dir'), 'Glob → list_dir');
		assert.ok(mapped.includes('write_file'), 'Write/Edit → write_file');
		assert.equal(mapClaudeTools('Read, Bash').length, 2, 'comma-string tools accepted');

		// Discovery: project + global agents, with disallowed glob filtered.
		const subagents = loadClaudeSubagents(projectDir);
		assert.equal(subagents.length, 2, 'expected project + global subagents');

		const reviewer = subagents.find((s) => s.name === 'code-reviewer');
		assert.ok(reviewer, 'project subagent found');
		assert.equal(reviewer.origin, 'project');
		assert.equal(reviewer.model, 'sonnet');
		assert.equal(reviewer.maxTurns, 8);
		assert.ok(reviewer.tools.includes('read_file'), 'project tools mapped');
		assert.ok(reviewer.tools.includes('run_command'));

		const auditor = subagents.find((s) => s.name === 'security-audit');
		assert.ok(auditor, 'global subagent found');
		assert.equal(auditor.origin, 'global');
		assert.ok(auditor.tools.includes('read_file'));
		assert.ok(auditor.tools.includes('search_files'));
		assert.ok(!auditor.tools.includes('run_command'), 'Bash(rm *) disallowed → run_command removed');

		console.log('  ✓ claude compat subagents (frontmatter, tool map, disallowed glob, project+global)');
	} finally {
		if (prevHome === undefined) delete process.env.IDEXAL_CLAUDE_HOME;
		else process.env.IDEXAL_CLAUDE_HOME = prevHome;
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

async function testClaudeCompatMigration() {
	// migrateClaudeMemory imports CLAUDE.md facts into the Idexal memory DB,
	// tagged with the project; a second run skips everything (dedupe).
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-migrate-'));
	const globalDir = path.join(dir, 'claude-home');
	const projectDir = path.join(dir, 'project');
	const prevHome = process.env.IDEXAL_CLAUDE_HOME;
	try {
		fs.mkdirSync(globalDir, { recursive: true });
		fs.mkdirSync(projectDir, { recursive: true });
		process.env.IDEXAL_CLAUDE_HOME = globalDir;

		fs.writeFileSync(path.join(globalDir, 'CLAUDE.md'), '# Global\nAlways use tabs.\nNever commit secrets.');
		fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\nRun `npm test` before pushing.');

		const memPath = path.join(dir, 'mem.db');
		const service = new MemoryService(new MemoryStore(memPath), 'claude-mig');
		try {
			const first = migrateClaudeMemory(service, projectDir);
			assert.equal(first.sources.length, 2, 'global + project CLAUDE.md sources');
			assert.equal(first.imported, 3, '3 fact lines imported (2 global + 1 project)');

			// The facts are actually in the memory DB (recall scoped to the
			// migrated project — the service's own project differs).
			const recalled = service.recall('how do we indent?', { project: projectDir, limit: 10 });
			assert.ok(recalled.some((e) => e.content.includes('tabs')), 'global fact imported');
			assert.ok(recalled.some((e) => e.content.includes('npm test')), 'project fact imported');

			// Dedupe: re-running imports nothing new.
			const second = migrateClaudeMemory(service, projectDir);
			assert.equal(second.imported, 0, 'second migration must import nothing');
			assert.equal(second.skipped, 3, 'all previously imported lines skipped');

			// Fact splitting drops headings.
			const facts = claudeMdToFacts('# Heading\nReal fact one.\n\n## Sub\nReal fact two.');
			assert.deepEqual(facts, ['Real fact one.', 'Real fact two.'], 'headings filtered, facts kept');
		} finally {
			service.close();
		}

		console.log('  ✓ claude compat migration (CLAUDE.md → memory DB, dedupe, heading filtering)');
	} finally {
		if (prevHome === undefined) delete process.env.IDEXAL_CLAUDE_HOME;
		else process.env.IDEXAL_CLAUDE_HOME = prevHome;
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

async function testProviderConnectionProbe() {
	// The add-provider wizard's optional connection test: probe GET
	// {baseUrl}/models and report reachability + advertised models, or a
	// clear error. A stub OpenAI-compatible server covers success, keyed
	// auth (literal + env), HTTP errors, and unreachable endpoints.
	const server: Server = createServer((req, res) => {
		const url = new URL(req.url ?? '/', 'http://localhost');
		if (url.pathname === '/v1/models') {
			const auth = req.headers.authorization;
			if (auth === 'Bearer sk-bad') {
				res.writeHead(401, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: { message: 'Invalid API key provided.' } }));
				return;
			}
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ data: [{ id: 'model-a' }, { id: 'model-b' }, { id: 'model-c' }] }));
			return;
		}
		res.writeHead(404);
		res.end('{}');
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	assert.ok(address && typeof address === 'object', 'expected server to be listening');
	const port = (address as { port: number }).port;

	const prevKey = process.env.IDEXAL_TEST_PROBE_KEY;
	try {
		// Success: reachable + models advertised.
		const ok = await probeProviderModels({
			id: 'probe-ok',
			displayName: 'Probe',
			type: 'custom',
			baseUrl: `http://127.0.0.1:${port}/v1`,
			model: 'model-a',
		});
		assert.equal(ok.ok, true, `expected ok, got: ${ok.error ?? 'no error'}`);
		assert.equal(ok.status, 200);
		assert.deepEqual(ok.models, ['model-a', 'model-b', 'model-c']);
		assert.ok(ok.url.endsWith('/v1/models'), `url: ${ok.url}`);

		// Trailing slash on baseUrl is tolerated.
		const slash = await probeProviderModels({
			id: 'probe-slash',
			type: 'custom',
			baseUrl: `http://127.0.0.1:${port}/v1/`,
			model: 'model-a',
		});
		assert.equal(slash.ok, true, 'trailing slash must not break the probe');

		// Literal key → Authorization: Bearer is sent (stub allows it).
		const keyed = await probeProviderModels({
			id: 'probe-key',
			type: 'custom',
			baseUrl: `http://127.0.0.1:${port}/v1`,
			model: 'model-a',
			apiKey: 'sk-good',
		});
		assert.equal(keyed.ok, true, 'keyed probe must succeed');

		// Bad key → HTTP 401 with the API's own message surfaced.
		const bad = await probeProviderModels({
			id: 'probe-bad',
			type: 'custom',
			baseUrl: `http://127.0.0.1:${port}/v1`,
			model: 'model-a',
			apiKey: 'sk-bad',
		});
		assert.equal(bad.ok, false);
		assert.equal(bad.status, 401);
		assert.ok(bad.error?.includes('Invalid API key'), `error: ${bad.error}`);

		// apiKeyEnv is resolved from the environment.
		process.env.IDEXAL_TEST_PROBE_KEY = 'sk-env';
		const envKeyed = await probeProviderModels({
			id: 'probe-env',
			type: 'custom',
			baseUrl: `http://127.0.0.1:${port}/v1`,
			model: 'model-a',
			apiKeyEnv: 'IDEXAL_TEST_PROBE_KEY',
		});
		assert.equal(envKeyed.ok, true, 'env-keyed probe must succeed');

		// Custom headers are forwarded (stub ignores them — 200 proves it).
		const headerProbe = await probeProviderModels({
			id: 'probe-hdr',
			type: 'custom',
			baseUrl: `http://127.0.0.1:${port}/v1`,
			model: 'model-a',
			headers: { 'X-Api-Version': '2024-01' },
		});
		assert.equal(headerProbe.ok, true, 'custom header probe must succeed');

		// Unreachable → clear, non-throwing error (underlying cause surfaced).
		const dead = await probeProviderModels({
			id: 'probe-dead',
			type: 'custom',
			baseUrl: 'http://127.0.0.1:1/v1',
			model: 'model-a',
		}, { timeoutMs: 2_000 });
		assert.equal(dead.ok, false);
		assert.ok(dead.error && dead.error.includes('Could not connect'), `error: ${dead.error}`);
		assert.ok(dead.error && !dead.error.includes('fetch failed'), 'raw fetch failed must be replaced by the cause code');
		assert.equal(dead.models.length, 0);

		// Timeout: a server that never answers must abort with a clear message.
		const slow: Server = createServer((_req, _res) => {
			// Intentionally never respond.
		});
		await new Promise<void>((resolve) => slow.listen(0, '127.0.0.1', resolve));
		const slowAddr = slow.address();
		assert.ok(slowAddr && typeof slowAddr === 'object', 'expected slow server listening');
		const slowPort = (slowAddr as { port: number }).port;
		try {
			const timedOut = await probeProviderModels(
				{ id: 'probe-slow', type: 'custom', baseUrl: `http://127.0.0.1:${slowPort}/v1`, model: 'model-a' },
				{ timeoutMs: 200 },
			);
			assert.equal(timedOut.ok, false);
			assert.ok(timedOut.error?.includes('timed out'), `error: ${timedOut.error}`);
		} finally {
			slow.close();
		}

		console.log('  ✓ provider connection probe (models list, trailing slash, literal/env key, 401 message, cause code, timeout)');
	} finally {
		if (prevKey === undefined) delete process.env.IDEXAL_TEST_PROBE_KEY;
		else process.env.IDEXAL_TEST_PROBE_KEY = prevKey;
		server.close();
	}
}

async function testProviderManagementCommands() {
	// removeProviderFromConfig must delete exactly one provider from a config
	// file, preserve every other section, report false when absent, and abort
	// (throw) on unreadable JSON instead of silently wiping the config.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-mgmt-'));
	const cfgPath = path.join(dir, 'config.json');
	const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli.ts');
	try {
		// Seed a config with two providers + unrelated sections.
		fs.writeFileSync(
			cfgPath,
			JSON.stringify({
				providers: [
					{ id: 'my-groq', displayName: 'My Groq', type: 'custom', baseUrl: 'http://localhost:9001/v1', model: 'm1', priority: 4 },
					{ id: 'my-llm', displayName: 'My LLM', type: 'custom', baseUrl: 'http://localhost:9002/v1', model: 'm2', anonymous: true, priority: 9 },
				],
				agent: { maxIterations: 7 },
				myCustomKey: 1,
			}),
		);

		// 1. Remove one provider: other providers + sections survive.
		const removed = removeProviderFromConfig(cfgPath, 'my-groq');
		assert.equal(removed, true, 'expected removal to succeed');
		let parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
			providers: Array<{ id: string }>;
			agent: { maxIterations: number };
			myCustomKey: number;
		};
		assert.deepEqual(parsed.providers.map((p) => p.id), ['my-llm'], 'only the target must be removed');
		assert.equal(parsed.agent.maxIterations, 7, 'agent section must be preserved');
		assert.equal(parsed.myCustomKey, 1, 'unknown top-level keys must be preserved');

		// 2. Missing id → false, file untouched.
		const before = fs.readFileSync(cfgPath, 'utf8');
		assert.equal(removeProviderFromConfig(cfgPath, 'nope'), false);
		assert.equal(fs.readFileSync(cfgPath, 'utf8'), before, 'no-op removal must not rewrite the file');

		// 3. Malformed providers value must not crash the removal.
		fs.writeFileSync(cfgPath, JSON.stringify({ providers: { oops: true }, agent: { maxIterations: 3 } }));
		assert.equal(removeProviderFromConfig(cfgPath, 'anything'), false, 'malformed providers treated as empty list');
		assert.equal(
			(JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { agent: { maxIterations: number } }).agent.maxIterations,
			3,
			'sections preserved when providers is malformed',
		);

		// 4. Invalid JSON must abort (throw), not wipe the user's config.
		fs.writeFileSync(cfgPath, '{ this is not valid json');
		assert.throws(() => removeProviderFromConfig(cfgPath, 'x'), /not valid JSON/);
		assert.equal(fs.readFileSync(cfgPath, 'utf8'), '{ this is not valid json', 'file must be left untouched');

		// 5. End-to-end through the real CLI: `list-providers --json` must
		// print parseable JSON; `edit-provider` pre-fills the wizard; and
		// `remove-provider` deletes with confirmation (or --yes).
		fs.writeFileSync(
			cfgPath,
			JSON.stringify({
				providers: [
					{ id: 'edit-me', displayName: 'Edit Me', type: 'custom', baseUrl: 'http://localhost:9003/v1', model: 'm3', priority: 2 },
				],
				// Disable memory/usage so the subprocess never touches the
				// user's real ~/.idexal/memory.db or usage.db during tests.
				agent: { memoryEnabled: false, usageEnabled: false },
				cloud: { enabled: false },
			}),
		);
		const env = { ...process.env, IDEXAL_CONFIG_DIR: dir };

		// list-providers --json: machine-readable output.
		const jsonOut = execFileSync(process.execPath, [cliPath, 'list-providers', '--json'], { env, encoding: 'utf8' });
		const json = JSON.parse(jsonOut) as { providers: Array<{ id: string; displayName: string; status: string; model: string; baseUrl: string | null; hasKey: boolean; anonymous: boolean }> };
		assert.ok(Array.isArray(json.providers), 'expected a providers array');
		const editMe = json.providers.find((p) => p.id === 'edit-me');
		assert.ok(editMe, `expected edit-me in JSON: ${jsonOut}`);
		assert.equal(editMe.displayName, 'Edit Me');
		assert.equal(editMe.model, 'm3');
		assert.equal(typeof editMe.hasKey, 'boolean');
		assert.equal(typeof editMe.anonymous, 'boolean');
		assert.ok(['ready', 'no-key'].includes(editMe.status), `status: ${editMe.status}`);

		// edit-provider: piped answers, empty = keep current value. Change
		// the model, keep everything else; confirm with y, skip connection
		// test. Prompt order: id, displayName, baseUrl, model, apiKeyEnv,
		// apiKey (only when apiKeyEnv empty), anonymous, headers, extraBody,
		// priority, save, test-connection.
		const editInput = ['', '', '', 'm3-edited', '', '', 'n', '', '', '', 'y', 'n'].join('\n') + '\n';
		const editOut = execFileSync(process.execPath, [cliPath, 'edit-provider', 'edit-me'], {
			input: editInput,
			env,
			cwd: dir,
			encoding: 'utf8',
		});
		assert.ok(editOut.includes('Updated "edit-me"'), `edit output: ${editOut}`);
		parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: Array<{ id: string; model: string; displayName: string }> };
		assert.equal(parsed.providers[0].model, 'm3-edited', 'edit must apply the new model');
		assert.equal(parsed.providers[0].displayName, 'Edit Me', 'empty answer keeps the current display name');

		// remove-provider with confirmation (declining keeps it).
		const declineOut = execFileSync(process.execPath, [cliPath, 'remove-provider', 'edit-me'], {
			input: 'n\n',
			env,
			cwd: dir,
			encoding: 'utf8',
		});
		assert.ok(declineOut.includes('Cancelled'), `decline output: ${declineOut}`);
		assert.equal(
			(JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: Array<{ id: string }> }).providers.length,
			1,
			'declining must keep the provider',
		);

		// remove-provider with confirmation (accepting removes it).
		const confirmOut = execFileSync(process.execPath, [cliPath, 'remove-provider', 'edit-me'], {
			input: 'y\n',
			env,
			cwd: dir,
			encoding: 'utf8',
		});
		assert.ok(confirmOut.includes('Removed "edit-me"'), `confirm output: ${confirmOut}`);
		assert.equal(
			(JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: Array<{ id: string }> }).providers.length,
			0,
			'confirming must remove the provider',
		);

		// remove-provider --yes: skips the prompt entirely.
		fs.writeFileSync(
			cfgPath,
			JSON.stringify({
				providers: [{ id: 'auto-del', displayName: 'Auto', type: 'custom', baseUrl: 'http://localhost:9004/v1', model: 'm4', priority: 1 }],
				agent: { memoryEnabled: false, usageEnabled: false },
			}),
		);
		const autoOut = execFileSync(process.execPath, [cliPath, 'remove-provider', 'auto-del', '--yes'], { env, cwd: dir, encoding: 'utf8' });
		assert.ok(autoOut.includes('Removed "auto-del"'), `--yes output: ${autoOut}`);
		assert.equal(
			(JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { providers: Array<{ id: string }> }).providers.length,
			0,
			'--yes must remove without prompting',
		);

		// remove-provider of an unknown id → clear error + nonzero exit.
		let unknownFailed = false;
		try {
			execFileSync(process.execPath, [cliPath, 'remove-provider', 'ghost'], { env, cwd: dir, encoding: 'utf8' });
		} catch (err) {
			unknownFailed = true;
			assert.ok(
				String((err as { stderr?: unknown }).stderr ?? '').includes('No provider named'),
				'expected a clear error for unknown provider',
			);
		}
		assert.ok(unknownFailed, 'remove-provider of unknown id must fail');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ provider management (remove safe-delete, list-providers --json, edit-provider pre-fill, remove with confirm/--yes)');
}

async function testEnvRefExpansion() {
	// ${VAR} / $VAR references in baseUrl/headers/extraBody are accepted by
	// the wizard, validated before save (missing refs warn), and expanded at
	// provider construction + connection-probe time. Cover the helpers, the
	// factory expansion, and the wizard E2E through the real CLI.

	// --- helpers ---
	assert.deepEqual(extractEnvRefs('http://${API_BASE}:8080/v1'), ['API_BASE']);
	assert.deepEqual(extractEnvRefs('Bearer $TOKEN and ${TOKEN}'), ['TOKEN']);
	assert.deepEqual(extractEnvRefs('no refs here'), []);
	assert.deepEqual(missingEnvRefs('http://${DEFINITELY_UNSET_VAR_XYZ}/v1'), ['DEFINITELY_UNSET_VAR_XYZ']);
	assert.deepEqual(missingEnvRefsDeep({ a: '${UNSET_A}', b: [{ c: '$UNSET_B' }] }), ['UNSET_A', 'UNSET_B']);

	const saved = process.env.IDEXAL_TEST_REF;
	process.env.IDEXAL_TEST_REF = 'resolved-value';
	try {
		assert.deepEqual(missingEnvRefs('http://${IDEXAL_TEST_REF}/v1'), [], 'set var must not be missing');
		assert.equal(expandEnv('http://${IDEXAL_TEST_REF}/v1'), 'http://resolved-value/v1');
		assert.equal(expandEnv('x-$IDEXAL_TEST_REF-y'), 'x-resolved-value-y');
		assert.deepEqual(expandEnvDeep({ a: '${IDEXAL_TEST_REF}', b: [{ c: '$IDEXAL_TEST_REF' }] }), {
			a: 'resolved-value',
			b: [{ c: 'resolved-value' }],
		});
	} finally {
		if (saved === undefined) delete process.env.IDEXAL_TEST_REF;
		else process.env.IDEXAL_TEST_REF = saved;
	}

	// --- factory: expansion happens at construction ---
	const prevBase = process.env.IDEXAL_FACTORY_BASE;
	process.env.IDEXAL_FACTORY_BASE = 'http://127.0.0.1:9155';
	try {
		const provider = createProvider({
			id: 'env-factory',
			displayName: 'Env Factory',
			type: 'custom',
			baseUrl: '${IDEXAL_FACTORY_BASE}/v1',
			model: 'm',
			priority: 1,
		});
		assert.equal(provider.baseUrl, 'http://127.0.0.1:9155/v1', 'baseUrl must be expanded at construction');

		// Unset ref stays literal (expandEnv leaves it as-is) — no crash.
		const literal = createProvider({
			id: 'env-literal',
			displayName: 'Env Literal',
			type: 'custom',
			baseUrl: 'http://${UNSET_FACTORY_XYZ}/v1',
			model: 'm',
			priority: 2,
		});
		assert.equal(literal.baseUrl, 'http://${UNSET_FACTORY_XYZ}/v1');
	} finally {
		if (prevBase === undefined) delete process.env.IDEXAL_FACTORY_BASE;
		else process.env.IDEXAL_FACTORY_BASE = prevBase;
	}

	// --- wizard E2E: add-provider with an unset ref warns but can save ---
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idexal-envref-'));
	const cfgPath = path.join(dir, 'config.json');
	const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli.ts');
	try {
		// add-provider prompt order: id, displayName, baseUrl, model,
		// apiKeyEnv, apiKey, anonymous, headers, extraBody, priority, save,
		// test-connection. The missing-ref warning adds NO extra prompt when
		// the user answers the save question ('y' passes the warn gate too
		// because save-anyway and save use the same single confirmation).
		const input = ['my-env-prov', '', 'http://${IDEXAL_UNSET_PORT}/v1', 'model-x', '', '', 'n', '', '', '', 'y', 'n'].join('\n') + '\n';
		const env = { ...process.env, IDEXAL_CONFIG_DIR: dir };
		const out = execFileSync(process.execPath, [cliPath, 'add-provider'], {
			input,
			env,
			cwd: dir,
			encoding: 'utf8',
		});
		// Warning shown, provider saved as-is.
		assert.ok(out.includes('Env var reference(s) not set'), `expected warning in: ${out}`);
		assert.ok(out.includes('IDEXAL_UNSET_PORT'), `expected the var name in: ${out}`);
		assert.ok(out.includes('Saved "my-env-prov"'), `expected save in: ${out}`);

		const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
			providers: Array<{ id: string; baseUrl: string }>;
		};
		assert.equal(parsed.providers[0].id, 'my-env-prov');
		assert.equal(parsed.providers[0].baseUrl, 'http://${IDEXAL_UNSET_PORT}/v1', 'ref stored as-is');

		// list-providers --json reports the EXPANDED (literal) baseUrl. The
		// subprocess env must be snapshotted AFTER the var is set.
		process.env.IDEXAL_UNSET_PORT = '9199';
		try {
			const jsonOut = execFileSync(process.execPath, [cliPath, 'list-providers', '--json'], {
				env: { ...process.env, IDEXAL_CONFIG_DIR: dir },
				cwd: dir,
				encoding: 'utf8',
			});
			const json = JSON.parse(jsonOut) as { providers: Array<{ id: string; baseUrl: string | null }> };
			const mine = json.providers.find((p) => p.id === 'my-env-prov');
			assert.ok(mine, 'provider must be listed');
			assert.equal(mine?.baseUrl, 'http://9199/v1', 'list-providers must show the resolved baseUrl');
		} finally {
			delete process.env.IDEXAL_UNSET_PORT;
		}

		// edit-provider re-validates too: keeping the ref but confirming
		// (empty answers keep values; save=yes) succeeds without touching
		// other fields.
		const editInput = ['', '', '', '', '', '', 'n', '', '', '', 'y', 'n'].join('\n') + '\n';
		const editOut = execFileSync(process.execPath, [cliPath, 'edit-provider', 'my-env-prov'], {
			input: editInput,
			env,
			cwd: dir,
			encoding: 'utf8',
		});
		assert.ok(editOut.includes('Updated "my-env-prov"'), `edit output: ${editOut}`);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	console.log('  ✓ env var refs (extract/missing helpers, factory expansion, wizard warning, saved as-is, list shows resolved)');
}

async function main() {
	console.log('\nIdexal AI Core — integration tests\n');
	await testProviderFactory();
	await testFallbackEngine();
	await testLongTermMemory();
	await testToolExecution();
	await testChatLoopWithToolCalls();
	await testStreamingDeltasAndFallback();
	await testStreamingToolCallDedupe();
	await testSemanticMemoryWithEmbeddings();
	await testSemanticCacheInvalidation();
	await testEmbedderPrefersLocalProviders();
	await testEmbeddingCapabilities();
	await testCloudConfigIntegration();
	await testCloudSmartPriority();
	await testCloudGatewayClient();
	await testWriteProviderToConfig();
	await testConfigFileReplacesDefaultProviders();
	await testMultiAgentOrchestrator();
	await testPlanOnlyOrchestrator();
	await testReadOnlyTools();
	await testOrchestratorSkipsKeylessProviders();
	await testOrchestratorToolEvents();
	await testAgentTerminalTools();
	await testUsageStore();
	await testChatLoopRecordsUsage();
	await testChatLoopRecordsFailedCall();
	await testSetupSuggestion();
	await testSetupWriteConfig();
	await testProviderConnectionProbe();
	await testProviderManagementCommands();
	await testEnvRefExpansion();
	await testClaudeCompatSettings();
	await testClaudeCompatSubagents();
	await testClaudeCompatMigration();
	console.log('\nAll tests passed ✓\n');
}

main().catch((err) => {
	console.error('\nTest failure:', err);
	process.exitCode = 1;
});
