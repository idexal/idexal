// Idexal AI Core — setup probing & priority suggestion
// Detects what's actually available on this machine (Ollama running? API
// keys in env? Idexal Cloud reachable?) and derives a sensible provider
// priority order: local providers first (free, no key), then keyed remotes,
// with the built-in cloud gateway as the fallback. Pure functions here are
// unit-tested; probeEnvironment() performs network checks with short
// timeouts and never throws.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type ProviderConfig, DEFAULT_CLOUD, CLOUD_PROVIDER_ID } from '../config.ts';

export interface SetupProbe {
	ollama: { running: boolean; models: string[] };
	keys: { anthropic: boolean; openai: boolean };
	cloud: { reachable: boolean };
}

const OLLAMA_BASE = 'http://localhost:11434';
const OLLAMA_TAGS = `${OLLAMA_BASE}/api/tags`;

/** Short-timeout fetch that never throws (offline-safe). */
async function tryFetch(url: string, timeoutMs: number): Promise<Response | undefined> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { signal: controller.signal });
	} catch {
		return undefined;
	} finally {
		clearTimeout(timer);
	}
}

/** Is Ollama up? Returns its advertised models when reachable. */
async function probeOllama(): Promise<SetupProbe['ollama']> {
	try {
		const res = await tryFetch(OLLAMA_TAGS, 1500);
		if (!res?.ok) return { running: false, models: [] };
		const body = (await res.json().catch(() => ({}))) as { models?: Array<{ name?: string }> };
		const models = (body.models ?? []).map((m) => m.name ?? '').filter(Boolean);
		return { running: true, models };
	} catch {
		return { running: false, models: [] };
	}
}

/** Check API keys in the environment (never prints the key itself). */
function probeKeys(): SetupProbe['keys'] {
	return {
		anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
		openai: Boolean(process.env.OPENAI_API_KEY),
	};
}

/** Is the Idexal Cloud gateway reachable? */
async function probeCloud(): Promise<SetupProbe['cloud']> {
	try {
		const res = await tryFetch(`${DEFAULT_CLOUD.baseUrl}/models`, 4000);
		return { reachable: Boolean(res?.ok) };
	} catch {
		return { reachable: false };
	}
}

/** Probe everything in parallel with short timeouts. Never throws. */
export async function probeEnvironment(): Promise<SetupProbe> {
	const [ollama, cloud] = await Promise.all([probeOllama(), probeCloud()]);
	return { ollama, keys: probeKeys(), cloud };
}

/**
 * One-line summary of the probe for the setup banner. Matches
 * suggestProviders exactly: the cloud is only listed when reachable.
 */
export function formatPriority(probe: SetupProbe): string {
	const parts: string[] = [];
	if (probe.ollama.running) parts.push('ollama');
	if (probe.keys.anthropic) parts.push('anthropic');
	if (probe.keys.openai) parts.push('openai');
	if (probe.cloud.reachable) parts.push('idexal-cloud (fallback)');
	return parts.length ? parts.join(' → ') : '(nothing usable detected)';
}

/**
 * Derive the suggested provider list + primary provider from a probe.
 * Pure and deterministic — the unit test asserts these exact outcomes:
 *   • ollama running        → ollama first (free, local)
 *   • anthropic/openai keys → keyed remotes after local, by key presence
 *   • cloud                 → only when reachable, at the END as fallback
 *   • primary               → first usable provider, else ''
 */
export function suggestProviders(probe: SetupProbe): { providers: ProviderConfig[]; primaryProvider: string } {
	const providers: ProviderConfig[] = [];
	let next = 1;

	if (probe.ollama.running) {
		providers.push({
			id: 'ollama',
			displayName: 'Ollama (Local)',
			type: 'openai-compatible',
			baseUrl: 'http://localhost:11434/v1',
			model: probe.ollama.models[0] ?? 'llama3.1',
			priority: next++,
		});
	}

	if (probe.keys.anthropic) {
		providers.push({
			id: 'anthropic',
			displayName: 'Anthropic Claude',
			type: 'anthropic',
			model: 'claude-sonnet-4-20250514',
			apiKeyEnv: 'ANTHROPIC_API_KEY',
			priority: next++,
		});
	}

	if (probe.keys.openai) {
		providers.push({
			id: 'openai',
			displayName: 'OpenAI',
			type: 'openai',
			model: 'gpt-4o',
			apiKeyEnv: 'OPENAI_API_KEY',
			priority: next++,
		});
	}

	// The free cloud gateway is the zero-config fallback — always last
	// among usable providers, only listed when actually reachable.
	if (probe.cloud.reachable) {
		providers.push({
			id: CLOUD_PROVIDER_ID,
			displayName: 'Idexal Cloud (free)',
			type: 'openai-compatible',
			baseUrl: DEFAULT_CLOUD.baseUrl,
			model: DEFAULT_CLOUD.model,
			apiKeyEnv: DEFAULT_CLOUD.apiKeyEnv,
			anonymous: true,
			priority: next++,
		});
	}

	const primaryProvider = providers.length > 0 ? providers[0].id : '';
	return { providers, primaryProvider };
}

/** Ensure the config dir exists (no-op when it does). */
export function ensureConfigDir(configPath: string): void {
	fs.mkdirSync(path.dirname(configPath), { recursive: true });
}
