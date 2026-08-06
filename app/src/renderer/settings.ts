// Idexal — settings page (renderer)
//
// The full settings surface: provider manager + agent tuning. Loads from the
// core's effective config (settings:load → idexal-core config), persists via
// settings:save, and tests connectivity per provider via settings:test-provider.
//
// Security: the core never sends API keys — only `hasKey`. A literal key the
// user types is sent on save but never echoed back.

interface ProviderDraft {
	id: string;
	type: 'anthropic' | 'openai-compatible';
	baseUrl: string;
	model: string;
	priority: number;
	enabled: boolean;
	apiKeyEnv: string;
	/** Literal key typed by the user — only included on save when non-empty. */
	apiKey: string;
	hasKey: boolean;
	local: boolean;
	usable: boolean;
	headers: string; // JSON text
	extraBody: string; // JSON text
}

interface AgentDraft {
	maxToolRounds: number;
	useReviewer: boolean;
	maxParallelAgents: number;
}

interface LoadedProvider {
	id?: string;
	type?: string;
	baseUrl?: string;
	model?: string;
	priority?: number;
	enabled?: boolean;
	apiKeyEnv?: string | null;
	hasKey?: boolean;
	local?: boolean;
	usable?: boolean;
	headers?: Record<string, string>;
	extraBody?: Record<string, unknown>;
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const page = $('settings-page');
const listEl = $('providers-list');
const statusEl = $('settings-status');

let providers: ProviderDraft[] = [];
let agent: AgentDraft = { maxToolRounds: 12, useReviewer: true, maxParallelAgents: 3 };
let saving = false;

function setStatus(text: string, ok = true): void {
	statusEl.textContent = text;
	statusEl.classList.toggle('err', !ok);
}

function emptyProvider(): ProviderDraft {
	return {
		id: '',
		type: 'openai-compatible',
		baseUrl: '',
		model: '',
		priority: 100,
		enabled: true,
		apiKeyEnv: '',
		apiKey: '',
		hasKey: false,
		local: false,
		usable: false,
		headers: '{}',
		extraBody: '{}',
	};
}

function parseJson(text: string): Record<string, unknown> {
	try {
		const v = JSON.parse(text);
		return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
	} catch {
		return {};
	}
}

// ---------------------------------------------------------------------------
// Load + render
// ---------------------------------------------------------------------------

async function loadSettings(): Promise<void> {
	const result = await window.idexal.settings.load();
	if (!result.ok || !result.data) {
		setStatus(result.error ?? 'تعذّر تحميل الإعدادات', false);
		return;
	}
	const data = result.data as {
		providers?: LoadedProvider[];
		agent?: { maxToolRounds?: number; useReviewer?: boolean; maxParallelAgents?: number };
		configPath?: string | null;
	};

	providers = (data.providers ?? []).map((p) => ({
		id: String(p.id ?? ''),
		type: p.type === 'anthropic' ? 'anthropic' : 'openai-compatible',
		baseUrl: String(p.baseUrl ?? ''),
		model: String(p.model ?? ''),
		priority: Number(p.priority ?? 100),
		enabled: p.enabled !== false,
		apiKeyEnv: String(p.apiKeyEnv ?? ''),
		apiKey: '',
		hasKey: Boolean(p.hasKey),
		local: Boolean(p.local),
		usable: Boolean(p.usable),
		headers: JSON.stringify(p.headers ?? {}, null, 2),
		extraBody: JSON.stringify(p.extraBody ?? {}, null, 2),
	}));

	if (data.agent) {
		agent = {
			maxToolRounds: Number(data.agent.maxToolRounds ?? 12),
			useReviewer: data.agent.useReviewer !== false,
			maxParallelAgents: Number(data.agent.maxParallelAgents ?? 3),
		};
	}

	$('settings-path').textContent = data.configPath ? `الملف: ${data.configPath}` : '';
	render();
	setStatus('');
}

function render(): void {
	listEl.innerHTML = '';
	for (let i = 0; i < providers.length; i++) {
		listEl.appendChild(buildCard(providers[i], i));
	}
	$<HTMLInputElement>('agent-rounds').value = String(agent.maxToolRounds);
	$<HTMLInputElement>('agent-parallel').value = String(agent.maxParallelAgents);
	$<HTMLInputElement>('agent-reviewer').checked = agent.useReviewer;
}

function field(value: string, opts: { ltr?: boolean; number?: boolean } = {}): HTMLInputElement {
	const input = document.createElement('input');
	if (opts.number) input.type = 'number';
	else input.type = 'text';
	input.value = value;
	if (opts.ltr) input.setAttribute('dir', 'ltr');
	input.setAttribute('spellcheck', 'false');
	return input;
}

function buildCard(draft: ProviderDraft, index: number): HTMLElement {
	const card = document.createElement('div');
	card.className = 's-card';

	// --- head: id + type + badges + actions ---
	const head = document.createElement('div');
	head.className = 's-card-head';

	const idInput = field(draft.id, { ltr: true });
	idInput.placeholder = 'id (مثال: my-gateway)';
	idInput.className = 's-id';
	idInput.addEventListener('input', () => (draft.id = idInput.value));

	const typeSel = document.createElement('select');
	const optAnthropic = document.createElement('option');
	optAnthropic.value = 'anthropic';
	optAnthropic.textContent = 'Anthropic';
	const optOpenai = document.createElement('option');
	optOpenai.value = 'openai-compatible';
	optOpenai.textContent = 'OpenAI-compatible';
	typeSel.append(optAnthropic, optOpenai);
	typeSel.value = draft.type;
	typeSel.addEventListener('change', () => (draft.type = typeSel.value as ProviderDraft['type']));

	const badge = document.createElement('span');
	badge.className = 's-badge';
	badge.textContent = draft.local ? 'محلي' : draft.hasKey ? 'مفتاح ✓' : 'بدون مفتاح';
	badge.classList.toggle('ok', draft.usable);
	badge.title = draft.usable ? 'جاهز للاستخدام' : 'غير قابل للاستخدام حالياً';

	const upBtn = document.createElement('button');
	upBtn.className = 'mini-btn s-move';
	upBtn.textContent = '▲';
	upBtn.disabled = index === 0;
	upBtn.addEventListener('click', () => moveProvider(index, -1));
	const downBtn = document.createElement('button');
	downBtn.className = 'mini-btn s-move';
	downBtn.textContent = '▼';
	downBtn.disabled = index === providers.length - 1;
	downBtn.addEventListener('click', () => moveProvider(index, 1));

	const delBtn = document.createElement('button');
	delBtn.className = 'mini-btn s-del';
	delBtn.textContent = 'حذف';
	delBtn.addEventListener('click', () => {
		if (!confirm(`حذف المزود «${draft.id || '(بدون id)'}»؟`)) return;
		providers.splice(index, 1);
		render();
	});

	head.append(idInput, typeSel, badge, upBtn, downBtn, delBtn);

	// --- grid: baseUrl / model / key env / literal key ---
	const grid = document.createElement('div');
	grid.className = 's-grid';

	const baseUrl = field(draft.baseUrl, { ltr: true });
	baseUrl.placeholder = 'Base URL';
	baseUrl.addEventListener('input', () => (draft.baseUrl = baseUrl.value));
	const model = field(draft.model, { ltr: true });
	model.placeholder = 'النموذج (مثال: claude-sonnet-4-5-20250929)';
	model.addEventListener('input', () => (draft.model = model.value));
	const keyEnv = field(draft.apiKeyEnv, { ltr: true });
	keyEnv.placeholder = 'متغير البيئة (مثال: ANTHROPIC_API_KEY)';
	keyEnv.addEventListener('input', () => (draft.apiKeyEnv = keyEnv.value));
	const key = field('', { ltr: true });
	key.type = 'password';
	key.placeholder = draft.hasKey ? 'مفتاح موجود — اتركه لإبقائه' : 'مفتاح مباشر (اختياري)';
	key.addEventListener('input', () => (draft.apiKey = key.value));

	const prio = field(String(draft.priority), { ltr: true, number: true });
	prio.className = 's-prio';
	prio.title = 'الأصغر يُجرَّب أولاً';
	prio.addEventListener('input', () => {
		const n = Number(prio.value);
		if (Number.isFinite(n)) draft.priority = n;
	});

	const enabledLabel = document.createElement('label');
	enabledLabel.className = 'check';
	const enabledBox = document.createElement('input');
	enabledBox.type = 'checkbox';
	enabledBox.checked = draft.enabled;
	enabledBox.addEventListener('change', () => (draft.enabled = enabledBox.checked));
	enabledLabel.append(enabledBox, document.createTextNode(' مفعّل'));

	grid.append(
		labeled('Base URL', baseUrl),
		labeled('النموذج', model),
		labeled('متغير المفتاح', keyEnv),
		labeled('مفتاح مباشر', key),
		labeled('الأولوية', prio),
		labelWrap(enabledLabel),
	);

	// --- advanced: headers / extraBody as JSON ---
	const details = document.createElement('details');
	details.className = 's-adv';
	const summary = document.createElement('summary');
	summary.textContent = 'خيارات متقدمة (headers / extraBody JSON)';
	const headersTa = document.createElement('textarea');
	headersTa.value = draft.headers;
	headersTa.setAttribute('dir', 'ltr');
	headersTa.spellcheck = false;
	headersTa.addEventListener('input', () => (draft.headers = headersTa.value));
	const extraTa = document.createElement('textarea');
	extraTa.value = draft.extraBody;
	extraTa.setAttribute('dir', 'ltr');
	extraTa.spellcheck = false;
	extraTa.addEventListener('input', () => (draft.extraBody = extraTa.value));
	details.append(summary, labeled('headers', headersTa), labeled('extraBody', extraTa));

	// --- foot: test + status ---
	const foot = document.createElement('div');
	foot.className = 's-card-foot';
	const testBtn = document.createElement('button');
	testBtn.className = 'mini-btn s-test';
	testBtn.textContent = 'اختبار الاتصال';
	const testStatus = document.createElement('span');
	testStatus.className = 's-status';
	testBtn.addEventListener('click', () => void testProvider(draft, testBtn, testStatus));
	foot.append(testBtn, testStatus);

	card.append(head, grid, details, foot);
	return card;
}

function labeled(text: string, input: HTMLElement): HTMLElement {
	const wrap = document.createElement('label');
	wrap.className = 's-field';
	const label = document.createElement('span');
	label.textContent = text;
	wrap.append(label, input);
	return wrap;
}

function labelWrap(el: HTMLElement): HTMLElement {
	const wrap = document.createElement('label');
	wrap.className = 's-field s-field-inline';
	wrap.append(el);
	return wrap;
}

function moveProvider(index: number, delta: number): void {
	const to = index + delta;
	if (to < 0 || to >= providers.length) return;
	[providers[index], providers[to]] = [providers[to], providers[index]];
	render();
}

// ---------------------------------------------------------------------------
// Test + save
// ---------------------------------------------------------------------------

async function testProvider(draft: ProviderDraft, btn: HTMLButtonElement, status: HTMLElement): Promise<void> {
	if (!draft.id.trim()) {
		status.textContent = '✗ اكتب id أولاً';
		status.className = 's-status err';
		return;
	}
	btn.disabled = true;
	status.textContent = 'جارٍ الاختبار…';
	status.className = 's-status';
	const result = await window.idexal.settings.testProvider(draft.id);
	btn.disabled = false;
	const data = result.data as { ok?: boolean; provider?: string; latencyMs?: number; reply?: string; error?: string };
	if (result.ok && data && data.ok) {
		status.textContent = `✓ ${data.provider ?? draft.id} · ${data.latencyMs ?? '?'}ms`;
		status.className = 's-status ok';
	} else {
		status.textContent = `✗ ${data?.error ?? result.error ?? 'فشل الاتصال'}`;
		status.className = 's-status err';
	}
}

function buildPayload(): unknown {
	return {
		providers: providers.map((p) => ({
			id: p.id.trim(),
			type: p.type,
			baseUrl: p.baseUrl.trim() || undefined,
			apiKeyEnv: p.apiKeyEnv.trim() || undefined,
			apiKey: p.apiKey.trim() || undefined,
			model: p.model.trim() || undefined,
			priority: p.priority,
			enabled: p.enabled,
			headers: Object.keys(parseJson(p.headers)).length ? parseJson(p.headers) : undefined,
			extraBody: Object.keys(parseJson(p.extraBody)).length ? parseJson(p.extraBody) : undefined,
		})),
		agent: {
			maxToolRounds: Number($<HTMLInputElement>('agent-rounds').value) || 12,
			useReviewer: $<HTMLInputElement>('agent-reviewer').checked,
			maxParallelAgents: Math.max(1, Number($<HTMLInputElement>('agent-parallel').value) || 3),
		},
	};
}

async function saveSettings(): Promise<void> {
	if (saving) return;
	saving = true;
	$('settings-save').classList.add('busy');
	setStatus('جارٍ الحفظ والتحقق…');
	const result = await window.idexal.settings.save(buildPayload());
	saving = false;
	$('settings-save').classList.remove('busy');
	if (result.ok) {
		setStatus('✓ حُفظت الإعدادات');
		await loadSettings(); // re-render from the merged effective config
	} else {
		setStatus(`✗ ${result.error ?? 'فشل الحفظ'}`, false);
	}
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function openSettings(): void {
	page.classList.remove('hidden');
	void loadSettings();
}

function closeSettings(): void {
	page.classList.add('hidden');
}

// The sidebar owns the entry point (⚙ next to the user), so expose the
// opener for index.ts rather than binding a button that lives in a
// different module's markup.
window.__idexalOpenSettings = openSettings;
$('nav-settings').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', closeSettings);
$('settings-cancel').addEventListener('click', closeSettings);
$('settings-save').addEventListener('click', () => void saveSettings());
$('provider-add').addEventListener('click', () => {
	providers.push(emptyProvider());
	render();
});

// ───────────────────────── usage / spend ─────────────────────────

interface UsageTotals {
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	avgLatencyMs: number;
	topModel: string | null;
}
interface UsageProvider {
	provider: string;
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}
interface UsageDay {
	day: string;
	calls: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}
interface UsageCall {
	id: number;
	provider: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	latencyMs: number;
	ok: boolean;
	error?: string | null;
	createdAt: number;
}

// Western digits throughout this page even though the UI is Arabic: every
// figure here sits beside a dollar amount, a model id or a latency, and
// mixing ٢٢٤٬٢٠٧ with $0.7198 in adjacent tiles reads as two unrelated
// systems.
const nf = new Intl.NumberFormat('en-US');
const num = (n: number): string => nf.format(Math.round(n));

/** Money is shown to four places: single calls genuinely cost fractions of
 *  a cent, and rounding them to two would render most rows as "0.00". */
const money = (n: number): string => `$${n.toFixed(4)}`;

const ms = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)} ث` : `${Math.round(n)} م.ث`);

function el(tag: string, className?: string, text?: string): HTMLElement {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function sectionHead(text: string): HTMLElement {
	const head = el('div', 'settings-section-head');
	head.appendChild(el('span', undefined, text));
	return head;
}

function tile(label: string, value: string, hint?: string): HTMLElement {
	const box = el('div', 'usage-tile');
	box.append(el('div', 'ut-label', label), el('div', 'ut-value', value));
	if (hint) box.appendChild(el('div', 'ut-hint', hint));
	return box;
}

/**
 * The daily trend, drawn with plain elements rather than a chart library:
 * the page runs under a CSP that blocks every external origin, and a
 * dependency for fourteen bars would not earn its weight.
 *
 * Flex boxes rather than an SVG viewBox — a stretched viewBox turns a
 * single day into one enormous smeared rectangle, and days arrive one at a
 * time on a new install.
 */
function trendChart(days: UsageDay[]): HTMLElement {
	const wrap = el('div', 'usage-chart');
	const max = Math.max(...days.map((d) => d.calls), 1);

	for (const day of days) {
		const column = el('div', 'uch-col');
		column.title = `${day.day} — ${day.calls} نداء · ${money(day.costUsd)}`;

		const track = el('div', 'uch-track');
		const bar = el('div', 'uch-bar');
		// A day with calls always shows something: a 1-call day next to a
		// 200-call day would otherwise round to invisible.
		bar.style.height = day.calls > 0 ? `${Math.max((day.calls / max) * 100, 6)}%` : '0';
		track.appendChild(bar);

		column.append(track, el('div', 'uch-label', day.day.slice(-2)));
		wrap.appendChild(column);
	}
	return wrap;
}

function providerRows(list: UsageProvider[]): HTMLElement {
	const table = el('div', 'usage-table');
	const head = el('div', 'usage-row head');
	for (const h of ['المزوّد', 'نداءات', 'فشل', 'دخل', 'خرج', 'تكلفة']) head.appendChild(el('span', undefined, h));
	table.appendChild(head);

	for (const p of list) {
		const row = el('div', 'usage-row');
		row.appendChild(el('span', 'up-id', p.provider));
		row.appendChild(el('span', undefined, num(p.calls)));
		row.appendChild(el('span', p.failed > 0 ? 'bad' : undefined, num(p.failed)));
		row.appendChild(el('span', undefined, num(p.inputTokens)));
		row.appendChild(el('span', undefined, num(p.outputTokens)));
		// A provider that moved real tokens for zero cost has no price in the
		// table. Showing "$0.0000" there would be a fabricated number; the
		// core deliberately stores no price rather than inventing one.
		const priced = p.costUsd > 0 || p.inputTokens + p.outputTokens === 0;
		const cost = el('span', priced ? undefined : 'muted', priced ? money(p.costUsd) : 'سعر غير معروف');
		if (!priced) cost.title = 'لا سعر معروف لهذا النموذج — لا يُحتسب بدل اختلاق رقم';
		row.appendChild(cost);
		table.appendChild(row);
	}
	return table;
}

function recentRows(calls: UsageCall[]): HTMLElement {
	const list = el('div', 'usage-calls');
	for (const c of calls) {
		const row = el('div', `usage-call${c.ok ? '' : ' failed'}`);
		const when = new Date(c.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
		row.appendChild(el('span', 'uc-dot'));
		row.appendChild(el('span', 'uc-model', c.model));
		row.appendChild(el('span', 'uc-provider', c.provider));
		row.appendChild(el('span', 'uc-tokens', `${num(c.inputTokens)} ← ${num(c.outputTokens)}`));
		row.appendChild(el('span', 'uc-latency', ms(c.latencyMs)));
		row.appendChild(el('span', 'uc-time', when));
		if (!c.ok && c.error) {
			const why = el('div', 'uc-error', c.error);
			row.appendChild(why);
		}
		list.appendChild(row);
	}
	return list;
}

let usageLoaded = false;

async function loadUsage(): Promise<void> {
	const host = $('usage-body');
	host.textContent = '';
	host.appendChild(el('p', 'set-note', 'يُقرأ الدفتر…'));

	const res = (await window.idexal.usage.load()) as {
		ok: boolean;
		error?: string;
		data?: { summary?: { totals?: UsageTotals; providers?: UsageProvider[] }; daily?: { buckets?: UsageDay[] } | null; recent?: UsageCall[] | null };
	};
	host.textContent = '';
	usageLoaded = true;

	if (!res.ok) {
		host.appendChild(el('p', 'set-note bad', `تعذّر قراءة الدفتر: ${res.error ?? 'سبب غير معروف'}`));
		return;
	}

	const totals = res.data?.summary?.totals;
	if (!totals || totals.calls === 0) {
		host.appendChild(el('p', 'set-note', 'لا استهلاك بعد — شغّل مهمة وسيظهر هنا كل نداء برموزه وزمنه وتكلفته.'));
		return;
	}

	const tiles = el('div', 'usage-tiles');
	tiles.append(
		tile('نداءات', num(totals.calls), totals.failed > 0 ? `${num(totals.failed)} فاشلة` : 'كلها ناجحة'),
		tile('رموز الدخل', num(totals.inputTokens)),
		tile('رموز الخرج', num(totals.outputTokens)),
		tile('تكلفة تقديرية', money(totals.costUsd), 'قائمة أسعار محلية، ليست فاتورة'),
		tile('متوسط الزمن', ms(totals.avgLatencyMs)),
		tile('الأكثر استخداماً', totals.topModel ?? '—'),
	);
	host.appendChild(tiles);

	const buckets = res.data?.daily?.buckets ?? [];
	if (buckets.length > 0) {
		host.appendChild(sectionHead('آخر أيام'));
		host.appendChild(trendChart(buckets));
	}

	const perProvider = res.data?.summary?.providers ?? [];
	if (perProvider.length > 0) {
		host.appendChild(sectionHead('حسب المزوّد'));
		host.appendChild(providerRows(perProvider));
	}

	const recent = res.data?.recent ?? [];
	if (recent.length > 0) {
		host.appendChild(sectionHead('أحدث النداءات'));
		host.appendChild(recentRows(recent));
	}
}

$('usage-refresh').addEventListener('click', () => void loadUsage());

// ───────────────────────── automations ─────────────────────────

interface Automation {
	id: string;
	name: string;
	prompt: string;
	everyMinutes: number;
	enabled: boolean;
	lastRun: number;
	lastResult?: string;
}

const liveRuns = new Set<string>();

function relativeTime(at: number): string {
	if (!at) return 'لم تعمل بعد';
	const mins = Math.round((Date.now() - at) / 60_000);
	if (mins < 1) return 'قبل لحظات';
	if (mins < 60) return `قبل ${mins} د`;
	const hours = Math.round(mins / 60);
	return hours < 24 ? `قبل ${hours} س` : `قبل ${Math.round(hours / 24)} ي`;
}

function automationCard(a: Automation): HTMLElement {
	const card = el('div', 's-card');

	const head = el('div', 's-card-head');
	const name = document.createElement('input');
	name.className = 's-id';
	name.value = a.name;
	name.placeholder = 'اسم الأتمتة';

	const every = document.createElement('input');
	every.type = 'number';
	every.min = '5';
	every.value = String(a.everyMinutes);
	every.className = 's-prio';
	every.title = 'كل كم دقيقة (الحد الأدنى ٥)';
	every.setAttribute('dir', 'ltr');

	const toggle = document.createElement('label');
	toggle.className = 'check';
	const enabled = document.createElement('input');
	enabled.type = 'checkbox';
	enabled.checked = a.enabled;
	toggle.append(enabled, document.createTextNode(' مفعّلة'));

	const state = el('span', 's-badge', liveRuns.has(a.id) ? 'تعمل الآن' : relativeTime(a.lastRun));
	state.classList.toggle('ok', liveRuns.has(a.id));

	head.append(name, every, toggle, state);

	const prompt = document.createElement('textarea');
	prompt.rows = 2;
	prompt.value = a.prompt;
	prompt.placeholder = 'ما الذي يفعله الوكيل عند كل تشغيل؟';
	prompt.className = 'autom-prompt';

	const foot = el('div', 's-card-head');
	const save = el('button', 'mini-btn', 'حفظ');
	save.addEventListener('click', async () => {
		await window.idexal.automations.save({
			id: a.id,
			name: name.value,
			prompt: prompt.value,
			everyMinutes: Number(every.value),
			enabled: enabled.checked,
		});
		await loadAutomations();
	});
	const run = el('button', 'mini-btn', '▶ شغّل الآن');
	run.addEventListener('click', async () => {
		await window.idexal.automations.runNow(a.id);
	});
	const remove = el('button', 'mini-btn danger', 'حذف');
	remove.addEventListener('click', async () => {
		if (!confirm(`حذف الأتمتة «${a.name}»؟`)) return;
		await window.idexal.automations.remove(a.id);
		await loadAutomations();
	});
	foot.append(save, run, remove);

	card.append(head, prompt, foot);
	if (a.lastResult) {
		// The outcome of the last run, because a scheduled job whose result
		// is invisible cannot be told apart from one that never ran.
		const last = el('p', 'set-note', `آخر نتيجة: ${a.lastResult}`);
		card.appendChild(last);
	}
	return card;
}

async function loadAutomations(): Promise<void> {
	const host = $('autom-list');
	const res = (await window.idexal.automations.list()) as {
		ok: boolean;
		automations?: Automation[];
		running?: string[];
		error?: string;
	};
	host.innerHTML = '';
	if (!res.ok) {
		host.appendChild(el('p', 'set-note bad', res.error ?? 'تعذّرت القراءة'));
		return;
	}
	for (const id of res.running ?? []) liveRuns.add(id);
	const list = res.automations ?? [];
	if (list.length === 0) {
		host.appendChild(el('p', 'set-note', 'لا أتمتة بعد — أنشئ واحدة لتعمل على جدول.'));
		return;
	}
	for (const a of list) host.appendChild(automationCard(a));
}

$('autom-add').addEventListener('click', async () => {
	await window.idexal.automations.save({
		name: 'أتمتة جديدة',
		prompt: 'لخّص ما تغيّر في Git منذ آخر مرة، واذكر ما يحتاج انتباهاً.',
		everyMinutes: 60,
		enabled: false,
	});
	await loadAutomations();
});

window.idexal.automations.watch((event, payload) => {
	const p = (payload ?? {}) as { id?: string };
	if (!p.id) return;
	if (event === 'started') liveRuns.add(p.id);
	else liveRuns.delete(p.id);
	// Only redraw while the section is actually on screen.
	if (document.querySelector('.set-sec[data-setsec="automations"]')?.classList.contains('active')) {
		void loadAutomations();
	}
});

// Left-nav sections (Providers / Agent / Appearance / Automations / Usage / Memory / About).
const SECTION_TITLES: Record<string, string> = {
	providers: 'المزوّدون والنماذج',
	agent: 'سلوك الوكيل',
	appearance: 'المظهر',
	automations: 'الأتمتة',
	usage: 'الاستهلاك',
	memory: 'الذاكرة',
	about: 'عن Idexal',
};
for (const item of document.querySelectorAll<HTMLElement>('.set-nav-item')) {
	item.addEventListener('click', () => {
		const which = item.dataset.setnav ?? 'providers';
		for (const b of document.querySelectorAll<HTMLElement>('.set-nav-item')) b.classList.toggle('active', b === item);
		for (const s of document.querySelectorAll<HTMLElement>('.set-sec')) {
			s.classList.toggle('active', s.dataset.setsec === which);
		}
		$('settings-title').textContent = SECTION_TITLES[which] ?? which;
		// Spend changes while the app is open, so the page is loaded when it
		// is opened rather than once at startup — but only the first time,
		// so switching tabs is not three process spawns each visit.
		if (which === 'usage' && !usageLoaded) void loadUsage();
		if (which === 'automations') void loadAutomations();
	});
}

window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && !page.classList.contains('hidden')) closeSettings();
});
