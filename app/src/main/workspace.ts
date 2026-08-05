// Idexal — workspace file system
//
// All disk access lives in the main process; the renderer only ever sees
// paths and content over IPC. Every path is validated against the open
// workspace root before use, so a malicious or buggy renderer can't read
// or write outside the folder the user actually opened.

import { dialog, ipcMain, BrowserWindow } from 'electron';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';

/** Directories that are never worth showing in a file tree. `.idexal` is
 *  ours — the checkpoint store — and showing our own bookkeeping inside the
 *  user's project reads as clutter they have to wonder about. */
const IGNORED = new Set(['node_modules', '.git', 'target', 'dist', 'out', '.next', '.cache', '.idexal']);

/** Files above this size open as read-only placeholders rather than
 * freezing the editor on a multi-megabyte blob. */
const MAX_OPEN_BYTES = 2 * 1024 * 1024;

let workspaceRoot: string | null = null;

export function getWorkspaceRoot(): string | null {
	return workspaceRoot;
}

/**
 * Open a folder given on the command line or in `IDEXAL_WORKSPACE`, the way
 * an editor opens the directory you launched it from. Without this the only
 * way in is a native folder dialog, which means the app can never start
 * ready to work — and, since an agent refuses to run with no workspace, it
 * cannot be driven from a script or a shortcut either.
 *
 * A path that is not a real directory is ignored rather than fatal: the
 * window still opens and the user can pick a folder.
 */
export function adoptStartupWorkspace(argv: string[]): string | null {
	const candidates = [
		process.env.IDEXAL_WORKSPACE,
		...argv.slice(1).filter((a) => !a.startsWith('-') && a !== '.'),
	].filter((c): c is string => typeof c === 'string' && c.length > 0);

	for (const candidate of candidates) {
		const abs = path.resolve(candidate);
		try {
			if (fsSync.statSync(abs).isDirectory()) {
				workspaceRoot = abs;
				return abs;
			}
		} catch {
			// Not a path we can use; try the next candidate.
		}
	}
	return null;
}

/**
 * Resolve a workspace-relative path and confirm it stays inside the root.
 * Uses a boundary-aware check (root + separator) so a sibling directory
 * like `../proj-evil` cannot pass just because its name starts with the
 * root's name — the same class of bug the core's tools guard against.
 */
function resolveInWorkspace(relative: string): string {
	if (!workspaceRoot) throw new Error('No workspace is open.');
	const root = path.resolve(workspaceRoot);
	const abs = path.resolve(root, relative);
	if (abs !== root && !abs.startsWith(root + path.sep)) {
		throw new Error(`Path escapes the workspace: ${relative}`);
	}
	return abs;
}

export interface TreeEntry {
	name: string;
	path: string; // workspace-relative, POSIX separators
	directory: boolean;
}

async function readDirectory(relative: string): Promise<TreeEntry[]> {
	const abs = resolveInWorkspace(relative);
	const entries = await fs.readdir(abs, { withFileTypes: true });
	return entries
		.filter((e) => !(e.isDirectory() && IGNORED.has(e.name)) && !e.name.startsWith('.git'))
		.map((e) => ({
			name: e.name,
			path: path.posix.join(relative === '.' ? '' : relative, e.name),
			directory: e.isDirectory(),
		}))
		.sort((a, b) => {
			if (a.directory !== b.directory) return a.directory ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
}

export function registerWorkspaceHandlers(): void {
	ipcMain.handle('workspace:open', async () => {
		const win = BrowserWindow.getFocusedWindow();
		const result = win
			? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
			: await dialog.showOpenDialog({ properties: ['openDirectory'] });
		if (result.canceled || result.filePaths.length === 0) return null;
		workspaceRoot = result.filePaths[0];
		return { root: workspaceRoot, name: path.basename(workspaceRoot) };
	});

	ipcMain.handle('workspace:current', () =>
		workspaceRoot ? { root: workspaceRoot, name: path.basename(workspaceRoot) } : null,
	);

	/**
	 * Pick files to reference in a prompt. Returns workspace-relative paths,
	 * never absolute ones: the agent runs with the workspace as its root, so
	 * an absolute path from another drive would simply fail its path check.
	 * Anything chosen outside the workspace is dropped for the same reason.
	 */
	ipcMain.handle('workspace:pick-files', async () => {
		if (!workspaceRoot) return { ok: false, error: 'no workspace is open' };
		const win = BrowserWindow.getFocusedWindow();
		const options = {
			defaultPath: workspaceRoot,
			properties: ['openFile', 'multiSelections'] as const,
		};
		const result = win
			? await dialog.showOpenDialog(win, { ...options, properties: [...options.properties] })
			: await dialog.showOpenDialog({ ...options, properties: [...options.properties] });
		if (result.canceled) return { ok: true, files: [] };

		const root = path.resolve(workspaceRoot);
		const files = result.filePaths
			.filter((p) => path.resolve(p).startsWith(root + path.sep))
			.map((p) => path.relative(root, p).split(path.sep).join('/'));
		return { ok: true, files, skipped: result.filePaths.length - files.length };
	});

	ipcMain.handle('workspace:list', async (_e, relative: string) => {
		try {
			return { ok: true, entries: await readDirectory(relative || '.') };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('workspace:read', async (_e, relative: string) => {
		try {
			const abs = resolveInWorkspace(relative);
			const stat = await fs.stat(abs);
			if (stat.size > MAX_OPEN_BYTES) {
				return {
					ok: true,
					readOnly: true,
					content: `// ${relative} is ${(stat.size / 1024 / 1024).toFixed(1)} MB — too large to open safely.`,
				};
			}
			return { ok: true, readOnly: false, content: await fs.readFile(abs, 'utf8') };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('workspace:write', async (_e, relative: string, content: string) => {
		try {
			const abs = resolveInWorkspace(relative);
			await fs.mkdir(path.dirname(abs), { recursive: true });
			await fs.writeFile(abs, content, 'utf8');
			return { ok: true };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});
}
