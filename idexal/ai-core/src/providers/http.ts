// Idexal AI Core — HTTP helper
// Minimal fetch wrapper with timeout and error normalization.

import { ProviderError } from './types.ts';

export interface HttpOptions {
	url: string;
	method: 'GET' | 'POST';
	headers: Record<string, string>;
	body?: unknown;
	timeoutMs?: number;
	signal?: AbortSignal;
}

export async function httpJson<T>(opts: HttpOptions): Promise<T> {
	const { url, method, headers, body, timeoutMs = 120_000, signal } = opts;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	// Combine external signal with timeout
	const onAbort = () => controller.abort();
	signal?.addEventListener('abort', onAbort);

	try {
		const res = await fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: controller.signal,
		});

		const raw = await res.text();
		if (!res.ok) {
			throw new ProviderError(
				`HTTP ${res.status} from ${url}: ${truncate(raw, 500)}`,
				res.status,
				'http',
				raw,
			);
		}
		if (!raw) {
			return undefined as T;
		}
		return JSON.parse(raw) as T;
	} catch (err) {
		if (err instanceof ProviderError) {
			throw err;
		}
		if (err instanceof Error && err.name === 'AbortError') {
			throw new ProviderError(`Request timed out after ${timeoutMs}ms: ${url}`, 408, 'http');
		}
		throw err;
	} finally {
		clearTimeout(timeout);
		signal?.removeEventListener('abort', onAbort);
	}
}

export function truncate(s: string, max: number): string {
	return s.length > max ? s.slice(0, max) + '…' : s;
}

export function bearerToken(token: string): string {
	return `Bearer ${token}`;
}
