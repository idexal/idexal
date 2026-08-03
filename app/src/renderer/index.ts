interface CoreEvent {
	type: 'start' | 'provider' | 'delta' | 'done' | 'error';
	name?: string;
	text?: string;
	summary?: string;
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

	const stop = window.idexal.runTask(task, (event) => {
		if (event.type === 'provider' && event.name) {
			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = `⇄ ${event.name}`;
			log.appendChild(meta);
			log.scrollTop = log.scrollHeight;
		} else if (event.type === 'delta' && event.text) {
			buffer += event.text;
			agentBody.textContent = buffer;
			log.scrollTop = log.scrollHeight;
		} else if (event.type === 'done') {
			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = event.summary ?? '';
			log.appendChild(meta);
			diffstatEl.textContent = '+0 −0';
			setRunning(false);
			stop();
		} else if (event.type === 'error') {
			agentBody.textContent = `⚠️ ${event.error}`;
			setRunning(false);
			stop();
		}
	});
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') send();
});
