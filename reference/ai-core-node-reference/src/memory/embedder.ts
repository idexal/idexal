// Idexal AI Core — embedding provider selection
// Picks the provider that powers semantic long-term memory retrieval.
// LOCAL embeddings endpoints (Ollama, LM Studio, vLLM, any localhost
// server) are preferred: they cost nothing, need no API key, and keep
// memory data on the machine. Keyed remote providers are only used when
// no local embeddings provider is available, and an explicit
// `agent.embeddingProvider` always wins.

import { ProviderRegistry } from '../providers/registry.ts';
import { isLocalUrl, supportsEmbeddings, type LLMProvider } from '../providers/types.ts';
import type { EmbedBatch } from './memoryService.ts';

export interface EmbedderSpec {
	/** Batch embedder bound to the chosen provider (texts → vectors). */
	embed: EmbedBatch;
	/** Effective embedding model name (override → provider → default). */
	model: string;
	providerId: string;
	/** True when the chosen provider is a local endpoint (no key needed). */
	local: boolean;
}

/**
 * Select the provider used for semantic embeddings and return a bound
 * embedder. Priority:
 *   1. An explicit `preferredId` (config.agent.embeddingProvider) when it
 *      supports embeddings.
 *   2. The first LOCAL embeddings-capable provider (Ollama / LM Studio /
 *      localhost servers) — free, keyless, private.
 *   3. The first USABLE embeddings-capable provider (has a key, is local,
 *      or is anonymous) — keyless remote providers are skipped so the
 *      embed call doesn't 401 and silently degrade to lexical recall.
 * Returns `undefined` when nothing usable supports embeddings (lexical
 * recall remains the fallback).
 */
export function pickEmbedder(
	registry: ProviderRegistry,
	preferredId?: string,
	modelOverride?: string,
): EmbedderSpec | undefined {
	const preferred = preferredId ? registry.get(preferredId) : undefined;
	const provider =
		(preferred && supportsEmbeddings(preferred) ? preferred : undefined)
		?? firstLocalEmbeddingProvider(registry)
		?? registry.findProvider((p) => registry.isUsable(p) && supportsEmbeddings(p));

	if (!provider || !provider.embed) return undefined;

	const providerModel = (provider as LLMProvider & { embeddingModel?: string }).embeddingModel;
	const model = modelOverride || providerModel || provider.defaultModel;

	const embed: EmbedBatch = (texts, signal) => provider.embed!({ inputs: texts, model, signal });
	return { embed, model, providerId: provider.id, local: isLocalUrl(provider.baseUrl) };
}

/** First provider (in registry priority order) that is local AND embeds. */
function firstLocalEmbeddingProvider(registry: ProviderRegistry): LLMProvider | undefined {
	return registry.list().find((p) => supportsEmbeddings(p) && isLocalUrl(p.baseUrl));
}
