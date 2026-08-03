// Idexal — renderer
//
// Owns the IDE shell: file tree, editor tabs, terminal, git panel, live
// preview, and the agent conversation. All privileged work (disk, shells,
// git, spawning the core) goes through the preload bridge.

interface CoreEvent {
	type: string;
	name?: string;
	text?: string;
	args?: string;
	ok?: boolean;
	output?: string;
	summary?: string;
	provider?: string;
	providers?: string[];
	error?: string;
	phase?: string;
	steps?: Array<{ id: number; description: string; depends_on?: number[] }>;
	id?: number;
	description?: string;
	step?: number;
	tool_rounds?: number;
}

// `export {}` makes this file a module, which is what allows the `declare
// global` block below to augment the global scope at all.
export {};

declare global {
	interface Window {
		idexal: {
			runTask: (task: string, onEvent: (e: CoreEvent) => void, mode?: 'stream' | 'agent') => () => void;
			workspace: {
				open: () => Promise<{ root: string; name: string } | null>;
				current: () => Promise<{ root: string; name: string } | null>;
				list: (rel: string) => Promise<{ ok: boolean; entries?: Array<{ name: string; path: string; directory: boolean }>; error?: string }>;
				read: (rel: string) => Promise<{ ok: boolean; content?: string; readOnly?: boolean; error?: string }>;
				write: (rel: string, content: string) => Promise<{ ok: boolean; error?: string }>;
			};
			terminal: {
				start: (id: string, onData: (d: string) => void, onExit: (c: number | null) => void) => () => void;
				write: (id: string, data: string) => Promise<unknown>;
			};
			git: {
				status: () => Promise<{ ok: boolean; branch?: string; files?: Array<{ state: string; path: string }>; error?: string }>;
				diff: (file: string) => Promise<{ ok: boolean; diff?: string; error?: string }>;
			};
			settings: {
				load: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				save: (cfg: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				testProvider: (id: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
			};
		};
		__monaco: typeof import('monaco-editor');
	}
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// ---------------------------------------------------------------------------
// Editor + tabs
// ---------------------------------------------------------------------------

let monacoApi: typeof import('monaco-editor') | null = null;
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;

interface OpenTab {
	path: string;
	model: import('monaco-editor').editor.ITextModel;
	dirty: boolean;
}
const tabs = new Map<string, OpenTab>();
let activeTab: string | null = null;

/** Map an extension to a Monaco language id. */
function languageFor(filePath: string): string {
	const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
	const map: Record<string, string> = {
		ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
		rs: 'rust', py: 'python', go: 'go', java: 'java', c: 'c', h: 'c',
		cpp: 'cpp', hpp: 'cpp', cs: 'csharp', rb: 'ruby', php: 'php',
		json: 'json', html: 'html', css: 'css', scss: 'scss', md: 'markdown',
		yml: 'yaml', yaml: 'yaml', toml: 'ini', sh: 'shell', sql: 'sql', xml: 'xml',
	};
	return map[ext] ?? 'plaintext';
}

window.addEventListener('monaco-ready', () => {
	const api = window.__monaco;
	monacoApi = api;
	editor = api.editor.create($('monaco-container'), {
		value: '',
		language: 'plaintext',
		theme: 'vs-dark',
		automaticLayout: true,
		fontFamily: 'Cascadia Code, Consolas, monospace',
		fontSize: 13,
		minimap: { enabled: true },
		scrollBeyondLastLine: false,
	});

	// Ctrl/Cmd+S saves the active tab.
	editor.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.KeyS, () => void saveActive());

	void restoreWorkspace();
});

function renderTabs(): void {
	const bar = $('tabs');
	bar.innerHTML = '';
	for (const [filePath, tab] of tabs) {
		const el = document.createElement('div');
		el.className = 'tab' + (filePath === activeTab ? ' active' : '');
		const name = document.createElement('span');
		name.textContent = filePath.split('/').pop() ?? filePath;
		el.appendChild(name);
		if (tab.dirty) {
			const dot = document.createElement('span');
			dot.className = 'dirty';
			dot.textContent = '●';
			el.appendChild(dot);
		}
		const close = document.createElement('span');
		close.className = 'close';
		close.textContent = '×';
		close.addEventListener('click', (e) => {
			e.stopPropagation();
			closeTab(filePath);
		});
		el.appendChild(close);
		el.addEventListener('click', () => activateTab(filePath));
		bar.appendChild(el);
	}
}

function activateTab(filePath: string): void {
	const tab = tabs.get(filePath);
	if (!tab || !editor) return;
	activeTab = filePath;
	editor.setModel(tab.model);
	renderTabs();
	document.querySelectorAll('#file-tree .tree-row').forEach((row) => {
		row.classList.toggle('active', (row as HTMLElement).dataset.path === filePath);
	});
}

function closeTab(filePath: string): void {
	const tab = tabs.get(filePath);
	if (!tab) return;
	tab.model.dispose();
	tabs.delete(filePath);
	if (activeTab === filePath) {
		activeTab = tabs.keys().next().value ?? null;
		if (activeTab) activateTab(activeTab);
		else editor?.setModel(null);
	}
	renderTabs();
}

async function openFile(filePath: string): Promise<void> {
	if (tabs.has(filePath)) {
		activateTab(filePath);
		return;
	}
	const result = await window.idexal.workspace.read(filePath);
	if (!result.ok || !monacoApi) {
		agentLog(`⚠️ ${result.error ?? 'تعذر فتح الملف'}`, 'meta tool-fail');
		return;
	}
	const model = monacoApi.editor.createModel(result.content ?? '', languageFor(filePath));
	const tab: OpenTab = { path: filePath, model, dirty: false };
	model.onDidChangeContent(() => {
		if (!tab.dirty) {
			tab.dirty = true;
			renderTabs();
		}
	});
	tabs.set(filePath, tab);
	activateTab(filePath);
}

async function saveActive(): Promise<void> {
	if (!activeTab) return;
	const tab = tabs.get(activeTab);
	if (!tab) return;
	const result = await window.idexal.workspace.write(tab.path, tab.model.getValue());
	if (result.ok) {
		tab.dirty = false;
		renderTabs();
		void refreshGit();
	} else {
		agentLog(`⚠️ ${result.error ?? 'فشل الحفظ'}`, 'meta tool-fail');
	}
}

// ---------------------------------------------------------------------------
// File tree
// ---------------------------------------------------------------------------

const expanded = new Set<string>();

async function renderTree(): Promise<void> {
	const container = $('file-tree');
	container.innerHTML = '';
	await renderDirInto(container, '.', 0);
	if (!container.children.length) {
		container.innerHTML = '<div class="empty">المجلد فارغ</div>';
	}
}

async function renderDirInto(container: HTMLElement, dir: string, depth: number): Promise<void> {
	const result = await window.idexal.workspace.list(dir);
	if (!result.ok || !result.entries) return;

	for (const entry of result.entries) {
		const row = document.createElement('div');
		row.className = 'tree-row';
		row.dataset.path = entry.path;
		row.style.paddingRight = `${14 + depth * 12}px`;

		const icon = document.createElement('span');
		icon.className = 'icon';
		icon.textContent = entry.directory ? (expanded.has(entry.path) ? '▾' : '▸') : '·';
		row.appendChild(icon);

		const label = document.createElement('span');
		label.textContent = entry.name;
		row.appendChild(label);

		if (entry.directory) {
			row.addEventListener('click', async () => {
				if (expanded.has(entry.path)) expanded.delete(entry.path);
				else expanded.add(entry.path);
				await renderTree();
			});
		} else {
			row.addEventListener('click', () => void openFile(entry.path));
		}
		container.appendChild(row);

		if (entry.directory && expanded.has(entry.path)) {
			await renderDirInto(container, entry.path, depth + 1);
		}
	}
}

async function restoreWorkspace(): Promise<void> {
	const ws = await window.idexal.workspace.current();
	if (ws) {
		$('workspace-name').textContent = ws.name;
		await renderTree();
		await refreshGit();
	}
}

$('open-folder').addEventListener('click', async () => {
	const ws = await window.idexal.workspace.open();
	if (!ws) return;
	$('workspace-name').textContent = ws.name;
	expanded.clear();
	for (const filePath of [...tabs.keys()]) closeTab(filePath);
	await renderTree();
	await refreshGit();
});

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

async function refreshGit(): Promise<void> {
	const panel = $('git-panel');
	const result = await window.idexal.git.status();
	if (!result.ok) {
		panel.innerHTML = '<div class="empty">لا مستودع Git</div>';
		$('git-branch').textContent = '⎇ —';
		$('agent-diffstat').textContent = '';
		return;
	}
	$('git-branch').textContent = `⎇ ${result.branch}`;
	const files = result.files ?? [];
	$('agent-diffstat').textContent = files.length ? `${files.length} ملف معدَّل` : '';

	panel.innerHTML = '';
	if (!files.length) {
		panel.innerHTML = '<div class="empty">لا تغييرات</div>';
		return;
	}
	for (const file of files) {
		const row = document.createElement('div');
		row.className = 'git-row';
		const state = document.createElement('span');
		state.className = `state ${file.state}`;
		state.textContent = file.state || '?';
		const p = document.createElement('span');
		p.className = 'path';
		p.textContent = file.path;
		row.append(state, p);
		row.addEventListener('click', () => void showDiff(file.path));
		panel.appendChild(row);
	}
}

async function showDiff(file: string): Promise<void> {
	const result = await window.idexal.git.diff(file);
	const out = $('diff-output');
	out.innerHTML = '';
	if (!result.ok || !result.diff) {
		out.textContent = result.error ?? 'لا فروق (ملف جديد غير متتبَّع؟)';
	} else {
		// Colorize by line prefix. Built with DOM nodes, not innerHTML, so
		// diff content can never inject markup.
		for (const line of result.diff.split('\n')) {
			const span = document.createElement('div');
			if (line.startsWith('+') && !line.startsWith('+++')) span.className = 'add';
			else if (line.startsWith('-') && !line.startsWith('---')) span.className = 'del';
			else if (line.startsWith('@@')) span.className = 'hunk';
			span.textContent = line;
			out.appendChild(span);
		}
	}
	selectDock('diff');
	$('dock').classList.remove('collapsed');
}

$('git-refresh').addEventListener('click', () => void refreshGit());

// ---------------------------------------------------------------------------
// Rail / panels / dock
// ---------------------------------------------------------------------------

document.querySelectorAll('.rail-btn').forEach((btn) => {
	btn.addEventListener('click', () => {
		const panel = (btn as HTMLElement).dataset.panel;
		document.querySelectorAll('.rail-btn').forEach((b) => b.classList.toggle('active', b === btn));
		document.querySelectorAll('.side-panel').forEach((p) => {
			p.classList.toggle('active', (p as HTMLElement).dataset.panel === panel);
		});
		if (panel === 'git') void refreshGit();
	});
});

function selectDock(name: string): void {
	document.querySelectorAll('.dock-tab').forEach((t) => {
		t.classList.toggle('active', (t as HTMLElement).dataset.dock === name);
	});
	document.querySelectorAll('.dock-panel').forEach((p) => {
		p.classList.toggle('active', (p as HTMLElement).dataset.dock === name);
	});
}
document.querySelectorAll('.dock-tab').forEach((tab) => {
	tab.addEventListener('click', () => selectDock((tab as HTMLElement).dataset.dock!));
});
$('dock-toggle').addEventListener('click', () => {
	const dock = $('dock');
	dock.classList.toggle('collapsed');
	$('dock-toggle').textContent = dock.classList.contains('collapsed') ? '▴' : '▾';
});

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------

const TERMINAL_ID = 'main';
const termOut = $('terminal-output');
let terminalStarted = false;

function appendTerminal(text: string): void {
	termOut.appendChild(document.createTextNode(text));
	termOut.scrollTop = termOut.scrollHeight;
}

function ensureTerminal(): void {
	if (terminalStarted) return;
	terminalStarted = true;
	window.idexal.terminal.start(
		TERMINAL_ID,
		(data) => appendTerminal(data),
		(code) => appendTerminal(`\n[انتهت الجلسة، رمز ${code ?? '?'}]\n`),
	);
}

const termInput = $<HTMLInputElement>('terminal-input');
termInput.addEventListener('keydown', (e) => {
	if (e.key !== 'Enter') return;
	const line = termInput.value;
	termInput.value = '';
	appendTerminal(`❯ ${line}\n`);
	ensureTerminal();
	void window.idexal.terminal.write(TERMINAL_ID, line + '\n');
});
termInput.addEventListener('focus', ensureTerminal);

// ---------------------------------------------------------------------------
// Live preview
// ---------------------------------------------------------------------------

const previewWrap = $('preview-wrap');
const previewView = $<HTMLElement & { src: string; reload: () => void }>('preview-view');

$('toggle-preview').addEventListener('click', () => {
	previewWrap.classList.toggle('hidden');
	if (!previewWrap.classList.contains('hidden')) navigatePreview();
});
$('preview-close').addEventListener('click', () => previewWrap.classList.add('hidden'));
$('preview-go').addEventListener('click', navigatePreview);
$('preview-reload').addEventListener('click', () => {
	try {
		previewView.reload();
	} catch {
		navigatePreview();
	}
});
$<HTMLInputElement>('preview-url').addEventListener('keydown', (e) => {
	if (e.key === 'Enter') navigatePreview();
});

function navigatePreview(): void {
	const raw = $<HTMLInputElement>('preview-url').value.trim();
	if (!raw) return;
	const url = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
	previewView.src = url;
}

// ---------------------------------------------------------------------------
// Agent conversation
// ---------------------------------------------------------------------------

const log = $('agent-log');
const agentInput = $<HTMLInputElement>('agent-input');
const sendBtn = $<HTMLButtonElement>('agent-send');
const stateEl = $('agent-state');
const multiAgent = $<HTMLInputElement>('multi-agent');
const taskList = $('agent-tasks');

multiAgent.addEventListener('change', () => {
	$('agent-mode-label').textContent = multiAgent.checked ? 'تعدد الوكلاء' : 'وكيل واحد';
});

function agentLog(text: string, cls = 'meta'): HTMLElement {
	const el = document.createElement('div');
	el.className = cls;
	el.textContent = text;
	log.appendChild(el);
	log.scrollTop = log.scrollHeight;
	return el;
}

function appendUser(text: string): void {
	const div = document.createElement('div');
	div.className = 'line from-user';
	div.textContent = text;
	log.appendChild(div);
	log.scrollTop = log.scrollHeight;
}

function newAgentBubble(): HTMLElement {
	const div = document.createElement('div');
	div.className = 'line from-agent';
	const name = document.createElement('span');
	name.className = 'agent-name';
	name.textContent = 'IDEXAL AGENT';
	const body = document.createElement('span');
	div.append(name, body);
	log.appendChild(div);
	log.scrollTop = log.scrollHeight;
	return body;
}

function setRunning(running: boolean): void {
	sendBtn.disabled = running;
	stateEl.textContent = running ? 'running…' : 'idle';
	stateEl.classList.toggle('running', running);
}

function renderPlan(steps: Array<{ id: number; description: string }>): void {
	taskList.innerHTML = '';
	for (const step of steps) {
		const row = document.createElement('div');
		row.className = 'task-row';
		row.dataset.step = String(step.id);
		const head = document.createElement('div');
		head.className = 't-head';
		const dot = document.createElement('span');
		dot.className = 'dot';
		const id = document.createElement('span');
		id.className = 't-id';
		id.textContent = `${step.id}`;
		const desc = document.createElement('span');
		desc.className = 't-desc';
		desc.textContent = step.description;
		head.append(dot, id, desc);
		row.appendChild(head);
		taskList.appendChild(row);
	}
	// Surface the plan without stealing focus from whatever the user is doing.
	document.querySelector<HTMLElement>('.rail-btn[data-panel="agents"]')?.click();
}

function markStep(id: number, cls: string): void {
	const row = taskList.querySelector<HTMLElement>(`.task-row[data-step="${id}"]`);
	if (!row) return;
	row.classList.remove('running', 'done', 'failed');
	row.classList.add(cls);
}

function send(): void {
	const task = agentInput.value.trim();
	if (!task) return;
	agentInput.value = '';
	setRunning(true);
	appendUser(task);

	let body = newAgentBubble();
	let buffer = '';
	// Tool/phase lines interrupt the answer, so the next text delta must
	// start a fresh bubble rather than reopening the one above them.
	let textOpen = true;
	const breakText = () => {
		textOpen = false;
	};

	const stop = window.idexal.runTask(
		task,
		(event) => {
			switch (event.type) {
				case 'provider':
					agentLog(`⇄ ${event.name}`);
					breakText();
					break;
				case 'phase':
					agentLog(`▸ ${event.phase}`, 'meta phase');
					breakText();
					break;
				case 'plan':
					if (event.steps) renderPlan(event.steps);
					breakText();
					break;
				case 'step-start':
					if (event.id !== undefined) markStep(event.id, 'running');
					agentLog(`▶ [${event.id}] ${event.description ?? ''}`);
					breakText();
					break;
				case 'step-end':
					if (event.id !== undefined) markStep(event.id, event.ok ? 'done' : 'failed');
					agentLog(`${event.ok ? '✓' : '✗'} [${event.id}]`, `meta ${event.ok ? 'tool-ok' : 'tool-fail'}`);
					breakText();
					break;
				case 'delta':
					if (!event.text) break;
					if (!textOpen) {
						body = newAgentBubble();
						buffer = '';
						textOpen = true;
					}
					buffer += event.text;
					body.textContent = buffer;
					log.scrollTop = log.scrollHeight;
					break;
				case 'tool-call': {
					let detail = '';
					try {
						const parsed = JSON.parse(event.args ?? '{}') as Record<string, unknown>;
						detail = (parsed.path as string) ?? (parsed.command as string) ?? '';
					} catch {
						// malformed args: show the tool name alone
					}
					const tag = event.step !== undefined ? `[${event.step}] ` : '';
					agentLog(`${tag}⚙ ${event.name}${detail ? ` ${detail}` : ''}`, 'meta tool');
					breakText();
					break;
				}
				case 'tool-result': {
					const tag = event.step !== undefined ? `[${event.step}] ` : '';
					agentLog(`${tag}${event.ok ? '✓' : '✗'} ${event.name}`, `meta ${event.ok ? 'tool-ok' : 'tool-fail'}`);
					breakText();
					// The agent may have written files — refresh what the
					// user sees so the UI never shows stale state.
					void refreshGit();
					void reloadOpenTabs();
					break;
				}
				case 'done':
					agentLog(`● ${event.provider ?? ''}${event.tool_rounds ? ` · ${event.tool_rounds}` : ''}`);
					setRunning(false);
					void refreshGit();
					void renderTree();
					stop();
					break;
				case 'error':
					agentLog(`⚠️ ${event.error}`, 'meta tool-fail');
					setRunning(false);
					stop();
					break;
			}
		},
		multiAgent.checked ? 'agent' : 'stream',
	);
}

/**
 * Re-read open files the agent may have rewritten. Tabs with unsaved edits
 * are left alone — silently discarding the user's work to show the agent's
 * version would be worse than showing a stale buffer.
 */
async function reloadOpenTabs(): Promise<void> {
	for (const [filePath, tab] of tabs) {
		if (tab.dirty) continue;
		const result = await window.idexal.workspace.read(filePath);
		if (result.ok && result.content !== undefined && result.content !== tab.model.getValue()) {
			tab.model.setValue(result.content);
			tab.dirty = false;
		}
	}
	renderTabs();
}

sendBtn.addEventListener('click', send);
agentInput.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') send();
});
