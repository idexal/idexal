import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as readline from 'node:readline';

function resolveCoreBinary(): string {
	const exeName = process.platform === 'win32' ? 'idexal-core.exe' : 'idexal-core';
	const candidates = [
		path.join(__dirname, '..', '..', '..', 'core', 'target', 'release', exeName),
		path.join(__dirname, '..', '..', '..', 'core', 'target', 'debug', exeName),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}
	throw new Error(
		`Could not find the idexal-core binary. Build it first: cd core && cargo build (looked in: ${candidates.join(', ')})`,
	);
}

function createWindow(): void {
	const win = new BrowserWindow({
		width: 1280,
		height: 800,
		backgroundColor: '#0c0e17',
		title: 'Idexal',
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, '..', 'preload', 'index.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});
	win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

ipcMain.on('idexal-run-task', (event, { task, channel }: { task: string; channel: string }) => {
	const sender = event.sender;
	let corePath: string;
	try {
		corePath = resolveCoreBinary();
	} catch (err) {
		sender.send(channel, { type: 'error', error: err instanceof Error ? err.message : String(err) });
		return;
	}

	const child = spawn(corePath, ['stream', task], { stdio: ['ignore', 'pipe', 'pipe'] });
	const rl = readline.createInterface({ input: child.stdout });
	rl.on('line', (line) => {
		const trimmed = line.trim();
		if (!trimmed) return;
		try {
			sender.send(channel, JSON.parse(trimmed));
		} catch {
			// non-JSON stray line — ignore
		}
	});
	let stderr = '';
	child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
	child.on('close', (code) => {
		if (code !== 0 && stderr.trim()) {
			sender.send(channel, { type: 'error', error: stderr.trim() });
		}
	});
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
