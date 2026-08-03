// Idexal AI Core — usage & cost tracking (SQLite)
// Records every provider call (tokens, provider, model, role, latency,
// estimated cost) so users can see per-provider usage reports and per-task
// summaries. Uses Node's built-in node:sqlite — zero external dependencies.

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expandHome } from '../config.ts';

/** Role of the call inside the agent pipeline. */
export type UsageRole = 'planner' | 'executor' | 'reviewer' | 'chat' | 'embed';

export interface UsageRecord {
	id?: number;
	/** Epoch ms when the call finished. */
	timestamp: number;
	/** Task this call belongs to (e.g. the orchestrator run id). */
	taskId?: string;
	providerId: string;
	model: string;
	role: UsageRole;
	inputTokens: number;
	outputTokens: number;
	/** Wall-clock duration of the call in ms. */
	latencyMs: number;
	/** Estimated cost in USD. */
	costUsd: number;
	ok: boolean;
	error?: string;
}

export interface ProviderUsageSummary {
	providerId: string;
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	avgLatencyMs: number;
	lastUsed: number;
}

export interface UsageTotals {
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	avgLatencyMs: number;
}

export class UsageStore {
	private db: DatabaseSync;
	private readonly dbPath: string;

	constructor(dbPath: string = '~/.idexal/usage.db') {
		this.dbPath = expandHome(dbPath);
		const dir = path.dirname(this.dbPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		this.db = new DatabaseSync(this.dbPath);
		this.migrate();
	}

	private migrate(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS usage_records (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				timestamp INTEGER NOT NULL,
				task_id TEXT,
				provider_id TEXT NOT NULL,
				model TEXT NOT NULL,
				role TEXT NOT NULL,
				input_tokens INTEGER NOT NULL DEFAULT 0,
				output_tokens INTEGER NOT NULL DEFAULT 0,
				latency_ms INTEGER NOT NULL DEFAULT 0,
				cost_usd REAL NOT NULL DEFAULT 0,
				ok INTEGER NOT NULL DEFAULT 1,
				error TEXT
			);
			CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider_id);
			CREATE INDEX IF NOT EXISTS idx_usage_task ON usage_records(task_id);
			CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
		`);
	}

	/** Append one call record. Returns the new row id. */
	record(rec: Omit<UsageRecord, 'id'>): number {
		const result = this.db
			.prepare(
				`INSERT INTO usage_records
					(timestamp, task_id, provider_id, model, role, input_tokens, output_tokens, latency_ms, cost_usd, ok, error)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				rec.timestamp,
				rec.taskId ?? null,
				rec.providerId,
				rec.model,
				rec.role,
				rec.inputTokens,
				rec.outputTokens,
				rec.latencyMs,
				rec.costUsd,
				rec.ok ? 1 : 0,
				rec.error ?? null,
			);
		return Number(result.lastInsertRowid);
	}

	/** Per-provider rollup. */
	summary(opts: { taskId?: string; since?: number } = {}): ProviderUsageSummary[] {
		const conditions: string[] = [];
		const params: (string | number)[] = [];
		if (opts.taskId) {
			conditions.push('task_id = ?');
			params.push(opts.taskId);
		}
		if (opts.since !== undefined) {
			conditions.push('timestamp >= ?');
			params.push(opts.since);
		}
		const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
		const rows = this.db
			.prepare(
				`SELECT provider_id AS providerId,
				        COUNT(*) AS calls,
				        SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS failed,
				        COALESCE(SUM(input_tokens), 0) AS inputTokens,
				        COALESCE(SUM(output_tokens), 0) AS outputTokens,
				        COALESCE(SUM(cost_usd), 0) AS costUsd,
				        COALESCE(AVG(latency_ms), 0) AS avgLatencyMs,
				        COALESCE(MAX(timestamp), 0) AS lastUsed
				 FROM usage_records ${where}
				 GROUP BY provider_id ORDER BY costUsd DESC, calls DESC`,
			)
			.all(...params) as Array<{
			providerId: string;
			calls: number;
			failed: number;
			inputTokens: number;
			outputTokens: number;
			costUsd: number;
			avgLatencyMs: number;
			lastUsed: number;
		}>;
		return rows.map((r) => ({
			providerId: r.providerId,
			calls: r.calls,
			failed: r.failed,
			inputTokens: r.inputTokens,
			outputTokens: r.outputTokens,
			costUsd: r.costUsd,
			avgLatencyMs: Math.round(r.avgLatencyMs),
			lastUsed: r.lastUsed,
		}));
	}

	/** Aggregate totals across all providers (optionally scoped). */
	totals(opts: { taskId?: string; since?: number } = {}): UsageTotals {
		const perProvider = this.summary(opts);
		const calls = perProvider.reduce((a, p) => a + p.calls, 0);
		const failed = perProvider.reduce((a, p) => a + p.failed, 0);
		if (calls === 0) {
			return { calls: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, avgLatencyMs: 0 };
		}
		// Weighted average from per-provider averages (each already rounded
		// to whole ms in `summary`), so no double-rounding distortion.
		const totalLatencyMs = perProvider.reduce((a, p) => a + p.avgLatencyMs * p.calls, 0);
		return {
			calls,
			failed,
			inputTokens: perProvider.reduce((a, p) => a + p.inputTokens, 0),
			outputTokens: perProvider.reduce((a, p) => a + p.outputTokens, 0),
			costUsd: perProvider.reduce((a, p) => a + p.costUsd, 0),
			avgLatencyMs: Math.round(totalLatencyMs / calls),
		};
	}

	/** Most recent call records, newest first. */
	recent(limit = 10): UsageRecord[] {
		const rows = this.db
			.prepare(
				`SELECT id, timestamp, task_id AS taskId, provider_id AS providerId, model, role,
				        input_tokens AS inputTokens, output_tokens AS outputTokens,
				        latency_ms AS latencyMs, cost_usd AS costUsd, ok, error
				 FROM usage_records ORDER BY id DESC LIMIT ?`,
			)
			.all(limit) as Array<{
			id: number;
			timestamp: number;
			taskId: string | null;
			providerId: string;
			model: string;
			role: string;
			inputTokens: number;
			outputTokens: number;
			latencyMs: number;
			costUsd: number;
			ok: number;
			error: string | null;
		}>;
		return rows.map((r) => ({
			id: r.id,
			timestamp: r.timestamp,
			taskId: r.taskId ?? undefined,
			providerId: r.providerId,
			model: r.model,
			role: r.role as UsageRole,
			inputTokens: r.inputTokens,
			outputTokens: r.outputTokens,
			latencyMs: r.latencyMs,
			costUsd: r.costUsd,
			ok: r.ok === 1,
			error: r.error ?? undefined,
		}));
	}

	close(): void {
		this.db.close();
	}
}
