interface CoreEvent {
	type: 'start' | 'delta' | 'done' | 'error';
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
	log.appendChild(div);
	log.scrollTop = log.scrollHeight;
	return div;
}

function send(): void {
	const task = input.value.trim();
	if (!task) return;
	input.value = '';
	sendBtn.disabled = true;
	appendUser(task);
	const agentDiv = appendAgentStart();
	let buffer = '';

	const stop = window.idexal.runTask(task, (event) => {
		if (event.type === 'delta' && event.text) {
			buffer += event.text;
			agentDiv.textContent = buffer;
			log.scrollTop = log.scrollHeight;
		} else if (event.type === 'done') {
			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = event.summary ?? '';
			log.appendChild(meta);
			sendBtn.disabled = false;
			stop();
		} else if (event.type === 'error') {
			agentDiv.textContent = `⚠️ ${event.error}`;
			sendBtn.disabled = false;
			stop();
		}
	});
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') send();
});
