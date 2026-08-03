// Idexal AI Core — provider factory
// Creates providers from configuration objects, including fully custom
// OpenAI-compatible providers with arbitrary base URLs, headers, and models.

import { AnthropicProvider } from './anthropic.ts';
import { OpenAiCompatibleProvider } from './openaiCompat.ts';
import { ProviderRegistry } from './registry.ts';
import { type LLMProvider, ProviderNotConfiguredError } from './types.ts';
import { expandEnv, expandEnvDeep, expandEnvHeaders } from './envRefs.ts';

export type ProviderType = 'anthropic' | 'openai-compatible' | 'openai' | 'custom';

export interface ProviderConfig {
	id: string;
	displayName?: string;
	type: ProviderType;
	baseUrl?: string;
	apiKey?: string;
	apiKeyEnv?: string;
	model: string;
	headers?: Record<string, string>;
	extraBody?: Record<string, unknown>;
	priority?: number;
	contextWindow?: number;
	/** Dedicated embeddings model for semantic memory (OpenAI-compatible). */
	embeddingModel?: string;
	/** Request timeout in ms for this provider's HTTP calls. */
	timeoutMs?: number;
	/** True when the endpoint works without an API key (anonymous tier). */
	anonymous?: boolean;
}

const PRESET_BASE_URLS: Record<string, string> = {
	openai: 'https://api.openai.com/v1',
	openrouter: 'https://openrouter.ai/api/v1',
	groq: 'https://api.groq.com/openai/v1',
	deepseek: 'https://api.deepseek.com/v1',
	mistral: 'https://api.mistral.ai/v1',
	together: 'https://api.together.xyz/v1',
	ollama: 'http://localhost:11434/v1',
	lmstudio: 'http://localhost:1234/v1',
	vllm: 'http://localhost:8000/v1',
};

export function createProvider(cfg: ProviderConfig): LLMProvider {
	switch (cfg.type) {
		case 'anthropic': {
			return new AnthropicProvider({
				id: cfg.id,
				displayName: cfg.displayName,
				apiKey: cfg.apiKey,
				apiKeyEnv: cfg.apiKeyEnv,
				// Env refs (${VAR} / $VAR) in baseUrl/headers are expanded at
				// construction so custom providers resolve them at runtime.
				// loadConfig pre-expands the cloud baseUrl; expanding again here
				// is idempotent for plain URLs (only a $WORD pattern inside an
				// env value itself would re-expand — accepted).
				baseUrl: cfg.baseUrl ? expandEnv(cfg.baseUrl) : undefined,
				defaultModel: cfg.model,
				headers: cfg.headers ? expandEnvHeaders(cfg.headers) : undefined,
			});
		}
		case 'openai-compatible':
		case 'openai':
		case 'custom': {
			const rawBase = cfg.baseUrl ?? PRESET_BASE_URLS[cfg.id] ?? PRESET_BASE_URLS[cfg.type];
			if (!rawBase) {
				throw new Error(`Provider '${cfg.id}' requires a baseUrl`);
			}
			const baseUrl = expandEnv(rawBase);
			return new OpenAiCompatibleProvider({
				id: cfg.id,
				displayName: cfg.displayName ?? cfg.id,
				baseUrl,
				apiKey: cfg.apiKey,
				apiKeyEnv: cfg.apiKeyEnv,
				defaultModel: cfg.model,
				headers: cfg.headers ? expandEnvHeaders(cfg.headers) : undefined,
				// extraBody is arbitrary JSON — expand refs in every string
				// value (deep walk) so ${TOKEN} works anywhere in the payload.
				extraBody: cfg.extraBody ? (expandEnvDeep(cfg.extraBody) as Record<string, unknown>) : undefined,
				embeddingModel: cfg.embeddingModel,
				timeoutMs: cfg.timeoutMs,
				anonymous: cfg.anonymous,
				capabilities: cfg.contextWindow ? { contextWindow: cfg.contextWindow } : undefined,
			});
		}
		default: {
			throw new Error(`Unknown provider type: ${String((cfg as { type?: string }).type)}`);
		}
	}
}

/** Build a registry from an array of provider configs, preserving order. */
export function buildRegistry(configs: ProviderConfig[]): ProviderRegistry {
	const registry = new ProviderRegistry();
	for (const cfg of configs) {
		registry.register(createProvider(cfg), cfg.priority);
	}
	return registry;
}

/** Verify that a provider has credentials configured (or is a local one). */
export function assertConfigured(provider: LLMProvider, apiKey?: string): void {
	const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(provider.baseUrl ?? '');
	const hasKey = Boolean(
		apiKey ?? provider['apiKey'] ?? process.env[`${provider.id.toUpperCase().replace(/-/g, '_')}_API_KEY`] ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY,
	);
	if (!isLocal && !hasKey) {
		throw new ProviderNotConfiguredError(provider.id);
	}
}
