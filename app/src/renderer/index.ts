interface CoreEvent {
	type: 'start' | 'provider' | 'delta' | 'tool-call' | 'tool-result' | 'done' | 'error';
	name?: string;
	text?: string;
	args?: string;
	ok?: boolean;
	output?: string;
	summary?: string;
	provider?: string;
	tool_rounds?: number;
	providers?: string[];
	error?: string;
}

declare global {
	interface Window {
		idexal: {
			runTask: (task: string, onEvent: (event: CoreEvent) => void) => () => void;
		};
		__monaco: typeof import('monaco-editor');
	}
}

window.addEventListener('monaco-ready', () => {
	const monaco = window.__monaco;
	monaco.editor.create(document.getElementById('monaco-container')!, {
		value: [
			'// idexal — agentic ide',
			'// المحرر يعمل الآن فوق Electron + Monaco + نواة Rust.',
			'',
			'fn main() {',
			'    println!("Idexal core is alive.");',
			'}',
			'',
		].join('\n'),
		language: 'rust',
		theme: 'vs-dark',
		automaticLayout: true,
		fontFamily: "Cascadia Code, Consolas, monospace",
		fontSize: 13,
	});
});

const log = document.getElementById('agent-log')!;
const input = document.getElementById('agent-input') as HTMLInputElement;
const sendBtn = document.getElementById('agent-send') as HTMLButtonElement;

function appendUser(text: string): void {
	const div = document.createElement('div');
	div.className = 'line from-user';
	div.textContent = text;
	log.appendChild(div);
	log.scrollTop = log.scrollHeight;
}

function appendAgentStart(): HTMLDivElement {
	const div = document.createElement('div');
	div.className = 'line from-agent';
	const name = document.createElement('span');
	name.className = 'agent-name';
	name.textContent = 'IDEXAL AGENT';
	const body = document.createElement('span');
	body.className = 'agent-body';
	div.appendChild(name);
	div.appendChild(body);
	log.appendChild(div);
	log.scrollTop = log.scrollHeight;
	return body as unknown as HTMLDivElement;
}

const stateEl = document.getElementById('agent-state')!;
const diffstatEl = document.getElementById('agent-diffstat')!;

function setRunning(running: boolean): void {
	sendBtn.disabled = running;
	stateEl.textContent = running ? 'running…' : 'idle';
	stateEl.classList.toggle('running', running);
}

function send(): void {
	const task = input.value.trim();
	if (!task) return;
	input.value = '';
	setRunning(true);
	appendUser(task);
	const agentBody = appendAgentStart();
	let buffer = '';

	// Streamed text lands in the current agent bubble. Tool activity is
	// appended as its own log lines, so a later text delta must start a
	// fresh bubble rather than reopening the one above the tool lines.
	let activeBody: HTMLElement = agentBody;
	let textOpen = true;

	const appendMeta = (text: string, cls = 'meta'): void => {
		const el = document.createElement('div');
		el.className = cls;
		el.textContent = text;
		log.appendChild(el);
		log.scrollTop = log.scrollHeight;
	};

	const stop = window.idexal.runTask(task, (event) => {
		if (event.type === 'provider' && event.name) {
			appendMeta(`⇄ ${event.name}`);
			textOpen = false;
		} else if (event.type === 'delta' && event.text) {
			if (!textOpen) {
				activeBody = appendAgentStart();
				buffer = '';
				textOpen = true;
			}
			buffer += event.text;
			activeBody.textContent = buffer;
			log.scrollTop = log.scrollHeight;
		} else if (event.type === 'tool-call' && event.name) {
			let detail = '';
			try {
				const parsed = JSON.parse(event.args ?? '{}') as Record<string, unknown>;
				detail = (parsed.path as string) ?? (parsed.command as string) ?? '';
			} catch {
				// malformed args: show the tool name alone rather than raw JSON
			}
			appendMeta(`⚙ ${event.name}${detail ? ` ${detail}` : ''}`, 'meta tool');
			textOpen = false;
		} else if (event.type === 'tool-result' && event.name) {
			appendMeta(`${event.ok ? '✓' : '✗'} ${event.name}`, `meta ${event.ok ? 'tool-ok' : 'tool-fail'}`);
			textOpen = false;
		} else if (event.type === 'done') {
			if (typeof event.tool_rounds === 'number' && event.tool_rounds > 0) {
				appendMeta(`● ${event.provider ?? ''} · ${event.tool_rounds} جولة أدوات`);
			}
			diffstatEl.textContent = '';
			setRunning(false);
			stop();
		} else if (event.type === 'error') {
			appendMeta(`⚠️ ${event.error}`, 'meta tool-fail');
			setRunning(false);
			stop();
		}
	});
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') send();
});
