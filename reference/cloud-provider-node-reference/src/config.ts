// Idexal Cloud Gateway — configuration
// Reads all server settings from environment variables with sensible
// defaults, so `npm start` works out of the box against local Ollama and
// picks up OpenAI/Anthropic keys when present.

import * as path from 'node:path';
import * as fs from 'node:fs';
import { listModels } from './models.ts';

export interface UpstreamConfig {
	/** Stable id, e.g. "ollama", "openai", "anthropic". */
	id: string;
	/** Protocol adapter: 'openai-compatible' or 'anthropic'. */
	kind: 'openai-compatible' | 'anthropic';
	/** Base URL of the upstream API (without trailing slash). */
	baseUrl: string;
	/** Env var holding the upstream API key (optional for local upstreams). */
	apiKeyEnv?: string;
	/** Literal key (preferred over apiKeyEnv when set). */
	apiKey?: string;
	/** Public model id → upstream model name, e.g. idexal-1 → llama3.1. */
	modelMap: Record<string, string>;
	/** Lower priority = tried first. */
	priority: number;
	/** Embeddings upstream model (for idexal-embed-1). */
	embeddingModel?: string;
	/** Request timeout in ms. */
	timeoutMs?: number;
}

export interface TierLimits {
	/** Max chat requests per day. */
	requestsPerDay: number;
	/** Max output tokens per day (approximate, from usage deltas). */
	outputTokensPerDay: number;
	/** Max embedding calls per day. */
	embeddingsPerDay: number;
}

export interface GatewayConfig {
	host: string;
	port: number;
	/** Registered API keys (IDEXAL_CLOUD_KEY / Authorization: Bearer). */
	keys: string[];
	/** SQLite file for quota counters. */
	quotaDbPath: string;
	/** Anonymous (no key) tier limits. */
	anonLimits: TierLimits;
	/** Registered-key tier limits. */
	keyLimits: TierLimits;
	/** Burst rate limit per identity per minute (in-memory). */
	burstPerMinuteAnon: number;
	burstPerMinuteKey: number;
	/** Upstream providers in priority order (fallback chain). */
	upstreams: UpstreamConfig[];
	/** Whether to honor X-Idexal-Device identity headers. */
	trustDeviceHeader: boolean;
	/** CORS origin (default *). */
	corsOrigin: string;
}

function bool(v: string | undefined, dflt: boolean): boolean {
	if (v === undefined) return dflt;
	return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function int(v: string | undefined, dflt: number): number {
	if (v === undefined || v === '') return dflt;
	const n = Number(v);
	return Number.isFinite(n) ? n : dflt;
}

function splitList(v: string | undefined): string[] {
	return (v ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/** Parse a `key=value` upstream list: IDEXAL_GATEWAY_UPSTREAMS="ollama=...,openai=..." */
function upstreamsFromEnv(): UpstreamConfig[] {
	const raw = process.env.IDEXAL_GATEWAY_UPSTREAMS;
	const out: UpstreamConfig[] = [];
	if (raw) {
		for (const part of splitList(raw)) {
			const [id, baseUrl] = part.split('=', 2);
			if (!id || !baseUrl) continue;
			out.push(defaultUpstream(id, baseUrl));
		}
		return out;
	}
	// Defaults: local Ollama first, then keyed remote providers.
	const defaults: Array<[string, string, 'openai-compatible' | 'anthropic']> = [
		['ollama', 'http://localhost:11434/v1', 'openai-compatible'],
		['openai', 'https://api.openai.com/v1', 'openai-compatible'],
		['anthropic', 'https://api.anthropic.com', 'anthropic'],
	];
	for (const [id, baseUrl, kind] of defaults) {
		if (process.env[`IDEXAL_GATEWAY_DISABLE_${id.toUpperCase()}`]) continue;
		out.push(defaultUpstream(id, baseUrl, kind));
	}
	return out;
}

function defaultUpstream(id: string, baseUrl: string, kind: 'openai-compatible' | 'anthropic' = 'openai-compatible'): UpstreamConfig {
	const upper = id.toUpperCase();
	const apiKeyEnv = process.env[`IDEXAL_GATEWAY_${upper}_KEY_ENV`] ?? (id === 'openai' ? 'OPENAI_API_KEY' : id === 'anthropic' ? 'ANTHROPIC_API_KEY' : undefined);
	const modelMap = modelMapFor(id);
	return {
		id,
		kind,
		baseUrl: baseUrl.replace(/\/+$/, ''),
		...(apiKeyEnv ? { apiKeyEnv } : {}),
		modelMap,
		priority: int(process.env[`IDEXAL_GATEWAY_${upper}_PRIORITY`], priorityFor(id)),
		embeddingModel: process.env[`IDEXAL_GATEWAY_${upper}_EMBED_MODEL`],
		timeoutMs: int(process.env[`IDEXAL_GATEWAY_${upper}_TIMEOUT`], 120_000),
	};
}

function priorityFor(id: string): number {
	return id === 'ollama' ? 1 : id === 'openai' ? 2 : 3;
}

function modelMapFor(id: string): Record<string, string> {
	switch (id) {
		case 'ollama':
			return { 'idexal-1': 'llama3.1', 'idexal-1-fast': 'llama3.2:3b', 'idexal-embed-1': 'nomic-embed-text' };
		case 'openai':
			return { 'idexal-1': 'gpt-4o-mini', 'idexal-1-fast': 'gpt-4o-mini', 'idexal-embed-1': 'text-embedding-3-small' };
		case 'anthropic':
			return { 'idexal-1': 'claude-sonnet-4-20250514', 'idexal-1-fast': 'claude-haiku-4-5-20251001' };
		default:
			return {};
	}
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
	return {
		host: env.IDEXAL_GATEWAY_HOST ?? '127.0.0.1',
		port: int(env.PORT ?? env.IDEXAL_GATEWAY_PORT, 8787),
		keys: splitList(env.IDEXAL_CLOUD_KEYS ?? env.IDEXAL_GATEWAY_KEYS),
		quotaDbPath: env.IDEXAL_GATEWAY_QUOTA_DB ?? path.join(process.cwd(), 'gateway-quota.db'),
		anonLimits: {
			requestsPerDay: int(env.IDEXAL_GATEWAY_ANON_REQUESTS_PER_DAY, 200),
			outputTokensPerDay: int(env.IDEXAL_GATEWAY_ANON_TOKENS_PER_DAY, 50_000),
			embeddingsPerDay: int(env.IDEXAL_GATEWAY_ANON_EMBEDDINGS_PER_DAY, 1_000),
		},
		keyLimits: {
			requestsPerDay: int(env.IDEXAL_GATEWAY_KEY_REQUESTS_PER_DAY, 2_000),
			outputTokensPerDay: int(env.IDEXAL_GATEWAY_KEY_TOKENS_PER_DAY, 500_000),
			embeddingsPerDay: int(env.IDEXAL_GATEWAY_KEY_EMBEDDINGS_PER_DAY, 5_000),
		},
		burstPerMinuteAnon: int(env.IDEXAL_GATEWAY_BURST_ANON, 30),
		burstPerMinuteKey: int(env.IDEXAL_GATEWAY_BURST_KEY, 300),
		upstreams: upstreamsFromEnv(),
		trustDeviceHeader: bool(env.IDEXAL_GATEWAY_TRUST_DEVICE_HEADER, false),
		corsOrigin: env.IDEXAL_GATEWAY_CORS_ORIGIN ?? '*',
	};
}

/** Config summary shown at startup (never prints keys). */
export function describeConfig(cfg: GatewayConfig): string {
	return [
		`  listening on ${cfg.host}:${cfg.port}`,
		`  quota db: ${cfg.quotaDbPath}`,
		`  registered keys: ${cfg.keys.length ? `${cfg.keys.length} configured` : '(none — anonymous tier only)'}`,
		`  anonymous: ${cfg.anonLimits.requestsPerDay} req/day, ${cfg.anonLimits.outputTokensPerDay} out-tokens/day`,
		`  keyed:     ${cfg.keyLimits.requestsPerDay} req/day, ${cfg.keyLimits.outputTokensPerDay} out-tokens/day`,
		`  models: ${listModels().map((m) => m.id).join(', ')}`,
		`  upstreams: ${cfg.upstreams.map((u) => `${u.id}(${u.kind})@${u.baseUrl}`).join(', ') || '(none!)'}`,
	].join('\n');
}

/** Resolve an upstream's usable API key (or undefined for local/anonymous). */
export function upstreamKey(u: UpstreamConfig): string | undefined {
	return u.apiKey ?? (u.apiKeyEnv ? process.env[u.apiKeyEnv] : undefined);
}

/** Whether an upstream can actually be used right now. */
export function upstreamUsable(u: UpstreamConfig): boolean {
	const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u.baseUrl);
	return isLocal || Boolean(upstreamKey(u));
}

/** Read the first existing file from a list (for .env-style support). */
export function maybeReadEnvFile(): void {
	const candidates = ['.env', '.env.local'];
	for (const f of candidates) {
		if (!fs.existsSync(f)) continue;
		for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
			const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
			if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
		}
		return;
	}
}
