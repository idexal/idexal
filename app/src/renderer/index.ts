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
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

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
			runTask: (
				task: string,
				onEvent: (e: CoreEvent) => void,
				mode?: 'stream' | 'agent',
				sessionId?: string,
				pin?: { provider?: string; model?: string },
			) => () => void;
			workspace: {
				open: () => Promise<{ root: string; name: string } | null>;
				current: () => Promise<{ root: string; name: string } | null>;
				list: (rel: string) => Promise<{ ok: boolean; entries?: Array<{ name: string; path: string; directory: boolean }>; error?: string }>;
				read: (rel: string) => Promise<{ ok: boolean; content?: string; readOnly?: boolean; error?: string }>;
				write: (rel: string, content: string) => Promise<{ ok: boolean; error?: string }>;
				pickFiles: () => Promise<{ ok: boolean; files?: string[]; skipped?: number; error?: string }>;
			};
			automations: {
				list: () => Promise<{ ok: boolean; automations?: unknown[]; running?: string[]; error?: string }>;
				save: (a: unknown) => Promise<{ ok: boolean; error?: string }>;
				remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
				runNow: (id: string) => Promise<{ ok: boolean; error?: string }>;
				watch: (on: (event: string, payload: unknown) => void) => () => void;
			};
			skills: {
				list: () => Promise<{ ok: boolean; skills?: Array<{ id: string; name: string; prompt: string }>; error?: string }>;
				save: (skill: { id?: string; name: string; prompt: string }) => Promise<{ ok: boolean; error?: string }>;
				remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
			};
			terminal: {
				start: (
					id: string,
					onData: (d: string) => void,
					onExit: (c: number | null) => void,
					size?: { cols: number; rows: number },
				) => () => void;
				write: (id: string, data: string) => Promise<unknown>;
				resize: (id: string, cols: number, rows: number) => Promise<unknown>;
			};
			git: {
				status: () => Promise<{
					ok: boolean;
					branch?: string;
					files?: Array<{ state: string; path: string; staged: boolean; untracked: boolean }>;
					error?: string;
				}>;
				diff: (file: string) => Promise<{ ok: boolean; diff?: string; error?: string }>;
				stage: (file: string) => Promise<{ ok: boolean; error?: string }>;
				unstage: (file: string) => Promise<{ ok: boolean; error?: string }>;
				commit: (message: string) => Promise<{ ok: boolean; output?: string; error?: string }>;
			};
			settings: {
				load: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				save: (cfg: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				testProvider: (id: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
			};
			usage: {
				load: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
			};
			debug: {
				start: (
					file: string,
					breakpoints: Array<{ file: string; line: number }>,
					on: (event: string, payload: unknown) => void,
				) => { done: Promise<unknown>; stop: () => void };
				cont: () => Promise<unknown>;
				stepOver: () => Promise<unknown>;
				stepInto: () => Promise<unknown>;
				stepOut: () => Promise<unknown>;
				setBreakpoint: (file: string, line: number) => Promise<unknown>;
				stop: () => Promise<unknown>;
			};
			undo: {
				list: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				restore: (relative?: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				clear: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
			};
			sessions: {
				list: () => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				show: (id: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
				remove: (id: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
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
	/** Whether a restored session's transcript has been rendered yet. */
	loaded?: boolean;
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

// How many agents a task gets. This used to be decided silently by the
// length of the prompt (>60 characters ⇒ multi-agent), which is arbitrary,
// invisible, and left no way to ask for parallel work at all — a short
// sentence can describe a job for five agents.
type AgentMode = 'auto' | 'single' | 'multi';
const AGENT_LABEL: Record<AgentMode, string> = {
	auto: 'تلقائي',
	single: 'وكيل واحد',
	multi: 'تعدد وكلاء',
};
let agentMode: AgentMode = 'auto';

$('chip-agents').addEventListener('click', (e) => {
	const pick = (m: AgentMode) => () => {
		agentMode = m;
		$('chip-agents-label').textContent = AGENT_LABEL[m];
		$('chip-agents').classList.toggle('pinned', m !== 'auto');
	};
	openMenu(e.currentTarget as HTMLElement, [
		{
			label: AGENT_LABEL.auto,
			detail: 'يقرّر حسب حجم الطلب',
			checked: agentMode === 'auto',
			onPick: pick('auto'),
		},
		{
			label: AGENT_LABEL.single,
			detail: 'وكيل واحد ينفّذ كل شيء بالترتيب',
			checked: agentMode === 'single',
			onPick: pick('single'),
		},
		{
			label: AGENT_LABEL.multi,
			detail: 'مخطّط يوزّع المهمة، منفّذون يعملون بالتوازي، ثم مراجع',
			checked: agentMode === 'multi',
			onPick: pick('multi'),
		},
	], 'الوكلاء');
});

// null = no pin, i.e. the core's normal priority chain with automatic
// fallback. A pin is deliberately the exception: picking one provider turns
// fallback off, so the task runs where the user said or not at all.
const AUTO_LABEL = 'تلقائي (حسب الأولوية)';
let providerPin: { provider: string; model?: string } | null = null;

function setPin(pin: typeof providerPin): void {
	providerPin = pin;
	$('chip-model-label').textContent = pin ? `${pin.provider} · ${pin.model ?? ''}`.trim() : AUTO_LABEL;
	$('chip-model').classList.toggle('pinned', pin !== null);
	$('chip-model').title = pin
		? `مثبّت على ${pin.provider} — بلا تبديل تلقائي لمزود آخر`
		: 'يجرّب المزودين بالترتيب مع تبديل تلقائي';
}
setPin(null);

async function modelMenu(anchor: HTMLElement): Promise<void> {
	const res = await window.idexal.settings.load();
	const entries: MenuEntry[] = [
		{
			label: AUTO_LABEL,
			detail: 'يجرّب المزودين بالترتيب مع تبديل تلقائي',
			checked: providerPin === null,
			onPick: () => setPin(null),
		},
	];

	const data = res.ok ? (res.data as { providers?: Array<{ id?: string; model?: string; usable?: boolean }> }) : null;
	for (const p of data?.providers ?? []) {
		if (!p.id) continue;
		const id = p.id;
		entries.push({
			label: `${id} · ${p.model ?? ''}`,
			// Say plainly what pinning costs. A user who picks a local
			// provider for privacy must not discover only afterwards that
			// the app would have fallen back to a cloud API.
			detail: p.usable ? 'يُستخدم وحده — بلا تبديل تلقائي' : 'غير مهيأ — أضف مفتاحاً في الإعدادات',
			checked: providerPin?.provider === id,
			onPick: () => setPin({ provider: id, model: p.model }),
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
	row.addEventListener('click', () => void activateTask(rec.id));
	return row;
}

/**
 * Restore conversations from the core's session store so the sidebar
 * survives a restart. Their transcripts are loaded lazily on open —
 * replaying every message of every past task at startup would be a lot of
 * work for panes the user may never look at.
 */
async function restoreSessions(): Promise<void> {
	const res = await window.idexal.sessions.list();
	if (!res.ok || !Array.isArray(res.data)) return;
	const rows = res.data as Array<{ id?: string; title?: string }>;
	for (const row of rows) {
		if (!row.id || tasks.has(row.id)) continue;
		const log = document.createElement('div');
		log.style.display = 'contents';
		const plan = document.createElement('div');
		plan.style.display = 'contents';
		tasks.set(row.id, {
			id: row.id,
			title: row.title || row.id,
			state: 'done',
			log,
			plan,
			loaded: false,
		});
	}
	renderTaskList();
}

/** Render a stored transcript into a task's log the first time it's opened. */
async function loadTranscript(rec: TaskRecord): Promise<void> {
	if (rec.loaded) return;
	rec.loaded = true;
	const res = await window.idexal.sessions.show(rec.id);
	if (!res.ok || !Array.isArray(res.data)) return;

	for (const raw of res.data as Array<{ role?: string; content?: string; toolCalls?: string[]; toolCallId?: string }>) {
		if (raw.toolCallId) {
			// Tool results are replay noise in the UI — the tool-call line
			// above already says what ran.
			continue;
		}
		if (raw.role === 'user') {
			const el = document.createElement('div');
			el.className = 'msg-user';
			el.textContent = raw.content ?? '';
			rec.log.appendChild(el);
		} else if (raw.role === 'assistant') {
			if (raw.content?.trim()) {
				const wrap = document.createElement('div');
				wrap.className = 'msg-agent';
				const who = document.createElement('span');
				who.className = 'who';
				who.textContent = 'IDEXAL';
				const body = document.createElement('span');
				body.textContent = raw.content;
				wrap.append(who, body);
				rec.log.appendChild(wrap);
			}
			for (const name of raw.toolCalls ?? []) {
				const el = document.createElement('div');
				el.className = 'meta tool';
				el.textContent = `⚙ ${name}`;
				rec.log.appendChild(el);
			}
		}
	}
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

async function activateTask(id: string): Promise<void> {
	const rec = tasks.get(id);
	if (!rec) return;
	activeTaskId = id;
	await loadTranscript(rec);
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

/**
 * Start a task, or continue one when `existing` is given.
 *
 * Continuing passes the task id to the core as a session, so the model
 * sees the earlier turns — including its own tool calls and their results.
 * Without that a "follow-up" is a fresh agent with no idea what just
 * happened, which is not a conversation.
 */
function startTask(prompt: string, multi: boolean, existing?: TaskRecord): void {
	const rec: TaskRecord =
		existing ??
		(() => {
			const log = document.createElement('div');
			log.style.display = 'contents';
			const plan = document.createElement('div');
			plan.style.display = 'contents';
			const created: TaskRecord = {
				id: `t${Date.now()}`,
				title: prompt.length > 46 ? prompt.slice(0, 46) + '…' : prompt,
				state: 'running',
				log,
				plan,
			};
			tasks.set(created.id, created);
			return created;
		})();

	const id = rec.id;
	const log = rec.log;
	rec.state = 'running';
	renderTaskList();
	void activateTask(id);
	setTaskState('running');

	const user = document.createElement('div');
	user.className = 'msg-user';
	user.textContent = prompt;
	log.appendChild(user);
	scrollLog();

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
					// The badge is how the user learns an agent touched
					// files at all without going looking for it.
					void refreshUndo();
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
		// Sent for both modes, but it means different things in each. On the
		// single-agent path the core replays that conversation's history; on
		// the multi-agent path it does not — planner, executors and reviewer
		// are distinct agents and a shared transcript would be meaningless.
		// There it only groups the run's spend under one id in the ledger.
		id,
		providerPin ?? undefined,
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

// ───────────────────────── attach & skills ─────────────────────────
//
// Both of these were buttons that did nothing when clicked. A control that
// looks live and answers with silence is worse than no control at all.

/** Insert text at the caret rather than replacing what the user has typed. */
function insertIntoComposer(text: string): void {
	const start = composer.selectionStart ?? composer.value.length;
	const end = composer.selectionEnd ?? start;
	const before = composer.value.slice(0, start);
	const after = composer.value.slice(end);
	// Keep a space between what was there and what is added, without
	// doubling one that already exists.
	const glue = before && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '';
	composer.value = `${before}${glue}${text}${after}`;
	const caret = (before + glue + text).length;
	composer.setSelectionRange(caret, caret);
	composer.focus();
}

$('chip-attach').addEventListener('click', async () => {
	const result = (await window.idexal.workspace.pickFiles()) as {
		ok: boolean;
		files?: string[];
		skipped?: number;
		error?: string;
	};
	if (!result.ok) {
		openMenu($('chip-attach'), [{ label: result.error ?? 'تعذّر فتح المتصفّح', onPick: () => {} }], 'إرفاق');
		return;
	}
	if (!result.files?.length) return;
	// `@path` is the same reference the composer's placeholder advertises,
	// and the agent resolves it with its own file tools.
	insertIntoComposer(result.files.map((f) => `@${f}`).join(' '));
	if (result.skipped) {
		// Files outside the workspace cannot be read by the agent at all, so
		// silently dropping them would leave the user waiting on nothing.
		insertIntoComposer(`\n(تُجوهل ${result.skipped} ملفاً خارج مساحة العمل)`);
	}
});

interface SkillEntry { id: string; name: string; prompt: string }

$('nav-skills').addEventListener('click', async (e) => {
	const result = (await window.idexal.skills.list()) as { ok: boolean; skills?: SkillEntry[]; error?: string };
	const skills = result.skills ?? [];
	const entries: MenuEntry[] = skills.map((skill) => ({
		label: skill.name,
		detail: skill.prompt.slice(0, 60),
		onPick: () => {
			showView('home');
			insertIntoComposer(skill.prompt);
		},
	}));

	entries.push({
		label: '＋ احفظ ما في المؤلِّف كمهارة',
		detail: 'يحفظ النص الحالي لإعادة استخدامه',
		onPick: async () => {
			const prompt = composer.value.trim();
			if (!prompt) {
				showView('home');
				composer.focus();
				return;
			}
			const name = window.prompt('اسم المهارة:', prompt.slice(0, 30));
			if (!name?.trim()) return;
			await window.idexal.skills.save({ name: name.trim(), prompt });
		},
	});
	if (skills.length) {
		entries.push({
			label: '🗑 احذف مهارة…',
			onPick: () =>
				openMenu(
					e.currentTarget as HTMLElement,
					skills.map((skill) => ({
						label: skill.name,
						onPick: () => void window.idexal.skills.remove(skill.id),
					})),
					'احذف مهارة',
				),
		});
	}
	openMenu(e.currentTarget as HTMLElement, entries, 'المهارات');
});

// The rail opens the automations page in settings, which is where the
// scheduler's own state lives.
$('nav-automations').addEventListener('click', () => {
	window.__idexalOpenSettings?.();
	document.querySelector<HTMLElement>('.set-nav-item[data-setnav="automations"]')?.click();
});

// ───────────────────────── composer wiring ─────────────────────────

const composer = $<HTMLTextAreaElement>('composer-input');

function submitComposer(): void {
	const text = composer.value.trim();
	if (!text) return;
	composer.value = '';
	// 'auto' keeps the old length heuristic, but only as the default the
	// user can now override — the chip is what decides.
	startTask(text, agentMode === 'multi' || (agentMode === 'auto' && text.length > 60));
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
	// Continue the open task rather than starting a new one — this is a
	// follow-up, and the core replays the session so the model still has
	// the earlier turns.
	const current = activeTaskId ? tasks.get(activeTaskId) : undefined;
	startTask(text, false, current);
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
		onPick: () => void activateTask(t.id),
	}));
	openMenu(
		e.currentTarget as HTMLElement,
		entries.length ? entries : [{ label: 'لا مهام بعد', onPick: () => showView('home') }],
		'المهام',
	);
});

// Skills used to share this rail's "not built yet" placeholder; it now has
// a real implementation above, and Automations keeps its own honest notice
// there. A second listener here would fire after it and replace the menu.

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
		// The margin exists so breakpoints have somewhere to live and
		// somewhere to be clicked. `lineDecorationsWidth` must be set
		// explicitly: without a width the decorations margin is laid out at
		// zero, Monaco renders no `.lines-decorations` element at all, and a
		// breakpoint decoration that exists on the model draws nothing.
		glyphMargin: true,
		lineDecorationsWidth: 14,
	});
	editor.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.KeyS, () => void saveActive());
	// Clicking the gutter toggles a breakpoint on that line, the way every
	// debugger does it.
	editor.onMouseDown((e) => {
		if (e.target.type !== api.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
		const line = e.target.position?.lineNumber;
		if (line && activeTab) void toggleBreakpoint(activeTab, line);
	});
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
	// Breakpoints outlive the tab they were set in, so restore their markers.
	renderBreakpointGutter(filePath);
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

// ───────────────────────── debugger ─────────────────────────
//
// Breakpoints live here, not in the main process, because they belong to the
// editor: the user sets them by clicking the gutter whether or not anything
// is running, and they must survive between sessions.

interface DebugStackFrame { name: string; url: string; line: number }
interface DebugVariable { scope: string; name: string; value: string }

/** file → set of 1-based lines. */
const breakpoints = new Map<string, Set<number>>();
let debugRunning = false;
let debugSession: { stop: () => void } | null = null;
/** Monaco decoration ids per file, so a toggle can remove exactly its own. */
const bpDecorations = new Map<string, string[]>();

function breakpointList(): Array<{ file: string; line: number }> {
	const out: Array<{ file: string; line: number }> = [];
	for (const [file, lines] of breakpoints) for (const line of lines) out.push({ file, line });
	return out;
}

function renderBreakpointGutter(file: string): void {
	const tab = openTabs.get(file);
	if (!tab || !monacoApi) return;
	const lines = [...(breakpoints.get(file) ?? [])];
	// `linesDecorationsClassName`, not `glyphMarginClassName`: the glyph
	// margin widgets never rendered here — the container stayed empty even
	// for a decoration applied straight through the editor API — while the
	// lines-decorations margin draws reliably. The click target is still the
	// glyph margin, which is why that option stays on.
	const decorations = lines.map((line) => ({
		range: new monacoApi!.Range(line, 1, line, 1),
		options: { isWholeLine: false, linesDecorationsClassName: 'bp-glyph' },
	}));
	bpDecorations.set(file, tab.model.deltaDecorations(bpDecorations.get(file) ?? [], decorations));
}

async function toggleBreakpoint(file: string, line: number): Promise<void> {
	const lines = breakpoints.get(file) ?? new Set<number>();
	if (lines.has(line)) lines.delete(line);
	else lines.add(line);
	if (lines.size) breakpoints.set(file, lines);
	else breakpoints.delete(file);
	renderBreakpointGutter(file);
	renderBreakpointList();
	// A live session takes new breakpoints immediately; otherwise they are
	// handed over when the next run starts.
	if (debugRunning && lines.has(line)) await window.idexal.debug.setBreakpoint(file, line);
}

function renderBreakpointList(): void {
	const host = $('debug-breakpoints');
	host.innerHTML = '';
	const all = breakpointList();
	if (all.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'لا نقاط توقف — انقر هامش المحرِّر.';
		host.appendChild(empty);
		return;
	}
	for (const bp of all.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
		const row = document.createElement('div');
		row.className = 'dbg-row';
		const name = document.createElement('span');
		name.className = 'dbg-fn';
		name.textContent = `${bp.file}:${bp.line}`;
		const remove = document.createElement('button');
		remove.className = 'mini-btn';
		remove.textContent = '×';
		remove.title = 'إزالة';
		remove.addEventListener('click', () => void toggleBreakpoint(bp.file, bp.line));
		row.append(name, remove);
		host.appendChild(row);
	}
}

function setDebugButtons(paused: boolean): void {
	for (const id of ['debug-continue', 'debug-over', 'debug-into', 'debug-out']) {
		$<HTMLButtonElement>(id).disabled = !paused;
	}
	$<HTMLButtonElement>('debug-stop').disabled = !debugRunning;
	$<HTMLButtonElement>('debug-run').disabled = debugRunning;
}

function debugSay(text: string): void {
	const out = $('debug-output');
	out.appendChild(document.createTextNode(text.endsWith('\n') ? text : text + '\n'));
	out.scrollTop = out.scrollHeight;
}

function renderStack(stack: DebugStackFrame[]): void {
	const host = $('debug-stack');
	host.innerHTML = '';
	for (const frame of stack) {
		const row = document.createElement('div');
		row.className = 'dbg-row';
		const name = document.createElement('span');
		name.className = 'dbg-fn';
		name.textContent = frame.name;
		const where = document.createElement('span');
		where.className = 'dbg-where';
		// Only the file name: the absolute path is noise in a narrow column.
		where.textContent = `${frame.url.split('/').pop() ?? ''}:${frame.line}`;
		row.append(name, where);
		host.appendChild(row);
	}
}

function renderVariables(vars: DebugVariable[]): void {
	const host = $('debug-vars');
	host.innerHTML = '';
	for (const v of vars) {
		const row = document.createElement('div');
		row.className = 'dbg-row';
		const name = document.createElement('span');
		name.className = 'dbg-name';
		name.textContent = v.name;
		const value = document.createElement('span');
		value.className = 'dbg-value';
		// Functions arrive as their whole source; one line is all that fits.
		value.textContent = v.value.split('\n')[0].slice(0, 120);
		value.title = v.value;
		row.append(name, value);
		host.appendChild(row);
	}
}

/** Move the editor to the paused line so the user sees where they are. */
function revealPaused(frame: DebugStackFrame | undefined): void {
	if (!frame || !editor) return;
	const name = frame.url.split('/').pop();
	const match = [...openTabs.keys()].find((p) => p.split('/').pop() === name);
	if (!match) return;
	if (activeTab !== match) activateTab(match);
	editor.revealLineInCenter(frame.line);
	editor.setPosition({ lineNumber: frame.line, column: 1 });
}

function onDebugEvent(name: string, payload: unknown): void {
	const p = (payload ?? {}) as Record<string, unknown>;
	switch (name) {
		case 'started':
			debugRunning = true;
			$('debug-state').textContent = 'يعمل…';
			setDebugButtons(false);
			break;
		case 'breakpoint':
			debugSay(
				p.bound
					? `● نقطة توقف مثبّتة: ${p.file}:${p.line}`
					: `○ تعذّر تثبيت نقطة التوقف ${p.file}:${p.line}`,
			);
			break;
		case 'paused': {
			const stack = (p.stack ?? []) as DebugStackFrame[];
			$('debug-state').textContent = `متوقف — ${String(p.reason ?? '')}`;
			renderStack(stack);
			renderVariables((p.variables ?? []) as DebugVariable[]);
			revealPaused(stack[0]);
			setDebugButtons(true);
			break;
		}
		case 'resumed':
			$('debug-state').textContent = 'يعمل…';
			setDebugButtons(false);
			break;
		case 'output':
			debugSay(String(p.text ?? ''));
			break;
		case 'terminated':
			debugRunning = false;
			$('debug-state').textContent = `انتهى (${String(p.reason ?? '')}${p.code !== null && p.code !== undefined ? ` · رمز ${p.code}` : ''})`;
			renderStack([]);
			renderVariables([]);
			setDebugButtons(false);
			debugSession?.stop();
			debugSession = null;
			break;
	}
}

$('debug-run').addEventListener('click', async () => {
	if (debugRunning || !activeTab) {
		if (!activeTab) debugSay('افتح ملفاً أولاً.');
		return;
	}
	$('debug-output').textContent = '';
	debugSay(`▶ ${activeTab}`);
	const session = window.idexal.debug.start(activeTab, breakpointList(), onDebugEvent);
	debugSession = session;
	const result = (await session.done) as { ok: boolean; error?: string };
	if (!result.ok) {
		debugSay(`⚠ ${result.error ?? 'تعذّر بدء التصحيح'}`);
		debugRunning = false;
		session.stop();
		debugSession = null;
		setDebugButtons(false);
	}
});
$('debug-continue').addEventListener('click', () => void window.idexal.debug.cont());
$('debug-over').addEventListener('click', () => void window.idexal.debug.stepOver());
$('debug-into').addEventListener('click', () => void window.idexal.debug.stepInto());
$('debug-out').addEventListener('click', () => void window.idexal.debug.stepOut());
$('debug-stop').addEventListener('click', () => void window.idexal.debug.stop());

// ───────────────────────── checkpoints / undo ─────────────────────────
//
// The core snapshots a file before every write an agent makes, and
// `restore` CONSUMES the snapshot it restores — so undo walks backwards one
// step per click rather than jumping to the beginning. None of this is git:
// it works in a folder that was never a repository, and it never touches
// the user's staged changes.

interface Snapshot {
	path: string;
	takenAt: number;
	/** The agent created this file; undoing therefore deletes it. */
	created: boolean;
}

let snapshots: Snapshot[] = [];

/** After an undo the file on disk changed underneath any open tab. Leaving
 *  it showing the old text is the dangerous case: the next Ctrl+S would
 *  quietly re-apply exactly what was just undone. */
async function syncTabsAfterUndo(paths: string[]): Promise<void> {
	for (const path of paths) {
		const tab = openTabs.get(path);
		if (!tab) continue;
		const result = await window.idexal.workspace.read(path);
		if (result.ok && result.content !== undefined) {
			tab.model.setValue(result.content);
			tab.dirty = false;
		} else {
			// Undoing a created file deletes it; a tab onto a file that no
			// longer exists can only mislead.
			closeTab(path);
		}
	}
	renderTabs();
	void renderTree();
	void refreshGit();
}

function undoRow(snapshot: Snapshot): HTMLElement {
	const row = document.createElement('div');
	row.className = 'undo-row';

	const kind = document.createElement('span');
	kind.className = `undo-kind ${snapshot.created ? 'created' : 'edited'}`;
	kind.textContent = snapshot.created ? 'أُنشئ' : 'عُدّل';
	kind.title = snapshot.created
		? 'أنشأه الوكيل — التراجع سيحذفه'
		: 'عدّله الوكيل — التراجع يعيد النسخة السابقة';

	const name = document.createElement('span');
	name.className = 'undo-path';
	name.textContent = snapshot.path;
	name.title = snapshot.path;
	name.addEventListener('click', () => void openFile(snapshot.path));

	const when = document.createElement('span');
	when.className = 'undo-time';
	when.textContent = new Date(snapshot.takenAt).toLocaleTimeString('ar-EG', {
		hour: '2-digit',
		minute: '2-digit',
	});

	const button = document.createElement('button');
	button.className = 'mini-btn';
	button.textContent = snapshot.created ? 'حذف (تراجع)' : 'تراجع';
	button.addEventListener('click', async () => {
		button.disabled = true;
		const result = await window.idexal.undo.restore(snapshot.path);
		const restored = (result.data as { restored?: string[] } | undefined)?.restored ?? [];
		if (result.ok) await syncTabsAfterUndo(restored.length ? restored : [snapshot.path]);
		await refreshUndo();
	});

	row.append(kind, name, when, button);
	return row;
}

async function refreshUndo(): Promise<void> {
	const host = $('undo-list');
	const result = await window.idexal.undo.list();
	snapshots = Array.isArray(result.data) ? (result.data as Snapshot[]) : [];

	const badge = $('undo-count');
	badge.textContent = String(snapshots.length);
	badge.classList.toggle('hidden', snapshots.length === 0);

	host.innerHTML = '';
	if (!result.ok) {
		const err = document.createElement('div');
		err.className = 'sb-empty';
		err.textContent = result.error ?? 'تعذّرت قراءة اللقطات';
		host.appendChild(err);
		return;
	}
	if (snapshots.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'sb-empty';
		empty.textContent = 'لا لقطات — لم يعدّل أي وكيل ملفاً في هذه المساحة بعد.';
		host.appendChild(empty);
		return;
	}
	// Newest first: the most likely thing to undo is the last thing that happened.
	for (const snapshot of [...snapshots].sort((a, b) => b.takenAt - a.takenAt)) {
		host.appendChild(undoRow(snapshot));
	}
}

$('undo-refresh').addEventListener('click', () => void refreshUndo());

$('undo-all').addEventListener('click', async () => {
	if (snapshots.length === 0) return;
	const result = await window.idexal.undo.restore();
	const restored = (result.data as { restored?: string[] } | undefined)?.restored ?? [];
	if (result.ok) await syncTabsAfterUndo(restored);
	await refreshUndo();
});

$('undo-clear').addEventListener('click', async () => {
	if (snapshots.length === 0) return;
	// Throwing away every snapshot cannot be undone — it is the one action
	// here with no way back, so it asks first, like committing does.
	const ok = confirm(
		`مسح ${snapshots.length} لقطة نهائياً؟\n\nلن يتغيّر أي ملف الآن، لكن لن يعود بالإمكان التراجع عمّا فعله الوكلاء.`,
	);
	if (!ok) return;
	await window.idexal.undo.clear();
	await refreshUndo();
});

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

	// Commit bar: message + a commit button that always confirms first.
	const bar = document.createElement('div');
	bar.className = 'git-commit-bar';
	const msg = document.createElement('input');
	msg.type = 'text';
	msg.placeholder = 'رسالة الإيداع…';
	msg.className = 'git-msg';
	msg.value = commitMessage;
	msg.addEventListener('input', () => (commitMessage = msg.value));
	const commitBtn = document.createElement('button');
	commitBtn.className = 'mini-btn';
	const stagedCount = files.filter((f) => f.staged).length;
	commitBtn.textContent = `إيداع (${stagedCount})`;
	commitBtn.disabled = stagedCount === 0;
	commitBtn.addEventListener('click', () => void doCommit(stagedCount));
	msg.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && stagedCount > 0) void doCommit(stagedCount);
	});
	bar.append(msg, commitBtn);
	panel.appendChild(bar);

	for (const file of files) {
		const row = document.createElement('div');
		row.className = 'git-row' + (file.staged ? ' staged' : '');

		const toggle = document.createElement('button');
		toggle.className = 'git-toggle';
		toggle.title = file.staged ? 'إلغاء الإضافة' : 'إضافة للإيداع';
		toggle.textContent = file.staged ? '−' : '+';
		toggle.addEventListener('click', async (e) => {
			e.stopPropagation();
			const op = file.staged ? window.idexal.git.unstage : window.idexal.git.stage;
			const res = await op(file.path);
			if (!res.ok) setGitNote(res.error ?? 'فشلت العملية', false);
			await refreshGit();
		});

		const state = document.createElement('span');
		state.className = `state ${file.state.replace(/[^A-Za-z]/g, '') || 'U'}`;
		state.textContent = file.state || '?';
		const p = document.createElement('span');
		p.className = 'path';
		p.textContent = file.path;
		row.append(toggle, state, p);
		row.addEventListener('click', () => void showDiff(file.path));
		panel.appendChild(row);
	}

	if (gitNote) {
		const note = document.createElement('div');
		note.className = `git-note${gitNoteOk ? '' : ' err'}`;
		note.textContent = gitNote;
		panel.appendChild(note);
	}
}

let commitMessage = '';
let gitNote = '';
let gitNoteOk = true;

function setGitNote(text: string, ok = true): void {
	gitNote = text;
	gitNoteOk = ok;
}

/** Commit staged files — always behind an explicit confirmation, because
 *  writing to someone's repository must never be a single misclick. */
async function doCommit(stagedCount: number): Promise<void> {
	const message = commitMessage.trim();
	if (!message) {
		setGitNote('اكتب رسالة إيداع أولاً', false);
		await refreshGit();
		return;
	}
	const confirmed = window.confirm(
		`سيتم إيداع ${stagedCount} ملف بالرسالة:\n\n${message}\n\nمتابعة؟`,
	);
	if (!confirmed) return;

	const res = await window.idexal.git.commit(message);
	if (res.ok) {
		commitMessage = '';
		setGitNote('✓ تم الإيداع');
	} else {
		setGitNote(res.error ?? 'فشل الإيداع', false);
	}
	await refreshGit();
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
	tab.addEventListener('click', () => {
		const which = tab.dataset.dock!;
		selectDock(which);
		// Snapshots appear as agents work, so the list is read when opened
		// rather than trusted from whenever it was last drawn.
		if (which === 'undo') void refreshUndo();
	});
}
$('dock-toggle').addEventListener('click', () => {
	const dock = $('dock');
	dock.classList.toggle('collapsed');
	$('dock-toggle').textContent = dock.classList.contains('collapsed') ? '▴' : '▾';
});

// ───────────────────────── terminal ─────────────────────────

// A real PTY emits escape sequences for colour, cursor movement and full
// screen redraws, so the pane needs a terminal emulator rather than a text
// node. xterm.js parses the stream and owns the keyboard: what the user
// types goes to the shell byte for byte, Ctrl-C included.

const TERMINAL_ID = 'main';
const termHost = $('terminal-output');
let terminalStarted = false;

// The palette is read from the app's own CSS variables so the terminal is
// the same dark theme as everything else, not xterm's defaults.
const rootStyle = getComputedStyle(document.documentElement);
const themeVar = (name: string): string => rootStyle.getPropertyValue(name).trim();

const term = new Terminal({
	fontFamily: themeVar('--mono'),
	fontSize: 12,
	cursorBlink: true,
	scrollback: 5000,
	theme: {
		background: themeVar('--bg-side'),
		foreground: themeVar('--ink-soft'),
		cursor: themeVar('--accent-2'),
		cursorAccent: themeVar('--bg-side'),
		selectionBackground: themeVar('--bg-hover'),
		black: themeVar('--bg'),
		red: themeVar('--danger'),
		green: themeVar('--accent-2'),
		yellow: themeVar('--warn'),
		blue: themeVar('--accent'),
		white: themeVar('--ink'),
		brightBlack: themeVar('--ink-faint'),
	},
});
const termFit = new FitAddon();
term.loadAddon(termFit);
term.open(termHost);

function fitTerminal(): void {
	// A hidden pane measures 0, and fitting to that would resize the shell
	// to nothing.
	if (!termHost.offsetWidth || !termHost.offsetHeight) return;
	termFit.fit();
}

function ensureTerminal(): void {
	if (terminalStarted) return;
	terminalStarted = true;
	// The shell should be born at the size it will be drawn at, not at the
	// 80x24 default it would otherwise print its first prompt into.
	fitTerminal();
	window.idexal.terminal.start(
		TERMINAL_ID,
		(data) => term.write(data),
		(code) => {
			term.write(`\r\n[انتهت الجلسة، رمز ${code ?? '?'} — انقر لبدء جلسة جديدة]\r\n`);
			terminalStarted = false;
		},
		{ cols: term.cols, rows: term.rows },
	);
}

// Two sources change the grid size: the window and the dock.
new ResizeObserver(() => {
	if (!termHost.offsetWidth || !termHost.offsetHeight) return;
	fitTerminal();
	// First non-zero measurement means the dock just became visible: an
	// empty terminal pane is useless, so the shell starts with it.
	ensureTerminal();
}).observe(termHost);

// ResizeObserver callbacks are only delivered while the window is painting.
// An app sitting behind another window can therefore miss every layout
// change and keep an 80x24 grid over a much wider pane — observed. Refit
// when the window is looked at again.
window.addEventListener('focus', fitTerminal);
document.addEventListener('visibilitychange', fitTerminal);

// Only fires when the grid actually changed, so the PTY is told once per
// real size change rather than once per layout pass.
term.onResize(({ cols, rows }) => void window.idexal.terminal.resize(TERMINAL_ID, cols, rows));
term.onData((data) => {
	ensureTerminal();
	void window.idexal.terminal.write(TERMINAL_ID, data);
});
termHost.addEventListener('mousedown', ensureTerminal);

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
void restoreSessions();
