import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { registerWorkspaceHandlers, getWorkspaceRoot } from './workspace';
import { registerTerminalHandlers, disposeTerminals } from './terminal';
import { registerSettingsHandlers } from './settings';
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
		}: { task: string; channel: string; mode?: 'stream' | 'agent'; sessionId?: string },
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
		// actually opened — not wherever Electron happened to start.
		const cwd = getWorkspaceRoot() ?? process.cwd();
		// Sessions only apply to single-agent turns: the orchestrator's
		// planner/executors/reviewer are separate agents by design, so
		// replaying one conversation across them would be meaningless.
		const coreArgs =
			mode === 'agent'
				? ['agent', task]
				: sessionId
					? ['stream', '--session', sessionId, task]
					: ['stream', task];
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
	registerWorkspaceHandlers();
	registerTerminalHandlers();
	registerSettingsHandlers();
	createWindow();
});

app.on('window-all-closed', () => {
	disposeTerminals();
	if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', disposeTerminals);

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
