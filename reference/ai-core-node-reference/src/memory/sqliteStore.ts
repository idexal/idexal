// Idexal AI Core — long-term memory (SQLite)
// Uses Node's built-in node:sqlite so there are zero external dependencies.
// Stores sessions, messages, facts, and episode summaries that persist
// across runs — the "long-term memory" of the agent.

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expandHome } from '../config.ts';

export interface MemoryEntry {
	id: number;
	type: 'session' | 'fact' | 'episode' | 'decision' | 'preference';
	content: string;
	project?: string;
	createdAt: number;
	lastAccessedAt: number;
	accessCount: number;
	keywords: string;
}

export interface RecallOptions {
	limit?: number;
	project?: string;
	types?: MemoryEntry['type'][];
	minRelevance?: number;
}

export class MemoryStore {
	private db: DatabaseSync;
	private readonly dbPath: string;

	constructor(dbPath: string = '~/.idexal/memory.db') {
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
			CREATE TABLE IF NOT EXISTS memories (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				type TEXT NOT NULL,
				content TEXT NOT NULL,
				project TEXT,
				created_at INTEGER NOT NULL,
				last_accessed_at INTEGER NOT NULL,
				access_count INTEGER NOT NULL DEFAULT 0,
				keywords TEXT NOT NULL DEFAULT ''
			);
			CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
			CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project);
			CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
			-- Cached embedding vectors for semantic recall (JSON array).
			-- Dimension is provider-specific; stored alongside the vector so
			-- recall can detect and re-embed when the provider changes.
			CREATE TABLE IF NOT EXISTS memory_embeddings (
				memory_id INTEGER PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
				dimension INTEGER NOT NULL,
				model TEXT,
				vector TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			);
		`);
	}

	remember(type: MemoryEntry['type'], content: string, opts: { project?: string; keywords?: string[] } = {}): number {
		const now = Date.now();
		const keywords = (opts.keywords ?? extractKeywords(content)).join(',');
		const result = this.db
			.prepare(
				`INSERT INTO memories (type, content, project, created_at, last_accessed_at, access_count, keywords)
				 VALUES (?, ?, ?, ?, ?, 0, ?)`,
			)
			.run(type, content, opts.project ?? null, now, now, keywords);
		return Number(result.lastInsertRowid);
	}

	/** Update an existing memory entry (e.g. refine a fact). */
	update(id: number, content: string): void {
		this.db
			.prepare(`UPDATE memories SET content = ?, keywords = ? WHERE id = ?`)
			.run(content, extractKeywords(content).join(','), id);
	}

	forget(id: number): void {
		this.db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
	}

	/**
	 * Recall memories relevant to a query. Scores by keyword overlap and
	 * recency. This is a lightweight lexical retrieval; the memory service
	 * layers semantic embedding retrieval on top via `listRecent`.
	 */
	recall(query: string, opts: RecallOptions = {}): MemoryEntry[] {
		const limit = opts.limit ?? 10;
		const conditions: string[] = [];
		const params: (string | number)[] = [];
		if (opts.project) {
			conditions.push('project = ?');
			params.push(opts.project);
		}
		if (opts.types && opts.types.length) {
			const placeholders = opts.types.map(() => '?').join(',');
			conditions.push(`type IN (${placeholders})`);
			params.push(...opts.types);
		}
		const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
		const rows = this.db
			.prepare(
				`SELECT id, type, content, project, created_at AS createdAt, last_accessed_at AS lastAccessedAt,
				        access_count AS accessCount, keywords
				 FROM memories ${where} ORDER BY created_at DESC LIMIT 500`,
			)
			.all(...params) as MemoryEntry[];

		const queryTerms = tokenize(query);
		const scored = rows
			.map((row) => {
				const entryTerms = new Set(tokenize(row.content).concat(row.keywords ? row.keywords.split(',') : []));
				let score = 0;
				for (const t of queryTerms) {
					if (entryTerms.has(t)) score += 1;
				}
				// Recency boost: up to +2 for entries from the last 7 days
				const ageDays = (Date.now() - row.createdAt) / 86_400_000;
				score += Math.max(0, 2 - ageDays / 3.5);
				return { row, score };
			})
			.filter(({ score }) => score > (opts.minRelevance ?? 0.5))
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);

		// Mark accessed
		for (const { row } of scored) {
			this.db
				.prepare(`UPDATE memories SET last_accessed_at = ?, access_count = access_count + 1 WHERE id = ?`)
				.run(Date.now(), row.id);
		}
		return scored.map(({ row }) => row);
	}

	/**
	 * Most-recent memories without any lexical scoring — the candidate pool
	 * for semantic recall. Must NOT be pre-filtered by keyword overlap,
	 * otherwise semantically-relevant entries sharing no words with the
	 * query (exactly what embeddings find) would be dropped before ranking.
	 */
	listRecent(opts: { limit?: number; project?: string } = {}): MemoryEntry[] {
		const limit = opts.limit ?? 200;
		const conditions: string[] = [];
		const params: (string | number)[] = [];
		if (opts.project) {
			conditions.push('project = ?');
			params.push(opts.project);
		}
		const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
		const rows = this.db
			.prepare(
				`SELECT id, type, content, project, created_at AS createdAt, last_accessed_at AS lastAccessedAt,
				        access_count AS accessCount, keywords
				 FROM memories ${where} ORDER BY created_at DESC LIMIT ?`,
			)
			.all(...params, limit) as MemoryEntry[];
		return rows;
	}

	/** Cache embedding vectors for a set of memory ids (called by the memory
	 * service after a successful embed batch so later recalls are cheap). */
	saveEmbeddings(
		entries: Array<{ id: number; vector: number[]; model?: string }>,
	): void {
		const now = Date.now();
		const upsert = this.db.prepare(`
			INSERT INTO memory_embeddings (memory_id, dimension, model, vector, updated_at)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(memory_id) DO UPDATE SET
				dimension = excluded.dimension,
				model = excluded.model,
				vector = excluded.vector,
				updated_at = excluded.updated_at
		`);
		for (const e of entries) {
			upsert.run(e.id, e.vector.length, e.model ?? null, JSON.stringify(e.vector), now);
		}
	}

	/**
	 * Load cached embedding vectors for the given memory ids. When
	 * `expectedDimension` is provided, only vectors of that dimension are
	 * returned — vectors produced by a *different* embedding model have a
	 * different length and must be re-embedded (their similarity would
	 * otherwise silently be 0 and rank last forever).
	 */
	loadEmbeddings(ids: number[], expectedDimension?: number): Map<number, number[]> {
		const out = new Map<number, number[]>();
		if (ids.length === 0) return out;
		const placeholders = ids.map(() => '?').join(',');
		const dimensionClause = expectedDimension !== undefined ? ' AND dimension = ?' : '';
		const params: (string | number)[] = expectedDimension !== undefined ? [...ids, expectedDimension] : ids;
		const rows = this.db
			.prepare(
				`SELECT memory_id AS memoryId, vector FROM memory_embeddings
				 WHERE memory_id IN (${placeholders})${dimensionClause}`,
			)
			.all(...params) as Array<{ memoryId: number; vector: string }>;
		for (const r of rows) {
			try {
				out.set(r.memoryId, JSON.parse(r.vector) as number[]);
			} catch {
				// corrupted cache entry — ignore, will be re-embedded
			}
		}
		return out;
	}

	/** Number of memories with cached embedding vectors. */
	embeddedCount(): number {
		const row = this.db.prepare(`SELECT COUNT(*) AS c FROM memory_embeddings`).get() as { c: number };
		return row.c;
	}

	stats(): { total: number; byType: Record<string, number> } {
		const rows = this.db
			.prepare(`SELECT type, COUNT(*) as count FROM memories GROUP BY type`)
			.all() as Array<{ type: string; count: number }>;
		const byType: Record<string, number> = {};
		let total = 0;
		for (const r of rows) {
			byType[r.type] = r.count;
			total += r.count;
		}
		return { total, byType };
	}

	close(): void {
		this.db.close();
	}
}

function toEntry(row: {
	id: number;
	type: MemoryEntry['type'];
	content: string;
	project: string | null;
	created_at: number;
	keywords: string;
}): MemoryEntry {
	return {
		id: row.id,
		type: row.type,
		content: row.content,
		project: row.project ?? undefined,
		createdAt: row.created_at,
		lastAccessedAt: row.created_at,
		accessCount: 0,
		keywords: row.keywords,
	};
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, ' ')
		.split(/\s+/)
		.filter((w) => w.length > 2);
}

function extractKeywords(text: string, max = 12): string[] {
	const counts = new Map<string, number>();
	for (const w of tokenize(text)) {
		counts.set(w, (counts.get(w) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, max)
		.map(([w]) => w);
}

function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	if (na === 0 || nb === 0) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
