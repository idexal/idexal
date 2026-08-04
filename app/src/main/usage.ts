// Idexal — spend ledger & checkpoints (main process)
//
// Both are read straight from the core, never from the database directly:
// the schema, the pricing and the checkpoint layout are the core's business
// and duplicating any of it here would let the two drift apart silently.
//
//   usage:load   → idexal-core usage | usage daily N | usage recent
//   undo:list    → idexal-core undo list
//   undo:restore → idexal-core undo [<path>]   (destructive; the renderer
//                  confirms first, exactly like a git commit)
//   undo:clear   → idexal-core undo clear      (destructive, irreversible)

import { ipcMain } from 'electron';
import { runCoreJson } from './core';
import { getWorkspaceRoot } from './workspace';

/** Days of history the trend chart asks for. */
const TREND_DAYS = 14;
/** How many individual calls the "recent" list shows. */
const RECENT_LIMIT = 25;

export function registerUsageHandlers(): void {
	ipcMain.handle('usage:load', async () => {
		// Three short-lived processes rather than one: the core exposes these
		// as separate queries, and running them together keeps the page a
		// single round trip.
		const [totals, daily, recent] = await Promise.all([
			runCoreJson(['usage']),
			runCoreJson(['usage', 'daily', String(TREND_DAYS)]),
			runCoreJson(['usage', 'recent', String(RECENT_LIMIT)]),
		]);
		if (!totals.ok) return { ok: false, error: totals.error };
		return {
			ok: true,
			data: {
				summary: totals.data,
				// A failed sub-query degrades that section only. The page is
				// still worth showing without its chart.
				daily: daily.ok ? daily.data : null,
				recent: recent.ok ? recent.data : null,
			},
		};
	});

	ipcMain.handle('undo:list', async () => {
		const root = getWorkspaceRoot();
		if (!root) return { ok: true, data: [] };
		return runCoreJson(['undo', 'list'], root);
	});

	ipcMain.handle('undo:restore', async (_e, relative?: string) => {
		const root = getWorkspaceRoot();
		if (!root) return { ok: false, error: 'no workspace is open' };
		// No path = undo everything with a snapshot. Both walk one step back
		// per call, because the core consumes the snapshot it restores.
		const args = relative ? ['undo', relative] : ['undo'];
		return runCoreJson(args, root);
	});

	ipcMain.handle('undo:clear', async () => {
		const root = getWorkspaceRoot();
		if (!root) return { ok: false, error: 'no workspace is open' };
		return runCoreJson(['undo', 'clear'], root);
	});
}
