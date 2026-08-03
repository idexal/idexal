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

$('settings-open').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', closeSettings);
$('settings-cancel').addEventListener('click', closeSettings);
$('settings-save').addEventListener('click', () => void saveSettings());
$('provider-add').addEventListener('click', () => {
	providers.push(emptyProvider());
	render();
});
page.addEventListener('click', (e) => {
	if (e.target === page) closeSettings();
});
window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && !page.classList.contains('hidden')) closeSettings();
});
