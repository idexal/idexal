// Idexal AI Core — memory service
// High-level API around the SQLite store: remembers task outcomes,
// learns facts, and builds prompt context from past sessions.
// Supports both lexical recall and real semantic retrieval via a provider's
// embeddings endpoint (cached in SQLite so re-embedding is avoided).

import { MemoryStore, type MemoryEntry, type RecallOptions } from './sqliteStore.ts';

export type EmbedBatch = (texts: string[], signal?: AbortSignal) => Promise<number[][]>;

export interface MemoryContext {
	summary: string;
	entries: MemoryEntry[];
	/** True when the recall used embeddings (semantic) vs keyword matching. */
	semantic?: boolean;
}

export interface MemoryServiceOptions {
	store: MemoryStore;
	project?: string;
	/** Batch embedder (from a provider with embeddings support). When set,
	 * recall uses semantic search with caching; without it, lexical recall. */
	embed?: EmbedBatch;
	/** Model name used to produce the cached embeddings (for cache invalidation). */
	embeddingModel?: string;
}

export class MemoryService {
	private readonly store: MemoryStore;
	private readonly project: string | undefined;
	private readonly embed?: EmbedBatch;
	private readonly embeddingModel?: string;

	constructor(store: MemoryStore, project?: string);
	constructor(opts: MemoryServiceOptions);
	constructor(storeOrOpts: MemoryStore | MemoryServiceOptions, project?: string) {
		if (storeOrOpts instanceof MemoryStore) {
			this.store = storeOrOpts;
			this.project = project;
		} else {
			this.store = storeOrOpts.store;
			this.project = storeOrOpts.project;
			this.embed = storeOrOpts.embed;
			this.embeddingModel = storeOrOpts.embeddingModel;
		}
	}

	/** True when semantic recall is available (provider embedder configured). */
	get semanticAvailable(): boolean {
		return typeof this.embed === 'function';
	}

	/** Persist a durable fact learned during work. */
	learnFact(fact: string): number {
		return this.store.remember('fact', fact, { project: this.project });
	}

	/**
	 * Import externally-sourced facts (e.g. CLAUDE.md lines migrated from
	 * Claude Code) tagged with an explicit project, deduplicated against
	 * existing entries for that project. Returns import/skip counts.
	 */
	importFacts(facts: string[], project: string): { imported: number; skipped: number } {
		// Dedupe against ALL existing facts for this project (not a scored
		// recall, whose recency boost would drop entries older than a week
		// and let re-migration duplicate them).
		const existing = new Set(
			this.store
				.listRecent({ project, limit: 1000 })
				.filter((e) => e.type === 'fact')
				.map((e) => e.content),
		);
		let imported = 0;
		let skipped = 0;
		for (const line of facts) {
			if (existing.has(line)) {
				skipped++;
				continue;
			}
			this.store.remember('fact', line, { project });
			existing.add(line);
			imported++;
		}
		return { imported, skipped };
	}

	/** Remember an episode: what was attempted and what happened. */
	rememberEpisode(episode: string): number {
		return this.store.remember('episode', episode, { project: this.project });
	}

	/** Record a decision and its rationale so future agents stay consistent. */
	rememberDecision(decision: string): number {
		return this.store.remember('decision', decision, { project: this.project });
	}

	/** Record a user preference. */
	rememberPreference(preference: string): number {
		return this.store.remember('preference', preference, { project: this.project });
	}

	/** Store a compact session summary for later retrieval. */
	rememberSessionSummary(summary: string): number {
		return this.store.remember('session', summary, { project: this.project });
	}

	/** Recall the most relevant memories for a task, blended across types. */
	recall(query: string, opts: RecallOptions = {}): MemoryEntry[] {
		return this.store.recall(query, { project: this.project, ...opts });
	}

	/**
	 * Semantic recall: embed the query once, rank memories by cosine
	 * similarity. Embeds only entries lacking a cached vector and persists
	 * them. Falls back to lexical recall when no embedder is configured or
	 * embedding fails.
	 */
	async recallSemantic(query: string, opts: RecallOptions = {}): Promise<MemoryEntry[]> {
		if (!this.embed) {
			return this.recall(query, opts);
		}
		try {
			const entries = await this.recallSemanticRaw(query, opts);
			return entries.map(({ entry }) => entry);
		} catch {
			// Embedding failure → graceful fallback to lexical recall.
			return this.recall(query, opts);
		}
	}

	/** Internal semantic recall with scores (used by buildContext). */
	private async recallSemanticRaw(
		query: string,
		opts: RecallOptions = {},
	): Promise<Array<{ entry: MemoryEntry; score: number }>> {
		if (!this.embed) {
			return this.store.recall(query, { project: this.project, ...opts }).map((entry) => ({ entry, score: 1 }));
		}

		// 1) Grab the candidate pool (ids + content) WITHOUT lexical
		//    filtering — the whole point of semantic recall is finding
		//    memories that share no keywords with the query.
		let candidates = this.store.listRecent({ project: this.project, limit: 200 });
		if (opts.types && opts.types.length) {
			candidates = candidates.filter((c) => opts.types!.includes(c.type));
		}
		if (candidates.length === 0) return [];

		// 2) Embed the query FIRST — its dimension determines which cached
		//    vectors are reusable. Vectors from a different embedding model
		//    have a different length; keeping them would rank everything at
		//    ~0 forever (cosine returns 0 on length mismatch), so they are
		//    treated as missing and re-embedded.
		const [qv] = await this.embed([query]);
		if (!qv || qv.length === 0) {
			// Embedding came back empty — fall back to lexical scoring.
			return this.store.recall(query, { project: this.project, ...opts }).map((entry) => ({ entry, score: 1 }));
		}

		// 3) Load only same-dimension cached vectors; identify the rest.
		const cached = this.store.loadEmbeddings(candidates.map((c) => c.id), qv.length);
		const toEmbed = candidates.filter((c) => !cached.has(c.id));

		// 4) Batch-embed the missing ones and persist the cache (tagged with
		//    the real embedding model so a later model switch re-embeds).
		if (toEmbed.length > 0) {
			const vectors = await this.embed(toEmbed.map((c) => c.content));
			this.store.saveEmbeddings(
				toEmbed.map((c, i) => ({
					id: c.id,
					vector: vectors[i] ?? [],
					model: this.embeddingModel,
				})),
			);
			vectors.forEach((v, i) => cached.set(toEmbed[i].id, v));
		}

		// 5) Rank by cosine similarity to the query vector.
		const scored = candidates
			.map((c) => ({ entry: c, score: cosineSimilarity(qv, cached.get(c.id) ?? []) }))
			.sort((a, b) => b.score - a.score)
			.slice(0, opts.limit ?? 10);
		return scored;
	}

	/** Build a prompt context block from the most relevant memories. */
	async buildContext(query: string, limit = 6): Promise<MemoryContext> {
		const entries = this.embed ? await this.recallSemantic(query, { limit }) : this.recall(query, { limit });
		if (entries.length === 0) {
			return { summary: '', entries: [], semantic: false };
		}
		const lines = entries.map((e) => {
			const kind = e.type.toUpperCase();
			return `[${kind}] ${e.content}`;
		});
		return {
			summary: lines.join('\n'),
			entries,
			semantic: this.embed !== undefined,
		};
	}

	/** Inject memory context into a system prompt if any memory exists. */
	async augmentSystemPrompt(systemPrompt: string, task: string): Promise<string> {
		const ctx = await this.buildContext(task);
		if (!ctx.summary) return systemPrompt;
		return `${systemPrompt}\n\n## Long-term memory (from previous sessions)\n${ctx.summary}\n`;
	}

	stats() {
		return this.store.stats();
	}

	/** Number of memories with cached embedding vectors. */
	embeddedStats() {
		return { cached: this.store.embeddedCount() };
	}

	close(): void {
		this.store.close();
	}
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
