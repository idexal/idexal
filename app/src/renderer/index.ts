// Idexal — renderer shell (ZCode-style, task-centric)
//
// Three views share one window: Home (composer), Task (conversation +
// live plan) and Workspace (editor, terminal, git, preview). Tasks are
// first-class objects in the sidebar so several can exist at once; the
// editor is somewhere you go, not the default screen.
//
// All privileged work (disk, shells, git, spawning the core) crosses the
// preload bridge — the renderer never touches Node directly.

import { hydrateIcons } from './icons';

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
		/** Opened by settings.ts, which owns the settings page. */
		__idexalOpenSettings?: () => void;
	}
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// ───────────────────────── view switching ─────────────────────────

type ViewName = 'home' | 'task' | 'workspace';

function showView(name: ViewName): void {
	for (const el of document.querySelectorAll<HTMLElement>('.view')) {
		el.classList.toggle('active', el.id === `view-${name}`);
	}
	// Monaco measures lazily; entering the workspace after it was hidden
	// leaves it sized 0x0 until told to re-measure.
	if (name === 'workspace') editor?.layout();
}

// ───────────────────────── dropdown menu ─────────────────────────

interface MenuEntry {
	label: string;
	detail?: string;
	checked?: boolean;
	onPick: () => void;
}

const menuEl = $('menu');

function openMenu(anchor: HTMLElement, entries: MenuEntry[], head?: string): void {
	menuEl.innerHTML = '';
	if (head) {
		const h = document.createElement('div');
		h.className = 'menu-head';
		h.textContent = head;
		menuEl.appendChild(h);
	}
	for (const entry of entries) {
		const btn = document.createElement('button');
		btn.className = 'menu-item';
		const text = document.createElement('span');
		text.className = 'mi-t';
		text.textContent = entry.label;
		if (entry.detail) {
			const d = document.createElement('span');
			d.className = 'mi-d';
			d.textContent = entry.detail;
			text.appendChild(d);
		}
		btn.appendChild(text);
		if (entry.checked) {
			const check = document.createElement('span');
			check.className = 'mi-check';
			check.textContent = '✓';
			btn.appendChild(check);
		}
		btn.addEventListener('click', () => {
			closeMenu();
			entry.onPick();
		});
		menuEl.appendChild(btn);
	}

	const rect = anchor.getBoundingClientRect();
	menuEl.classList.remove('hidden');
	// Anchor to the button, then clamp so the menu never leaves the window.
	const menuRect = menuEl.getBoundingClientRect();
	let top = rect.bottom + 6;
	if (top + menuRect.height > window.innerHeight - 8) top = Math.max(8, rect.top - menuRect.height - 6);
	let right = window.innerWidth - rect.right;
	if (right + menuRect.width > window.innerWidth - 8) right = 8;
	menuEl.style.top = `${top}px`;
	menuEl.style.right = `${right}px`;
}

function closeMenu(): void {
	menuEl.classList.add('hidden');
}

document.addEventListener('click', (e) => {
	if (!menuEl.contains(e.target as Node)) closeMenu();
});
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') closeMenu();
});

// ───────────────────────── state ─────────────────────────

type AccessMode = 'full' | 'plan' | 'read-only';

interface TaskRecord {
	id: string;
	title: string;
	state: 'running' | 'done' | 'failed';
	log: HTMLElement;
	plan: HTMLElement;
	stop?: () => void;
}

const tasks = new Map<string, TaskRecord>();
let activeTaskId: string | null = null;
let accessMode: AccessMode = 'full';
let workspaceName: string | null = null;
let gitBranch = '—';

const ACCESS_LABEL: Record<AccessMode, string> = {
	full: 'صلاحية كاملة',
	plan: 'وضع التخطيط',
	'read-only': 'قراءة فقط',
};

// ───────────────────────── greeting ─────────────────────────

function greeting(): string {
	const h = new Date().getHours();
	if (h < 12) return 'صباح الخير، لنبدأ';
	if (h < 17) return 'نهارك سعيد، لنكمل';
	return 'مساء الخير، عمل جيد اليوم';
}
$('home-greeting').textContent = greeting();

// ───────────────────────── workspace ─────────────────────────

async function refreshWorkspaceChrome(): Promise<void> {
	const ws = await window.idexal.workspace.current();
	workspaceName = ws?.name ?? null;
	$('chip-workspace-label').textContent = ws?.name ?? 'اختر مجلداً';

	const list = $('project-list');
	list.innerHTML = '';
	if (ws) {
		const row = document.createElement('div');
		row.className = 'sb-row active';
		const ic = document.createElement('span');
		ic.className = 'ic';
		ic.textContent = '▤';
		const nm = document.createElement('span');
		nm.className = 'nm';
		nm.textContent = ws.name;
		row.append(ic, nm);
		row.addEventListener('click', () => showView('workspace'));
		list.appendChild(row);
	} else {
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'لا مشاريع — افتح مجلداً';
		list.appendChild(empty);
	}

	await refreshGit();
	if (ws) await renderTree();
}

async function openFolder(): Promise<void> {
	const ws = await window.idexal.workspace.open();
	if (!ws) return;
	expanded.clear();
	for (const p of [...openTabs.keys()]) closeTab(p);
	await refreshWorkspaceChrome();
}

$('sb-open-folder').addEventListener('click', () => void openFolder());
$('chip-workspace').addEventListener('click', (e) => {
	openMenu(e.currentTarget as HTMLElement, [
		{ label: 'فتح مجلد…', detail: 'اختر مساحة عمل جديدة', onPick: () => void openFolder() },
		...(workspaceName
			? [{ label: 'الذهاب لمساحة العمل', detail: workspaceName, onPick: () => showView('workspace') }]
			: []),
	], 'مساحة العمل');
});

// ───────────────────────── access & model chips ─────────────────────────

$('chip-access').addEventListener('click', (e) => {
	const pick = (m: AccessMode) => () => {
		accessMode = m;
		$('chip-access-label').textContent = ACCESS_LABEL[m];
		const dot = document.querySelector<HTMLElement>('#chip-access .dot');
		if (dot) dot.className = `dot ${m === 'full' ? 'warn' : m === 'plan' ? '' : 'ok'}`;
	};
	openMenu(e.currentTarget as HTMLElement, [
		{ label: 'صلاحية كاملة', detail: 'يقرأ ويكتب ويشغّل أوامر', checked: accessMode === 'full', onPick: pick('full') },
		{ label: 'وضع التخطيط', detail: 'يخطط ولا ينفّذ', checked: accessMode === 'plan', onPick: pick('plan') },
		{ label: 'قراءة فقط', detail: 'يفحص بلا أي تعديل', checked: accessMode === 'read-only', onPick: pick('read-only') },
	], 'الصلاحيات');
});

let modelLabel = 'تلقائي (حسب الأولوية)';
$('chip-model-label').textContent = modelLabel;

async function modelMenu(anchor: HTMLElement): Promise<void> {
	const res = await window.idexal.settings.load();
	const entries: MenuEntry[] = [
		{
			label: 'تلقائي (حسب الأولوية)',
			detail: 'يجرّب المزودين بالترتيب مع تبديل تلقائي',
			checked: modelLabel.startsWith('تلقائي'),
			onPick: () => {
				modelLabel = 'تلقائي (حسب الأولوية)';
				$('chip-model-label').textContent = modelLabel;
			},
		},
	];

	const data = res.ok ? (res.data as { providers?: Array<{ id?: string; model?: string; usable?: boolean }> }) : null;
	for (const p of data?.providers ?? []) {
		if (!p.id) continue;
		entries.push({
			label: `${p.id} · ${p.model ?? ''}`,
			detail: p.usable ? 'جاهز' : 'غير مهيأ — أضف مفتاحاً في الإعدادات',
			checked: modelLabel.startsWith(p.id),
			onPick: () => {
				// Selection is informational until per-task provider pinning
				// lands in the core; the chain still decides at run time.
				modelLabel = `${p.id} · ${p.model ?? ''}`;
				$('chip-model-label').textContent = modelLabel;
			},
		});
	}
	entries.push({ label: 'إدارة المزوّدين…', onPick: () => window.__idexalOpenSettings?.() });
	openMenu(anchor, entries, 'النموذج');
}
$('chip-model').addEventListener('click', (e) => void modelMenu(e.currentTarget as HTMLElement));

// ───────────────────────── running a task ─────────────────────────

function taskRow(rec: TaskRecord): HTMLElement {
	const row = document.createElement('div');
	row.className = `sb-row ${rec.state}`;
	row.dataset.taskId = rec.id;
	const dot = document.createElement('span');
	dot.className = 'dot';
	const nm = document.createElement('span');
	nm.className = 'nm';
	nm.textContent = rec.title;
	row.append(dot, nm);
	row.addEventListener('click', () => activateTask(rec.id));
	return row;
}

function renderTaskList(): void {
	const list = $('task-list');
	list.innerHTML = '';
	if (tasks.size === 0) {
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'لا مهام بعد';
		list.appendChild(empty);
		return;
	}
	for (const rec of [...tasks.values()].reverse()) list.appendChild(taskRow(rec));
}

function activateTask(id: string): void {
	const rec = tasks.get(id);
	if (!rec) return;
	activeTaskId = id;
	$('task-title').textContent = rec.title;
	const logHost = $('task-log');
	logHost.innerHTML = '';
	logHost.appendChild(rec.log);
	const planHost = $('task-plan-list');
	planHost.innerHTML = '';
	planHost.appendChild(rec.plan);
	setTaskState(rec.state);
	showView('task');
}

function setTaskState(state: TaskRecord['state']): void {
	const el = $('task-state');
	el.textContent = state === 'running' ? 'يعمل…' : state === 'done' ? 'تم' : 'فشل';
	el.classList.toggle('running', state === 'running');
}

function meta(host: HTMLElement, text: string, cls = 'meta'): void {
	const el = document.createElement('div');
	el.className = cls;
	el.textContent = text;
	host.appendChild(el);
	scrollLog();
}

function scrollLog(): void {
	const host = $('task-log');
	host.scrollTop = host.scrollHeight;
}

function agentBubble(host: HTMLElement): HTMLElement {
	const wrap = document.createElement('div');
	wrap.className = 'msg-agent';
	const who = document.createElement('span');
	who.className = 'who';
	who.textContent = 'IDEXAL';
	const body = document.createElement('span');
	wrap.append(who, body);
	host.appendChild(wrap);
	scrollLog();
	return body;
}

function startTask(prompt: string, multi: boolean): void {
	const id = `t${Date.now()}`;
	const log = document.createElement('div');
	log.style.display = 'contents';
	const plan = document.createElement('div');
	plan.style.display = 'contents';

	const rec: TaskRecord = {
		id,
		title: prompt.length > 46 ? prompt.slice(0, 46) + '…' : prompt,
		state: 'running',
		log,
		plan,
	};
	tasks.set(id, rec);
	renderTaskList();
	activateTask(id);

	const user = document.createElement('div');
	user.className = 'msg-user';
	user.textContent = prompt;
	log.appendChild(user);

	let body = agentBubble(log);
	let buffer = '';
	let textOpen = true;
	const breakText = () => {
		textOpen = false;
	};

	// Access mode maps onto what the core already enforces: plan mode is the
	// orchestrator's planning phase, read-only restricts the tool set.
	const effectiveMulti = multi || accessMode === 'plan';
	const decorated =
		accessMode === 'read-only'
			? `راجع للقراءة فقط — لا تعدّل أي ملف ولا تشغّل أوامر.\n\n${prompt}`
			: accessMode === 'plan'
				? `خطّط فقط ولا تنفّذ.\n\n${prompt}`
				: prompt;

	const finish = (state: TaskRecord['state']) => {
		rec.state = state;
		if (activeTaskId === id) setTaskState(state);
		renderTaskList();
	};

	rec.stop = window.idexal.runTask(
		decorated,
		(event) => {
			switch (event.type) {
				case 'provider':
					meta(log, `⇄ ${event.name}`);
					breakText();
					break;
				case 'phase':
					meta(log, `▸ ${event.phase}`, 'meta phase');
					breakText();
					break;
				case 'plan':
					renderPlan(rec, event.steps ?? []);
					breakText();
					break;
				case 'step-start':
					markStep(rec, event.id, 'running');
					meta(log, `▶ [${event.id}] ${event.description ?? ''}`);
					breakText();
					break;
				case 'step-end':
					markStep(rec, event.id, event.ok ? 'done' : 'failed');
					meta(log, `${event.ok ? '✓' : '✗'} [${event.id}]`, `meta ${event.ok ? 'ok' : 'bad'}`);
					breakText();
					break;
				case 'delta':
					if (!event.text) break;
					if (!textOpen) {
						body = agentBubble(log);
						buffer = '';
						textOpen = true;
					}
					buffer += event.text;
					body.textContent = buffer;
					scrollLog();
					break;
				case 'tool-call': {
					let detail = '';
					try {
						const parsed = JSON.parse(event.args ?? '{}') as Record<string, unknown>;
						detail = (parsed.path as string) ?? (parsed.command as string) ?? '';
					} catch {
						// malformed args: the tool name alone is still useful
					}
					const tag = event.step !== undefined ? `[${event.step}] ` : '';
					meta(log, `${tag}⚙ ${event.name}${detail ? ` ${detail}` : ''}`, 'meta tool');
					breakText();
					break;
				}
				case 'tool-result': {
					const tag = event.step !== undefined ? `[${event.step}] ` : '';
					meta(log, `${tag}${event.ok ? '✓' : '✗'} ${event.name}`, `meta ${event.ok ? 'ok' : 'bad'}`);
					breakText();
					void refreshGit();
					void reloadOpenTabs();
					break;
				}
				case 'done':
					meta(log, `● ${event.provider ?? ''}${event.tool_rounds ? ` · ${event.tool_rounds}` : ''}`);
					finish('done');
					void refreshGit();
					void renderTree();
					rec.stop?.();
					break;
				case 'error':
					meta(log, `⚠ ${event.error}`, 'meta bad');
					finish('failed');
					rec.stop?.();
					break;
			}
		},
		effectiveMulti ? 'agent' : 'stream',
	);
}

function renderPlan(rec: TaskRecord, steps: Array<{ id: number; description: string }>): void {
	rec.plan.innerHTML = '';
	for (const step of steps) {
		const row = document.createElement('div');
		row.className = 'tp-row';
		row.dataset.step = String(step.id);
		const head = document.createElement('div');
		head.className = 't-head';
		const dot = document.createElement('span');
		dot.className = 'dot';
		const sid = document.createElement('span');
		sid.className = 't-id';
		sid.textContent = String(step.id);
		const desc = document.createElement('span');
		desc.className = 't-desc';
		desc.textContent = step.description;
		head.append(dot, sid, desc);
		row.appendChild(head);
		rec.plan.appendChild(row);
	}
}

function markStep(rec: TaskRecord, id: number | undefined, cls: string): void {
	if (id === undefined) return;
	const row = rec.plan.querySelector<HTMLElement>(`.tp-row[data-step="${id}"]`);
	if (!row) return;
	row.classList.remove('running', 'done', 'failed');
	row.classList.add(cls);
}

// ───────────────────────── composer wiring ─────────────────────────

const composer = $<HTMLTextAreaElement>('composer-input');

function submitComposer(): void {
	const text = composer.value.trim();
	if (!text) return;
	composer.value = '';
	// Multi-agent is implied for anything but a trivially short ask; the
	// orchestrator collapses to a single step when the task is simple.
	startTask(text, text.length > 60);
}

$('composer-send').addEventListener('click', submitComposer);
composer.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		submitComposer();
	}
});

const PRESETS: Record<string, string> = {
	'git-summary': 'لخّص حالة Git في هذا المشروع: ما الملفات المعدّلة، وما الذي يحتاج انتباهاً قبل الإيداع.',
	review: 'راجع الكود في هذا المشروع للقراءة فقط: اذكر المشاكل الحقيقية مع file:line واقترح إصلاحات محددة.',
	custom: '',
};
for (const card of document.querySelectorAll<HTMLElement>('.hcard')) {
	card.addEventListener('click', () => {
		const preset = card.dataset.preset ?? 'custom';
		composer.value = PRESETS[preset] ?? '';
		composer.focus();
		if (preset === 'review') {
			accessMode = 'read-only';
			$('chip-access-label').textContent = ACCESS_LABEL['read-only'];
			const dot = document.querySelector<HTMLElement>('#chip-access .dot');
			if (dot) dot.className = 'dot ok';
		}
	});
}

const taskInput = $<HTMLTextAreaElement>('task-input');
function submitTaskInput(): void {
	const text = taskInput.value.trim();
	if (!text) return;
	taskInput.value = '';
	startTask(text, text.length > 60);
}
$('task-send').addEventListener('click', submitTaskInput);
taskInput.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		submitTaskInput();
	}
});

$('nav-new-task').addEventListener('click', () => {
	showView('home');
	composer.focus();
});
$('sb-logo').addEventListener('click', () => showView('home'));
$('task-back').addEventListener('click', () => showView('home'));
$('task-open-workspace').addEventListener('click', () => showView('workspace'));
$('ws-back').addEventListener('click', () => showView(activeTaskId ? 'task' : 'home'));

$('nav-search').addEventListener('click', (e) => {
	const entries: MenuEntry[] = [...tasks.values()].reverse().map((t) => ({
		label: t.title,
		detail: t.state === 'running' ? 'يعمل' : t.state === 'done' ? 'تم' : 'فشل',
		onPick: () => activateTask(t.id),
	}));
	openMenu(
		e.currentTarget as HTMLElement,
		entries.length ? entries : [{ label: 'لا مهام بعد', onPick: () => showView('home') }],
		'المهام',
	);
});

// Automations and Skills are declared surfaces in the design docs but have
// no engine behind them yet; say so rather than opening an empty panel.
for (const [id, name] of [
	['nav-automations', 'الأتمتة'],
	['nav-skills', 'المهارات'],
] as const) {
	$(id).addEventListener('click', (e) => {
		openMenu(e.currentTarget as HTMLElement, [
			{ label: 'غير مفعّل بعد', detail: `${name} مخطّط لها ولم تُبنَ في النواة حتى الآن`, onPick: () => {} },
		], name);
	});
}

document.addEventListener('keydown', (e) => {
	if (!(e.ctrlKey || e.metaKey)) return;
	if (e.key === 'n') {
		e.preventDefault();
		showView('home');
		composer.focus();
	} else if (e.key === 'k') {
		e.preventDefault();
		$('nav-search').click();
	}
});

// ───────────────────────── editor + tabs ─────────────────────────

let monacoApi: typeof import('monaco-editor') | null = null;
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;

interface OpenTab {
	path: string;
	model: import('monaco-editor').editor.ITextModel;
	dirty: boolean;
}
const openTabs = new Map<string, OpenTab>();
let activeTab: string | null = null;

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
	editor.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.KeyS, () => void saveActive());
	void refreshWorkspaceChrome();
});

function renderTabs(): void {
	const bar = $('tabs');
	bar.innerHTML = '';
	for (const [filePath, tab] of openTabs) {
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
	const tab = openTabs.get(filePath);
	if (!tab || !editor) return;
	activeTab = filePath;
	editor.setModel(tab.model);
	renderTabs();
	for (const row of document.querySelectorAll<HTMLElement>('#file-tree .tree-row')) {
		row.classList.toggle('active', row.dataset.path === filePath);
	}
}

function closeTab(filePath: string): void {
	const tab = openTabs.get(filePath);
	if (!tab) return;
	tab.model.dispose();
	openTabs.delete(filePath);
	if (activeTab === filePath) {
		activeTab = openTabs.keys().next().value ?? null;
		if (activeTab) activateTab(activeTab);
		else editor?.setModel(null);
	}
	renderTabs();
}

async function openFile(filePath: string): Promise<void> {
	if (openTabs.has(filePath)) {
		activateTab(filePath);
		showView('workspace');
		return;
	}
	const result = await window.idexal.workspace.read(filePath);
	if (!result.ok || !monacoApi) return;
	const model = monacoApi.editor.createModel(result.content ?? '', languageFor(filePath));
	const tab: OpenTab = { path: filePath, model, dirty: false };
	model.onDidChangeContent(() => {
		if (!tab.dirty) {
			tab.dirty = true;
			renderTabs();
		}
	});
	openTabs.set(filePath, tab);
	activateTab(filePath);
	showView('workspace');
}

async function saveActive(): Promise<void> {
	if (!activeTab) return;
	const tab = openTabs.get(activeTab);
	if (!tab) return;
	const result = await window.idexal.workspace.write(tab.path, tab.model.getValue());
	if (result.ok) {
		tab.dirty = false;
		renderTabs();
		void refreshGit();
	}
}

/** Re-read files the agent rewrote. Tabs with unsaved edits are left alone:
 *  discarding the user's work to show the agent's version would be worse. */
async function reloadOpenTabs(): Promise<void> {
	for (const [filePath, tab] of openTabs) {
		if (tab.dirty) continue;
		const result = await window.idexal.workspace.read(filePath);
		if (result.ok && result.content !== undefined && result.content !== tab.model.getValue()) {
			tab.model.setValue(result.content);
			tab.dirty = false;
		}
	}
	renderTabs();
}

// ───────────────────────── file tree ─────────────────────────

const expanded = new Set<string>();

async function renderTree(): Promise<void> {
	const container = $('file-tree');
	container.innerHTML = '';
	await renderDirInto(container, '.', 0);
	if (!container.children.length) {
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'المجلد فارغ';
		container.appendChild(empty);
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
		const label = document.createElement('span');
		label.textContent = entry.name;
		row.append(icon, label);
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

// ───────────────────────── git ─────────────────────────

async function refreshGit(): Promise<void> {
	const panel = $('git-panel');
	const result = await window.idexal.git.status();
	if (!result.ok) {
		panel.innerHTML = '';
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'لا مستودع Git';
		panel.appendChild(empty);
		gitBranch = '—';
		$('chip-branch-label').textContent = '—';
		return;
	}
	gitBranch = result.branch ?? '—';
	$('chip-branch-label').textContent = gitBranch;

	const files = result.files ?? [];
	panel.innerHTML = '';
	if (!files.length) {
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'لا تغييرات';
		panel.appendChild(empty);
		return;
	}
	for (const file of files) {
		const row = document.createElement('div');
		row.className = 'git-row';
		const state = document.createElement('span');
		state.className = `state ${file.state.replace(/[^A-Za-z]/g, '') || 'U'}`;
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
		// DOM nodes, not innerHTML: diff content must never inject markup.
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
	showView('workspace');
}

// ───────────────────────── workspace panels / dock ─────────────────────────

for (const btn of document.querySelectorAll<HTMLElement>('.ws-st')) {
	btn.addEventListener('click', () => {
		const which = btn.dataset.wsp;
		for (const b of document.querySelectorAll<HTMLElement>('.ws-st')) b.classList.toggle('active', b === btn);
		for (const p of document.querySelectorAll<HTMLElement>('.ws-panel')) {
			p.classList.toggle('active', p.dataset.wsp === which);
		}
		if (which === 'git') void refreshGit();
	});
}

function selectDock(name: string): void {
	for (const t of document.querySelectorAll<HTMLElement>('.dock-tab')) t.classList.toggle('active', t.dataset.dock === name);
	for (const p of document.querySelectorAll<HTMLElement>('.dock-panel')) p.classList.toggle('active', p.dataset.dock === name);
}
for (const tab of document.querySelectorAll<HTMLElement>('.dock-tab')) {
	tab.addEventListener('click', () => selectDock(tab.dataset.dock!));
}
$('dock-toggle').addEventListener('click', () => {
	const dock = $('dock');
	dock.classList.toggle('collapsed');
	$('dock-toggle').textContent = dock.classList.contains('collapsed') ? '▴' : '▾';
});

// ───────────────────────── terminal ─────────────────────────

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

// ───────────────────────── live preview ─────────────────────────

const previewWrap = $('preview-wrap');
const previewView = $<HTMLElement & { src: string; reload: () => void }>('preview-view');

function navigatePreview(): void {
	const raw = $<HTMLInputElement>('preview-url').value.trim();
	if (!raw) return;
	previewView.src = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

$('ws-toggle-preview').addEventListener('click', () => {
	previewWrap.classList.toggle('hidden');
	if (!previewWrap.classList.contains('hidden')) navigatePreview();
	editor?.layout();
});
$('preview-close').addEventListener('click', () => {
	previewWrap.classList.add('hidden');
	editor?.layout();
});
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

// ───────────────────────── boot ─────────────────────────

hydrateIcons();
void refreshWorkspaceChrome();
