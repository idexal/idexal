// Idexal Cloud Gateway — quota store
// Daily usage counters per identity (anonymous device or registered key),
// persisted in SQLite (node:sqlite, zero deps). Also provides an in-memory
// burst rate limiter per identity per minute. Over-limit → 429 (the core
// treats 429 as retryable and falls back to the user's next provider).

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TierLimits } from './config.ts';

export interface QuotaSnapshot {
	requests: number;
	outputTokens: number;
	embeddings: number;
}

export class QuotaStore {
	private db: DatabaseSync;

	constructor(dbPath: string) {
		const dir = path.dirname(dbPath);
		if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		this.db = new DatabaseSync(dbPath);
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS quota_daily (
				identity TEXT NOT NULL,
				day TEXT NOT NULL,
				requests INTEGER NOT NULL DEFAULT 0,
				output_tokens INTEGER NOT NULL DEFAULT 0,
				embeddings INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (identity, day)
			);
		`);
	}

	private today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	private row(identity: string, day: string): QuotaSnapshot {
		const row = this.db
			.prepare(`SELECT requests, output_tokens AS outputTokens, embeddings FROM quota_daily WHERE identity = ? AND day = ?`)
			.get(identity, day) as { requests: number; outputTokens: number; embeddings: number } | undefined;
		return row ?? { requests: 0, outputTokens: 0, embeddings: 0 };
	}

	private bump(identity: string, day: string, delta: Partial<QuotaSnapshot>): void {
		this.db
			.prepare(
				`INSERT INTO quota_daily (identity, day, requests, output_tokens, embeddings)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(identity, day) DO UPDATE SET
					requests = quota_daily.requests + excluded.requests,
					output_tokens = quota_daily.output_tokens + excluded.output_tokens,
					embeddings = quota_daily.embeddings + excluded.embeddings`,
			)
			.run(identity, day, delta.requests ?? 0, delta.outputTokens ?? 0, delta.embeddings ?? 0);
	}

	/**
	 * Check + atomically consume quota for one chat request. Returns the
	 * remaining allowance; throws QuotaExceededError with a message when any
	 * daily limit would be exceeded.
	 */
	consumeChat(identity: string, outputTokens: number, limits: TierLimits): QuotaSnapshot {
		const day = this.today();
		const cur = this.row(identity, day);
		const nextRequests = cur.requests + 1;
		const nextTokens = cur.outputTokens + outputTokens;
		if (nextRequests > limits.requestsPerDay) {
			throw new QuotaExceededError(
				`Daily request limit reached (${limits.requestsPerDay}/day). Use a free IDEXAL_CLOUD_KEY for a higher quota, or wait until tomorrow.`,
				'requests_per_day',
				cur,
			);
		}
		if (nextTokens > limits.outputTokensPerDay) {
			throw new QuotaExceededError(
				`Daily output-token limit reached (${limits.outputTokensPerDay}/day). Use a free IDEXAL_CLOUD_KEY for a higher quota, or wait until tomorrow.`,
				'output_tokens_per_day',
				cur,
			);
		}
		this.bump(identity, day, { requests: 1, outputTokens });
		return { requests: nextRequests, outputTokens: nextTokens, embeddings: cur.embeddings };
	}

	/**
	 * Reconcile today's output-token counter (refund or top-up) after the
	 * actual usage is known. Positive delta tops up (actual > estimate),
	 * negative refunds (actual < estimate). Clamped at zero so a refund can
	 * never push the counter negative.
	 */
	adjustTokens(identity: string, delta: number): void {
		const day = this.today();
		const cur = this.row(identity, day);
		const nextTokens = Math.max(0, cur.outputTokens + delta);
		this.bump(identity, day, { outputTokens: nextTokens - cur.outputTokens });
	}

	/** Consume one embedding call (billed separately, smaller quota). */
	consumeEmbedding(identity: string, limits: TierLimits): QuotaSnapshot {
		const day = this.today();
		const cur = this.row(identity, day);
		const next = cur.embeddings + 1;
		if (next > limits.embeddingsPerDay) {
			throw new QuotaExceededError(
				`Daily embedding limit reached (${limits.embeddingsPerDay}/day). Use a free IDEXAL_CLOUD_KEY for a higher quota, or wait until tomorrow.`,
				'embeddings_per_day',
				cur,
			);
		}
		this.bump(identity, day, { embeddings: 1 });
		return { requests: cur.requests, outputTokens: cur.outputTokens, embeddings: next };
	}

	snapshot(identity: string): QuotaSnapshot {
		return this.row(identity, this.today());
	}

	close(): void {
		try {
			this.db.close();
		} catch {
			// already closed
		}
	}
}

export class QuotaExceededError extends Error {
	readonly code: string;
	readonly snapshot: QuotaSnapshot;
	constructor(message: string, code: string, snapshot: QuotaSnapshot) {
		super(message);
		this.code = code;
		this.snapshot = snapshot;
	}
}

/** Sliding-window burst limiter per identity (in-memory, per process). */
export class BurstLimiter {
	private hits = new Map<string, number[]>();
	private readonly windowMs = 60_000;
	private readonly defaultMaxPerMinute: number;

	constructor(defaultMaxPerMinute: number) {
		this.defaultMaxPerMinute = defaultMaxPerMinute;
	}

	/**
	 * Returns true when the request is allowed; records the hit. `maxPerMinute`
	 * overrides the constructor default for this call — callers pass the
	 * caller's own tier limit (e.g. a higher limit for registered keys) so one
	 * shared limiter instance can enforce per-tier rates instead of a single
	 * fixed rate for every identity.
	 */
	allow(identity: string, maxPerMinute: number = this.defaultMaxPerMinute): boolean {
		const now = Date.now();
		const cutoff = now - this.windowMs;
		let arr = this.hits.get(identity);
		if (!arr) {
			arr = [];
			this.hits.set(identity, arr);
		}
		// Drop hits outside the window, keep the tail (window end = now).
		const kept: number[] = [];
		for (const t of arr) {
			if (t >= cutoff) kept.push(t);
		}
		arr.length = 0;
		arr.push(...kept);
		if (arr.length >= maxPerMinute) return false;
		arr.push(now);
		// Opportunistic cleanup of idle identities.
		if (this.hits.size > 10_000) {
			for (const [k, v] of this.hits) {
				if (v.length === 0 || v[v.length - 1]! < cutoff) this.hits.delete(k);
			}
		}
		return true;
	}
}
