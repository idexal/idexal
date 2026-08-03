// Idexal AI Core — Claude Code compatibility: memory migration
// Imports Claude Code's memory into Idexal's long-term memory store.
// Sources (Claude Code's CLAUDE.md scopes):
//   ~/.claude/CLAUDE.md        (global / user-level)
//   <project>/CLAUDE.md        (project)
//   <project>/.claude/CLAUDE.md
//   <project>/CLAUDE.local.md  (local private overrides)
// Each meaningful line becomes a `fact` memory entry, deduplicated against
// existing entries so repeated migrations never duplicate. Idempotent and
// safe: reads only, never modifies ~/.claude.

import { loadClaudeInstructions } from './claudeCode.ts';
import { type MemoryService } from '../memory/memoryService.ts';

export interface MigrationResult {
	sources: string[];
	imported: number;
	skipped: number;
	project: string;
}

/** Split a CLAUDE.md into meaningful fact lines (skip headings/blanks). */
export function claudeMdToFacts(content: string): string[] {
	return content
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)
		// Drop headings and horizontal rules — instructions like "## Build"
		// carry no fact value on their own.
		.filter((l) => !/^#{1,6}\s/.test(l) && !/^[-*_]{3,}$/.test(l));
}

/**
 * Migrate Claude Code memory into the Idexal memory store. Idempotent:
 * lines already present in the store (exact content match for the same
 * project) are skipped. Returns what was imported.
 */
export function migrateClaudeMemory(memory: MemoryService, projectDir: string): MigrationResult {
	const { instructions, files } = loadClaudeInstructions(projectDir);
	if (!instructions) {
		return { sources: [], imported: 0, skipped: 0, project: projectDir };
	}

	const { imported, skipped } = memory.importFacts(claudeMdToFacts(instructions), projectDir);
	return { sources: files, imported, skipped, project: projectDir };
}

/** Convenience: does any CLAUDE.md source exist? */
export function hasClaudeMemory(projectDir: string): boolean {
	const { files } = loadClaudeInstructions(projectDir);
	return files.length > 0;
}

/** Absolute paths of the CLAUDE.md sources (for reporting). */
export function claudeMemorySources(projectDir: string): string[] {
	return loadClaudeInstructions(projectDir).files;
}
