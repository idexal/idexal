// Idexal — automations (scheduled tasks)
//
// A task the user wants run on a schedule: "every morning, summarise what
// changed in git", "every hour, run the tests and tell me what broke".
//
// Honest limitation, stated in the UI too: these fire only while Idexal is
// open. A scheduler that survives a closed app has to be the operating
// system's (Task Scheduler, cron, launchd), and the CLI already exists for
// that — `idexal agent "<task>"`. Pretending otherwise would mean a user
// relying on a nightly job that silently never ran.

import { ipcMain, WebContents } from 'electron';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveCoreBinary } from './core';
import { getWorkspaceRoot } from './workspace';

export interface Automation {
	id: string;
	name: string;
	prompt: string;
	/** How often to run, in minutes. */
	everyMinutes: number;
	enabled: boolean;
	/** Epoch ms of the last completed run; 0 when it has never run. */
	lastRun: number;
	lastResult?: string;
}

/** The scheduler wakes on this cadence and runs whatever is due. Finer than
 *  the shortest useful interval, coarse enough to cost nothing. */
const TICK_MS = 30_000;
const MIN_INTERVAL_MINUTES = 5;

let timer: NodeJS.Timeout | null = null;
/** Ids currently executing. A long run must not stack up behind itself: if
 *  a job is still going when its next slot arrives, that slot is skipped,
 *  never queued. Queued runs pile up without bound and each one costs a
 *  model call. */
const running = new Set<string>();
let watcher: WebContents | null = null;

function filePath(): string {
	return path.join(os.homedir(), '.idexal', 'automations.json');
}

async function read(): Promise<Automation[]> {
	try {
		const parsed = JSON.parse(await fs.readFile(filePath(), 'utf8'));
		return Array.isArray(parsed) ? (parsed as Automation[]) : [];
	} catch {
		return [];
	}
}

async function write(list: Automation[]): Promise<void> {
	await fs.mkdir(path.dirname(filePath()), { recursive: true });
	await fs.writeFile(filePath(), JSON.stringify(list, null, 2) + '\n', 'utf8');
}

function notify(event: string, payload: unknown): void {
	if (watcher && !watcher.isDestroyed()) watcher.send(`automations:${event}`, payload);
}

/**
 * Run one automation through the same core binary a normal task uses, so it
 * lands in the usage ledger and obeys the same provider configuration. Its
 * summary is kept on the automation itself: a scheduled job whose outcome
 * is invisible is indistinguishable from one that never ran.
 */
async function runOne(automation: Automation): Promise<void> {
	const root = getWorkspaceRoot();
	if (!root) {
		notify('skipped', { id: automation.id, reason: 'no workspace is open' });
		return;
	}
	if (running.has(automation.id)) return;
	running.add(automation.id);
	notify('started', { id: automation.id, name: automation.name });

	let core: string;
	try {
		core = resolveCoreBinary();
	} catch (err) {
		running.delete(automation.id);
		notify('finished', { id: automation.id, ok: false, summary: String(err) });
		return;
	}

	await new Promise<void>((resolve) => {
		// The id is already prefixed `auto-`; prefixing again produced
		// `auto-auto-…` in the spend ledger, which is what the user reads.
		const child = spawn(core, ['stream', '--session', automation.id, automation.prompt], {
			cwd: root,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let summary = '';
		child.stdout.on('data', (chunk: Buffer) => {
			for (const line of chunk.toString().split('\n')) {
				if (!line.trim()) continue;
				try {
					const event = JSON.parse(line);
					if (event.type === 'done') summary = String(event.summary ?? '');
					if (event.type === 'error') summary = `⚠ ${String(event.error ?? '')}`;
				} catch {
					// Not every line is JSON; the contract only promises it for events.
				}
			}
		});
		child.on('close', async (code) => {
			running.delete(automation.id);
			const list = await read();
			const found = list.find((a) => a.id === automation.id);
			if (found) {
				found.lastRun = Date.now();
				found.lastResult = summary.slice(0, 400) || (code === 0 ? 'تمّ' : `خرج برمز ${code}`);
				await write(list);
			}
			notify('finished', { id: automation.id, ok: code === 0, summary });
			resolve();
		});
		child.on('error', (e) => {
			running.delete(automation.id);
			notify('finished', { id: automation.id, ok: false, summary: e.message });
			resolve();
		});
	});
}

async function tick(): Promise<void> {
	const now = Date.now();
	for (const automation of await read()) {
		if (!automation.enabled) continue;
		const due = automation.lastRun + automation.everyMinutes * 60_000;
		// A never-run automation waits a full interval rather than firing the
		// instant it is created — otherwise saving one launches a model call
		// before the user has finished reading what they wrote.
		if (automation.lastRun === 0) {
			const list = await read();
			const found = list.find((a) => a.id === automation.id);
			if (found) {
				found.lastRun = now;
				await write(list);
			}
			continue;
		}
		if (now >= due) void runOne(automation);
	}
}

export function registerAutomationHandlers(): void {
	ipcMain.handle('automations:list', async () => {
		try {
			return { ok: true, automations: await read(), path: filePath(), running: [...running] };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('automations:save', async (event, draft: Partial<Automation>) => {
		if (!draft?.name?.trim() || !draft?.prompt?.trim()) {
			return { ok: false, error: 'an automation needs a name and a prompt' };
		}
		watcher = event.sender;
		const every = Math.max(MIN_INTERVAL_MINUTES, Math.round(Number(draft.everyMinutes) || 60));
		const list = await read();
		const id = draft.id?.trim() || `auto-${Date.now()}`;
		const previous = list.find((a) => a.id === id);
		const next = list.filter((a) => a.id !== id);
		next.push({
			id,
			name: draft.name.trim(),
			prompt: draft.prompt.trim(),
			everyMinutes: every,
			enabled: draft.enabled !== false,
			// Editing must not reset the clock, or a job edited often never runs.
			lastRun: previous?.lastRun ?? 0,
			lastResult: previous?.lastResult,
		});
		await write(next);
		return { ok: true, automations: next };
	});

	ipcMain.handle('automations:delete', async (_e, id: string) => {
		const list = (await read()).filter((a) => a.id !== id);
		await write(list);
		return { ok: true, automations: list };
	});

	ipcMain.handle('automations:run-now', async (event, id: string) => {
		watcher = event.sender;
		const automation = (await read()).find((a) => a.id === id);
		if (!automation) return { ok: false, error: 'no such automation' };
		void runOne(automation);
		return { ok: true };
	});

	ipcMain.handle('automations:watch', async (event) => {
		watcher = event.sender;
		return { ok: true };
	});

	// One timer for the whole app, started once.
	if (!timer) timer = setInterval(() => void tick(), TICK_MS);
}

export function disposeAutomations(): void {
	if (timer) clearInterval(timer);
	timer = null;
}
