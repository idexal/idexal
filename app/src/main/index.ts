import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { registerWorkspaceHandlers, getWorkspaceRoot, adoptStartupWorkspace } from './workspace';
import { registerTerminalHandlers, disposeTerminals } from './terminal';
import { registerSettingsHandlers } from './settings';
import { registerSessionHandlers } from './sessions';
import { registerUsageHandlers } from './usage';
import { registerDebugHandlers, disposeDebug } from './debug';
import { resolveCoreBinary } from './core';

function createWindow(): void {
	// Fit the work area rather than assuming a large display: a fixed
	// 1400x900 clips the agent input off-screen on a 1366x768 laptop.
	const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
	const win = new BrowserWindow({
		width: Math.min(1400, screenW),
		height: Math.min(900, screenH),
		minWidth: 900,
		minHeight: 560,
		backgroundColor: '#0c0e17',
		title: 'Idexal',
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, '..', 'preload', 'index.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			// Enables the <webview> used by the live-preview pane.
			webviewTag: true,
		},
	});
	win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

/** Run the core, streaming its NDJSON events to the renderer channel. */
ipcMain.on(
	'idexal-run-task',
	(
		event,
		{
			task,
			channel,
			mode,
			sessionId,
			pin,
		}: {
			task: string;
			channel: string;
			mode?: 'stream' | 'agent';
			sessionId?: string;
			pin?: { provider?: string; model?: string };
		},
	) => {
		const sender = event.sender;
		let corePath: string;
		try {
			corePath = resolveCoreBinary();
		} catch (err) {
			sender.send(channel, { type: 'error', error: err instanceof Error ? err.message : String(err) });
			return;
		}

		// Agents act on files, so they must run in the folder the user
		// actually opened. Falling back to process.cwd() meant that with no
		// folder open the agent operated on Idexal's own install directory:
		// it wrote real files there, and the user saw nothing happen in the
		// project they had in mind. Refusing is the only safe answer — there
		// is no sensible default for "which code should I edit".
		const workspace = getWorkspaceRoot();
		if (!workspace) {
			sender.send(channel, {
				type: 'error',
				error: 'لم تفتح مجلداً بعد. الوكيل يعدّل ملفات حقيقية، فلا يمكنه العمل بلا مساحة عمل — افتح مجلد مشروعك أولاً (زر «اختر مجلداً»).',
			});
			return;
		}
		const cwd = workspace;
		// Conversation *history* only applies to single-agent turns: the
		// orchestrator's planner/executors/reviewer are separate agents by
		// design, so replaying one transcript across them would be
		// meaningless — and `agent` does not load it. The id is still worth
		// passing, because it is also what groups the run's spend in the
		// usage ledger; without it a multi-agent run is scattered across
		// every other ungrouped call.
		const coreArgs = [mode === 'agent' ? 'agent' : 'stream'];
		if (sessionId) coreArgs.push('--session', sessionId);
		// A pin narrows the run to one provider and switches fallback off in
		// the core. Only send flags the user actually chose: an empty string
		// here would reach the core as a provider id and fail the run.
		if (pin?.provider) coreArgs.push('--provider', pin.provider);
		if (pin?.model) coreArgs.push('--model', pin.model);
		// The task goes last so it is never mistaken for a flag's value.
		coreArgs.push(task);
		const child = spawn(corePath, coreArgs, {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const rl = readline.createInterface({ input: child.stdout });
		rl.on('line', (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				if (!sender.isDestroyed()) sender.send(channel, JSON.parse(trimmed));
			} catch {
				// non-JSON stray line — ignore
			}
		});

		let stderr = '';
		child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
		child.on('close', (code) => {
			if (code !== 0 && stderr.trim() && !sender.isDestroyed()) {
				sender.send(channel, { type: 'error', error: stderr.trim() });
			}
		});
	},
);

app.whenReady().then(() => {
	// Before anything else: `idexal <folder>` (or IDEXAL_WORKSPACE) should
	// start with that project already open, so the app is ready to work.
	const startupWorkspace = adoptStartupWorkspace(process.argv);
	if (startupWorkspace) console.log(`[idexal] workspace: ${startupWorkspace}`);
	registerWorkspaceHandlers();
	registerTerminalHandlers();
	registerSettingsHandlers();
	registerSessionHandlers();
	registerUsageHandlers();
	registerDebugHandlers();
	createWindow();
});

app.on('window-all-closed', () => {
	disposeTerminals();
	disposeDebug();
	if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', disposeTerminals);

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
