// Idexal AI Core — provider registry + automatic fallback engine
// Registers any number of providers and fails over between them on
// errors, rate limits, and timeouts, with health tracking and cooldowns.

import {
	type ChatRequest,
	type ChatResponse,
	type LLMProvider,
	type StreamDelta,
	isLocalUrl,
	isRetryableError,
	ProviderError,
} from './types.ts';
import { accumulateStream } from './stream.ts';

export interface FallbackOptions {
	/** Max attempts across all providers before giving up. */
	maxAttempts?: number;
	/** Base delay for exponential backoff (ms). */
	backoffMs?: number;
	/** Max backoff delay (ms). */
	maxBackoffMs?: number;
	/** Called with progress info for logging/UI. */
	onRetry?: (info: { attempt: number; provider: LLMProvider; error: unknown; willRetry: boolean }) => void;
}

interface ProviderHealth {
	consecutiveFailures: number;
	cooldownUntil: number;
}

export class ProviderRegistry {
	private readonly providers = new Map<string, LLMProvider>();
	private readonly priorities = new Map<string, number>();
	private readonly order: string[] = [];
	private readonly health = new Map<string, ProviderHealth>();

	register(provider: LLMProvider, priority?: number): void {
		if (!this.providers.has(provider.id)) {
			this.order.push(provider.id);
		}
		this.providers.set(provider.id, provider);
		if (priority !== undefined) {
			this.priorities.set(provider.id, priority);
		}
		// Re-sort by priority (lower = higher priority), stable for ties
		// (insertion order preserved for equal priorities)
		const withPriority = this.order.map((id, idx) => ({
			id,
			priority: this.priorities.get(id) ?? Number.MAX_SAFE_INTEGER,
			idx,
		}));
		withPriority.sort((a, b) => a.priority - b.priority || a.idx - b.idx);
		this.order.length = 0;
		for (const p of withPriority) this.order.push(p.id);

		this.health.set(provider.id, { consecutiveFailures: 0, cooldownUntil: 0 });
	}

	get(id: string): LLMProvider | undefined {
		return this.providers.get(id);
	}

	list(): LLMProvider[] {
		return this.order.map((id) => this.providers.get(id)!).filter(Boolean);
	}

	/** Ordered list of providers that are currently available (not in cooldown). */
	available(): LLMProvider[] {
		const now = Date.now();
		return this.order
			.map((id) => this.providers.get(id)!)
			.filter((p) => {
				const h = this.health.get(p.id);
				return !h || h.cooldownUntil <= now;
			});
	}

	/**
	 * Whether a provider can actually be used right now: anonymous tiers and
	 * local servers never need a key; remote providers do. Providers without
	 * credentials are skipped during fallback instead of aborting the chain
	 * (a keyless remote provider failing with 401 would otherwise stop every
	 * request, even when a later provider would have succeeded).
	 */
	isUsable(provider: LLMProvider): boolean {
		if (provider.anonymous) return true;
		if (isLocalUrl(provider.baseUrl)) return true;
		const key = (provider as { apiKey?: string }).apiKey;
		return Boolean(key);
	}

	recordSuccess(providerId: string): void {
		const h = this.health.get(providerId);
		if (h) {
			h.consecutiveFailures = 0;
			h.cooldownUntil = 0;
		}
	}

	recordFailure(providerId: string, cooldownMs = 30_000): void {
		const h = this.health.get(providerId);
		if (h) {
			h.consecutiveFailures += 1;
			h.cooldownUntil = Date.now() + cooldownMs;
		}
	}

	/**
	 * Run a chat request with automatic failover across providers.
	 * Tries providers in priority order; on retryable errors moves to the
	 * next provider with exponential backoff. Returns on first success.
	 */
	async chatWithFallback(request: ChatRequest, opts: FallbackOptions = {}): Promise<ChatResponse> {
		const { response } = await this.streamWithFallback(request, opts);
		return response;
	}

	/**
	 * Like [`chatWithFallback`](Self::chatWithFallback) but surfaces live
	 * `provider` / `error` / `text` / `toolCall` / `usage` deltas to
	 * `request.onStream` while a provider is streaming (or after a
	 * non-streaming response completes). Emits a `done` delta with usage on
	 * success and `error` deltas as providers fail over.
	 */
	async streamWithFallback(
		request: ChatRequest,
		opts: FallbackOptions = {},
	): Promise<{ response: ChatResponse; providerId: string; attempts: number }> {
		const maxAttempts = opts.maxAttempts ?? Math.max(this.order.length * 2, this.order.length);
		const backoffMs = opts.backoffMs ?? 500;
		const maxBackoffMs = opts.maxBackoffMs ?? 10_000;

		let lastError: unknown;
		let attempt = 0;
		let providerIndex = 0;

		while (attempt < maxAttempts) {
			// Skip providers that cannot be used (no key, not anonymous, not
			// local) so a keyless entry never aborts the fallback chain.
			const pool = this.available().filter((p) => this.isUsable(p));
			let provider = pool.length > 0 ? pool[providerIndex % pool.length] : undefined;
			// All providers are cooling down (e.g. a single provider that
			// keeps failing with a retryable error, or every provider failed
			// once). Cooldowns guard *future* requests; within this request
			// we may still retry a usable provider after backoff — otherwise
			// `maxAttempts` would be pointless for single-provider setups.
			if (!provider) {
				const all = this.list().filter((p) => this.isUsable(p));
				if (all.length > 0) {
					provider = all[providerIndex % all.length];
				}
			}
			if (!provider) {
				throw new ProviderError(
					`No usable providers (all failed, cooling down, or missing API keys). Last error: ${describe(lastError)}`,
					503,
					'registry',
				);
			}
			attempt++;

			// Announce which provider is being used so UIs can show progress.
			request.onStream?.({
				type: 'provider',
				providerId: provider.id,
				displayName: provider.displayName,
			});

			try {
				let response: ChatResponse;
				if (provider.stream) {
					response = await accumulateStream(provider, request);
				} else {
					response = await provider.chat(request);
					if (response.usage) request.onStream?.({ type: 'usage', usage: response.usage });
					for (const tc of response.toolCalls ?? []) request.onStream?.({ type: 'toolCall', toolCall: tc });
					if (response.content) request.onStream?.({ type: 'text', text: response.content });
				}
				this.recordSuccess(provider.id);
				request.onStream?.({ type: 'done', usage: response.usage });
				return { response, providerId: provider.id, attempts: attempt };
			} catch (err) {
				lastError = err;
				this.recordFailure(provider.id);
				const willRetry = attempt < maxAttempts && isRetryableError(err);
				opts.onRetry?.({ attempt, provider, error: err, willRetry });
				// Always surface the failure to the UI — both when we continue
				// failing over and when we give up, so consumers see a
				// consistent `provider` → `error` sequence.
				request.onStream?.({ type: 'error', error: describe(err) });
				if (!willRetry) {
					if (err instanceof ProviderError) throw err;
					throw new ProviderError(`Provider '${provider.id}' failed: ${describe(err)}`, 0, provider.id);
				}
				// Backoff then advance to the next provider
				const delay = Math.min(backoffMs * 2 ** (attempt - 1), maxBackoffMs);
				await sleep(delay);
				providerIndex++;
			}
		}
		throw new ProviderError(`Exhausted ${maxAttempts} attempts: ${describe(lastError)}`, 0, 'registry');
	}

	/**
	 * Pick the best provider for a side task (e.g. embeddings) based on a
	 * capability predicate. Prefers the primary provider; falls back to the
	 * first matching provider in priority order.
	 */
	findProvider(predicate: (p: LLMProvider) => boolean, preferredId?: string): LLMProvider | undefined {
		if (preferredId) {
			const preferred = this.providers.get(preferredId);
			if (preferred && predicate(preferred)) return preferred;
		}
		return this.list().find(predicate);
	}

	/** Reset health state (e.g. after config reload). */
	resetHealth(): void {
		for (const id of this.order) {
			this.health.set(id, { consecutiveFailures: 0, cooldownUntil: 0 });
		}
	}
}

function describe(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
