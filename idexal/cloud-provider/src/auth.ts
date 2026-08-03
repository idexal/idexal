// Idexal Cloud Gateway — authentication & identity
// Two identities, per the design:
//   - Registered key:  Authorization: Bearer <IDEXAL_CLOUD_KEY> → key tier
//   - Anonymous:       X-Idexal-Device: <device id> → SHA-256 hashed into a
//                      non-reversible identity, or a per-IP hash when absent.
// A key that is present but unknown → 401. No key at all → anonymous tier.

import { createHash } from 'node:crypto';

export type IdentityTier = 'anonymous' | 'key';

export interface Identity {
	/** Stable opaque id for quota counters (never the raw device id / key). */
	id: string;
	tier: IdentityTier;
}

export class AuthError extends Error {
	readonly status = 401;
	readonly code = 'invalid_api_key';
}

function hash(seed: string): string {
	return createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

/**
 * Resolve the request identity.
 * @param bearer Authorization header value (or undefined).
 * @param device  X-Idexal-Device header value (or undefined).
 * @param ip      Client IP (falls back to a per-IP anonymous identity).
 * @param keys    Configured registered keys.
 */
export function resolveIdentity(
	bearer: string | undefined,
	device: string | undefined,
	ip: string,
	keys: string[],
): Identity {
	// Key present but unknown → hard 401 (lets clients know the key is bad,
	// and lets the core fall back to another provider cleanly).
	if (bearer && bearer.trim()) {
		const presented = bearer.trim().replace(/^Bearer\s+/i, '');
		if (keys.includes(presented)) {
			return { id: `key:${hash(presented)}`, tier: 'key' };
		}
		throw new AuthError('Invalid API key provided.');
	}

	// Anonymous: hash the device id when trusted, else hash the IP. Either
	// way the raw identifier is never stored or logged.
	const seed = device?.trim()
		? `device:${device.trim()}`
		: `ip:${ip}`;
	return { id: `anon:${hash(seed)}`, tier: 'anonymous' };
}

/** Normalize a client IP from the socket / proxy header. */
export function clientIp(remote: string | undefined, xForwardedFor: string | undefined): string {
	const via = xForwardedFor?.split(',')[0]?.trim();
	return via ?? remote ?? '0.0.0.0';
}
