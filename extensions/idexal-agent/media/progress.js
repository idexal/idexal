/* Idexal Agent — live progress WebView renderer
 * Receives `{type:'snapshot', state}` (full rebuild) and
 * `{type:'event', op}` (incremental card ops) from the extension, and
 * renders the plan checklist + animated activity cards. Safe under the
 * strict CSP in the host page (no inline scripts). */

// eslint-disable-next-line no-undef
const vscode = acquireVsCodeApi();

/** @typedef {import('./progressWebview').ProgressState} ProgressState */

const $ = (sel) => document.querySelector(sel);

const taskTitle = $('#task-title');
const modeBadge = $('#mode-badge');
const statusPill = $('#status-pill');
const providersEl = $('#providers');	const planEl = $('#plan');
	const feedEl = $('#feed');
	let planCountEl = null; // `.plan-head .count`, set by renderPlan
const streamWrap = $('#stream-wrap');
const streamEl = $('#stream');
const emptyEl = $('#empty');
const cancelBtn = $('#cancel');
const clearBtn = $('#clear');

/** @type {Map<string, HTMLElement>} card-id → element (for updates) */	const cardEls = new Map();
	/** Terminal card-id → its persistent <pre class="output"> element. */
	const termOutputs = new Map();

const MODE_LABELS = { task: 'task', plan: 'plan', review: 'review', fix: 'fix' };
const STEP_ICON = {
	pending: '○',
	running: '◌',
	done: '✓',
	failed: '✗',
};
const STEP_CLASS = {
	pending: 'pending',
	running: 'running',
	done: 'done',
	failed: 'failed',
};

function setStatus(kind, label) {
	statusPill.className = 'pill ' + kind;
	statusPill.textContent = label;
	document.body.dataset.running = kind === 'running' ? 'true' : 'false';
	cancelBtn.disabled = kind !== 'running';
}

function setTask(task) {
	taskTitle.textContent = task || 'Idexal Agent';
	document.title = task ? `Idexal — ${task}` : 'Idexal — Live Progress';
}

function setMode(mode) {
	modeBadge.textContent = MODE_LABELS[mode] ?? mode ?? 'task';
}

function renderProviders(providers) {
	providersEl.textContent = '';
	for (const p of providers) {
		const chip = document.createElement('span');
		chip.className = 'provider-chip';
		chip.textContent = p;
		providersEl.appendChild(chip);
	}
}

/* ---------------- Plan checklist ---------------- */

function renderPlan(steps) {
	planEl.classList.remove('hidden');
	planEl.textContent = '';		const head = document.createElement('div');
		head.className = 'plan-head';
		head.innerHTML = '📋 Plan <span class="count"></span>';
		planCountEl = head.querySelector('.count');
		planEl.appendChild(head);

		const ol = document.createElement('ol');
		planEl.appendChild(ol);

		for (const step of steps) {
			const li = document.createElement('li');
			li.className = 'step ' + (STEP_CLASS[step.status] ?? 'pending');
			li.dataset.stepId = String(step.id);
			li.innerHTML = `<span class="icon">${STEP_ICON[step.status] ?? '○'}</span>
				<div class="body">
					<div class="desc"></div>
					<div class="sub"></div>
				</div>`;
			li.querySelector('.desc').textContent = `Step ${step.id}: ${step.description}`;
			ol.appendChild(li);
		}

		// Apply any results that arrived with the steps.
		for (const step of steps) applyStep(step, false);
	}

function applyStep(step, animate) {
	const li = planEl.querySelector(`.step[data-step-id="${step.id}"]`);
	if (!li) return;
	li.className = 'step ' + (STEP_CLASS[step.status] ?? 'pending');
	li.querySelector('.icon').textContent = STEP_ICON[step.status] ?? '○';

	const sub = li.querySelector('.sub');
	sub.textContent = '';
	if (step.assignee) {
		const tag = document.createElement('span');
		tag.className = 'assignee';
		tag.textContent = step.assignee;
		sub.appendChild(tag);
	}
	if (step.result) {
		if (sub.textContent) sub.appendChild(document.createTextNode('  '));
		sub.appendChild(document.createTextNode(step.result.slice(0, 400)));
	}

	// Keep the header counter in sync with actual DOM state (done/failed).
	if (planCountEl) {
		const done = planEl.querySelectorAll('.step.done, .step.failed').length;
		const total = planEl.querySelectorAll('.step').length;
		if (total > 0) planCountEl.textContent = `${done}/${total} done`;
	}

	if (animate && step.status === 'done') {
		li.animate([{ transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], {
			duration: 250,
			easing: 'ease-out',
		});
	}
}

/* ---------------- Activity cards ---------------- */

function statusChip(status) {
	if (!status) return '';
	const labels = { running: 'running', done: 'done', failed: 'failed', ok: 'ok', fix: 'fix' };
	return `<span class="status-chip ${status}">${labels[status] ?? status}</span>`;
}

function emojiFor(kind, status) {
	switch (kind) {
		case 'agent':
			return status === 'done' ? '🤖' : '🤖';
		case 'tool':
			return status === 'failed' ? '⚙️' : '⚙️';
		case 'review':
			return status === 'fix' ? '🔍' : '🔍';
		case 'terminal':
			return '🖥️';
		case 'provider':
			return '⇄';
		case 'usage':
			return '📊';
		default:
			return '•';
	}
}

function createCard(card) {
	const el = document.createElement('div');
	el.className = `card kind-${card.kind} ${card.status === 'ok' ? 'ok' : ''} ${card.status === 'failed' ? 'failed' : ''}`;
	el.dataset.cardId = card.id;
	el.innerHTML = `<div class="card-row">
			<span class="emoji">${emojiFor(card.kind, card.status)}</span>
			<span class="title"></span>
			${statusChip(card.status)}
			<span class="time"></span>
		</div>`;
	el.querySelector('.title').textContent = card.title;
	el.querySelector('.time').textContent = new Date().toLocaleTimeString();
	feedEl.appendChild(el);
	cardEls.set(card.id, el);
	applyCardDetail(card);
	el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	return el;
}

function applyCardDetail(card) {
	const el = cardEls.get(card.id);
	if (!el) return;

	el.className = `card kind-${card.kind} ${card.status === 'ok' ? 'ok' : ''} ${card.status === 'failed' ? 'failed' : ''}`;
	const row = el.querySelector('.card-row');
	row.querySelector('.emoji').textContent = emojiFor(card.kind, card.status);
	row.querySelector('.title').textContent = card.title;

	// Replace the status chip (recreate for animated transition).
	row.querySelector('.status-chip')?.remove();
	row.insertAdjacentHTML('beforeend', statusChip(card.status));			// Remove stale detail/result containers, then re-add. Terminal output
			// is handled separately: its element persists so chunks append
			// instead of flickering (see the terminal branch below).
			el.querySelectorAll('.detail, .tool-result').forEach((n) => n.remove());

	if (card.kind === 'tool') {
		if (card.output !== undefined) {
			const res = document.createElement('div');
			const ok = card.status === 'ok';
			res.className = 'tool-result ' + (ok ? 'ok' : 'failed');
			res.innerHTML = `<span class="mark">${ok ? '✓' : '✗'}</span><span class="text"></span>`;
			res.querySelector('.text').textContent =
				card.output.length > 400 ? card.output.slice(0, 400) + '…' : card.output;
			el.appendChild(res);
		} else if (card.status === 'running') {
			const res = document.createElement('div');
			res.className = 'tool-result running';
			res.innerHTML = `<span class="mark">⚙</span><span class="text">working…</span>`;
			el.appendChild(res);
		}
	} else if (card.kind === 'agent' && card.detail) {
		const d = document.createElement('div');
		d.className = 'detail';
		d.textContent = card.detail.slice(0, 600);
		el.appendChild(d);		} else if (card.kind === 'terminal') {
			// Persistent output element: reuse it across updates so chunks are
			// appended (no re-create → no flicker, and the user's scroll stays
			// put unless they were already at the bottom, where we follow).
			let out = termOutputs.get(card.id);
			const hadOutput = Boolean(out);
			if (!out) {
				out = document.createElement('div');
				out.className = 'output';
				el.appendChild(out);
				termOutputs.set(card.id, out);
			}
			const wasNearBottom = !hadOutput || out.scrollHeight - out.scrollTop - out.clientHeight < 40;
			out.textContent = (card.output ?? '').slice(-2500);
			if (wasNearBottom) out.scrollTop = out.scrollHeight;

			const exit = card.exitCode;
			if (exit !== undefined && exit !== null) {
				const d = document.createElement('div');
				d.className = 'detail';
				d.textContent = `exit code ${exit}`;
				el.appendChild(d);
			}
		} else if (card.detail) {
		const d = document.createElement('div');
		d.className = 'detail';
		d.textContent = card.detail.slice(0, 500);
		el.appendChild(d);
	}
}

function renderUsage(usage) {
	const el = document.createElement('div');
	el.className = 'card kind-usage';
	el.innerHTML = `<div class="card-row">
			<span class="emoji">📊</span>
			<span class="title"></span>
			<span class="time"></span>
		</div>`;
	el.querySelector('.title').textContent =
		`${usage.calls} calls (${usage.failed} failed) · ${usage.inputTokens}/${usage.outputTokens} tokens · $${usage.costUsd.toFixed(4)} · avg ${usage.avgLatencyMs}ms`;
	el.querySelector('.time').textContent = new Date().toLocaleTimeString();
	feedEl.appendChild(el);
	el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ---------------- Finish banner ---------------- */

function renderFinish(status, summary, error) {
	feedEl.querySelectorAll('.finish').forEach((n) => n.remove());
	const el = document.createElement('div');
	el.className = 'finish ' + status;
	const labels = { done: '✅ Task completed', failed: '❌ Task failed', cancelled: '⚠️ Task cancelled' };
	el.innerHTML = `<div class="head">${labels[status] ?? status}</div><div class="text"></div>`;
	el.querySelector('.text').textContent = summary ?? error ?? '';
	feedEl.appendChild(el);
	setStatus(status, labels[status] ?? status);
	el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ---------------- Stream ---------------- */

function appendStream(text) {
	if (!text) return;
	streamWrap.classList.remove('hidden');
	streamEl.textContent = (streamEl.textContent + text).slice(-4000);
	streamEl.scrollTop = streamEl.scrollHeight;
}

/* ---------------- Ops ---------------- */

function applyOp(op) {
	switch (op.type) {
		case 'meta':
			setTask(op.task);
			setMode(op.mode);
			if (!op.task) emptyEl.classList.remove('hidden');
			else emptyEl.classList.add('hidden');
			break;
		case 'providers':
			renderProviders(op.providers);
			break;
		case 'plan':
			renderPlan(op.steps);
			break;
		case 'step':
			applyStep(op.step, true);
			break;
		case 'add':
			createCard(op.card);
			break;
		case 'update':
			cardEls.get(op.id) && applyCardDetail({ ...op.patch, id: op.id });
			break;
		case 'stream':
			appendStream(op.text);
			break;
		case 'usage':
			renderUsage(op.usage);
			break;
		case 'finish':
			if (op.status === 'cancelled' && !op.summary && !op.error) {
				renderFinish('cancelled');
			} else {
				renderFinish(op.status, op.summary, op.error);
			}
			break;
	}
}

/* ---------------- Full snapshot ---------------- */	function renderSnapshot(state) {
		// Reset DOM.
		cardEls.clear();
		termOutputs.clear();
		feedEl.textContent = '';
	streamEl.textContent = '';
	streamWrap.classList.add('hidden');
	planEl.classList.add('hidden');
	emptyEl.classList.toggle('hidden', Boolean(state.task) || state.cards.length > 0);

	setTask(state.task);
	setMode(state.mode);
	renderProviders(state.providers);
	document.body.dataset.running = state.running ? 'true' : 'false';

	if (state.plan.length) {
		renderPlan(state.plan);
	} else {
		planEl.classList.add('hidden');
	}

	for (const card of state.cards) {
		createCard(card);
	}

	if (state.usage) renderUsage(state.usage);
	if (state.streamText) {
		streamWrap.classList.remove('hidden');
		streamEl.textContent = state.streamText;
		streamEl.scrollTop = streamEl.scrollHeight;
	}

	if (state.cancelled) {
		renderFinish('cancelled');
	} else if (state.error) {
		renderFinish('failed', undefined, state.error);
	} else if (state.summary) {
		renderFinish('done', state.summary);
	} else if (state.running) {
		setStatus('running', 'running');
	} else {
		setStatus('idle', 'idle');
	}
}

/* ---------------- Messages ---------------- */

window.addEventListener('message', (event) => {
	const msg = event.data;
	if (!msg) return;
	if (msg.type === 'snapshot' && msg.state) {
		renderSnapshot(msg.state);
	} else if (msg.type === 'event' && msg.op) {
		applyOp(msg.op);
	}
});

/* ---------------- Buttons ---------------- */

cancelBtn.addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));
clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));

/* ---------------- Init ---------------- */

setStatus('idle', 'idle');
setTask('');
setMode('task');
