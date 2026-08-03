// Idexal AI Core — provider connection test
// Optional step at the end of the `add-provider` wizard (and reusable from
// any UI): probes `GET {baseUrl}/models` on an OpenAI-compatible endpoint
// and reports reachability plus the advertised model list, or a clear,
// actionable error when the endpoint is unreachable / rejects the request.
// Structured result so callers can render it however they like.

import type { ProviderConfig } from './factory.ts';
import { expandEnv, expandEnvHeaders } from './envRefs.ts';

export interface ConnectionProbe {
	/** True when the endpoint answered 2xx and models were parsed. */
	ok: boolean;
	/** HTTP status when the server answered (undefined on network error). */
	status?: number;
	/** Advertised model ids (empty when none / error). */
	models: string[];
	/** Human-readable error when not ok (never the raw stack). */
	error?: string;
	/** The exact URL that was probed (for display/debugging). */
	url: string;
}

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Probe a provider's `GET {baseUrl}/models` endpoint.
 *
 * Auth: sends `Authorization: Bearer <key>` when the provider has a literal
 * `apiKey` or its `apiKeyEnv` variable is populated; also forwards any custom
 * `headers` the provider config declares. Never throws — failures are
 * returned as `{ ok: false, error }` so callers can show a friendly message.
 */	export async function probeProviderModels(
	provider: ProviderConfig,
	opts: { timeoutMs?: number } = {},
): Promise<ConnectionProbe> {
	// Env refs (${VAR} / $VAR) in baseUrl/headers are expanded so the probe
	// tests the same effective endpoint the provider would use at runtime.
	const base = expandEnv(String(provider.baseUrl ?? '')).replace(/\/+$/, '');
	const url = `${base}/models`;

	const headers = expandEnvHeaders(provider.headers ?? {});
	const key = provider.apiKey ?? (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined);
	if (key) headers['Authorization'] = `Bearer ${key}`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	try {
		const res = await fetch(url, { headers, signal: controller.signal });
		if (res.ok) {
			const body = (await res.json().catch(() => ({}))) as { data?: Array<{ id?: string }> };
			const models = (body.data ?? [])
				.map((m) => m.id)
				.filter((id): id is string => typeof id === 'string' && id.length > 0);
			return { ok: true, status: res.status, models, url };
		}
		// Surface the API's own error message when it provides one (e.g.
		// "invalid api key" / "model not found"), else a plain status line.
		const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
		const apiMessage = body?.error?.message;
		return {
			ok: false,
			status: res.status,
			models: [],
			error: apiMessage ? `HTTP ${res.status}: ${apiMessage}` : `HTTP ${res.status} ${res.statusText}`,
			url,
		};
	} catch (err) {
		const aborted = err instanceof Error && err.name === 'AbortError';
		if (aborted) {
			return {
				ok: false,
				models: [],
				error: `Connection timed out after ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
				url,
			};
		}
		// `fetch failed` is undici's opaque wrapper — surface the underlying
		// cause code (ECONNREFUSED / ENOTFOUND / …) so the message is
		// actually actionable.
		const cause = (err as { cause?: { code?: string; message?: string } }).cause;
		const detail = cause?.code ?? cause?.message ?? (err instanceof Error ? err.message : String(err));
		return {
			ok: false,
			models: [],
			error: `Could not connect: ${detail}`,
			url,
		};
	} finally {
		clearTimeout(timeout);
	}
}
