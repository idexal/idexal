// Idexal Agent extension — live progress WebView
// An interactive view (`idexal.progress`) that renders the AI Core's stream
// events as animated cards instead of raw text: the plan checklist, step
// transitions, agent activity, tool calls + outcomes, review verdicts,
// terminals, usage, and the final summary/error.
//
// Architecture: the extension holds the authoritative snapshot of a run.
//   • While the view is visible, every event is forwarded as a small
//     incremental *op* ({type:'add'|'update'|'plan'|'step'|...}) so cards
//     animate in place without re-rendering the whole DOM.
//   • On resolve / reveal (mid-run or after), the full snapshot is sent so
//     the view always shows correct state even if it was closed during a run.

import * as vscode from 'vscode';
import type { StreamEvent, TaskStep } from './types';

/** One animated card in the activity feed. */
export interface ProgressCard {
	id: string;
	kind: 'agent' | 'tool' | 'review' | 'terminal' | 'provider' | 'usage';
	title: string;
	detail?: string;
	status?: 'running' | 'done' | 'failed' | 'ok' | 'fix';
	output?: string;
	exitCode?: number | null;
}

export interface ProgressUsage {
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	avgLatencyMs: number;
}

/** Authoritative snapshot mirrored into the webview. */
export interface ProgressState {
	task: string;
	mode: string; // 'task' | 'plan' | 'review' | 'fix'
	running: boolean;
	cancelled: boolean;
	providers: string[];
	plan: TaskStep[];
	cards: ProgressCard[];
	streamText: string;
	usage?: ProgressUsage;
	summary?: string;
	error?: string;
}

export interface ProgressCallbacks {
	onCancel?: () => void;
	onClear?: () => void;
}

type CardOp =
	| { type: 'meta'; task: string; mode: string }
	| { type: 'providers'; providers: string[] }
	| { type: 'plan'; steps: TaskStep[] }
	| { type: 'step'; step: TaskStep }
	| { type: 'add'; card: ProgressCard }
	| { type: 'update'; id: string; patch: Partial<ProgressCard> }
	| { type: 'stream'; text: string }
	| { type: 'usage'; usage: ProgressUsage }
	| { type: 'finish'; status: 'done' | 'failed' | 'cancelled'; summary?: string; error?: string };

function summarizeArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args).slice(0, 4);
	if (entries.length === 0) return '';
	return entries
		.map(([k, v]) => {
			const s = typeof v === 'string' ? v : JSON.stringify(v);
			return `${k}=${(s ?? '').length > 60 ? (s ?? '').slice(0, 60) + '…' : s}`;
		})
		.join(', ');
}

export class ProgressWebviewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'idexal.progress';

	private view?: vscode.WebviewView;
	private readonly extensionUri: vscode.Uri;
	private readonly callbacks: ProgressCallbacks;
	private state: ProgressState = this.emptyState();
	/** Counter used to give each tool-call card a stable unique id. */
	private toolSeq = 0;

	constructor(extensionUri: vscode.Uri, callbacks: ProgressCallbacks = {}) {
		this.extensionUri = extensionUri;
		this.callbacks = callbacks;
	}

	private emptyState(): ProgressState {
		return {
			task: '',
			mode: 'task',
			running: false,
			cancelled: false,
			providers: [],
			plan: [],
			cards: [],
			streamText: '',
		};
	}

	/** Start showing a new run. */
	begin(task: string, mode: string): void {
		this.state = this.emptyState();
		this.state.task = task;
		this.state.mode = mode;
		this.state.running = true;
		this.toolSeq = 0;
		this.post({ type: 'meta', task, mode });
	}

	/** Feed one stream event into the snapshot (+ incremental op when visible). */
	handleEvent(event: StreamEvent): void {
		switch (event.type) {
			case 'start':
				this.state.providers = event.providers;
				this.post({ type: 'providers', providers: event.providers });
				break;
			case 'plan':
				this.state.plan = event.steps;
				this.post({ type: 'plan', steps: event.steps });
				break;
			case 'step-status': {
				const idx = this.state.plan.findIndex((s) => s.id === event.step.id);
				if (idx >= 0) this.state.plan[idx] = event.step;
				else this.state.plan.push(event.step);
				this.post({ type: 'step', step: event.step });
				break;
			}
			case 'agent-start': {
				const card: ProgressCard = { id: `agent-${event.name}`, kind: 'agent', title: event.name, status: 'running' };
				this.state.cards.push(card);
				this.post({ type: 'add', card });
				break;
			}
			case 'agent-end': {
				const card: ProgressCard = {
					id: `agent-${event.name}`,
					kind: 'agent',
					title: event.name,
					status: 'done',
					detail: event.summary,
				};
				this.upsert(card);
				break;
			}
			case 'tool-call': {
				this.toolSeq++;
				const card: ProgressCard = {
					id: `tool-${event.step}-${event.name}-${this.toolSeq}`,
					kind: 'tool',
					title: `${event.name}(${summarizeArgs(event.args)})`,
					status: 'running',
					detail: `step ${event.step}`,
				};
				this.state.cards.push(card);
				this.post({ type: 'add', card });
				break;
			}
			case 'tool-result': {
				// Find the most recent tool card for this step+name still running.
				for (let i = this.state.cards.length - 1; i >= 0; i--) {
					const c = this.state.cards[i];
					if (
						c.kind === 'tool' &&
						c.id.startsWith(`tool-${event.step}-${event.name}-`) &&
						c.status === 'running'
					) {
						const patch: Partial<ProgressCard> = {
							status: event.ok ? 'ok' : 'failed',
							output: event.output,
						};
						this.state.cards[i] = { ...c, ...patch };
						this.post({ type: 'update', id: c.id, patch });
						break;
					}
				}
				break;
			}
			case 'review': {
				const card: ProgressCard = {
					id: `review-${Date.now()}`,
					kind: 'review',
					title: `Reviewer: ${event.verdict === 'fix' ? 'fixes requested' : 'approved'}`,
					status: event.verdict === 'fix' ? 'fix' : 'ok',
				};
				this.state.cards.push(card);
				this.post({ type: 'add', card });
				break;
			}
			case 'terminal-start': {
				const card: ProgressCard = {
					id: `term-${event.id}`,
					kind: 'terminal',
					title: `${event.id} — ${event.command}`,
					status: 'running',
					output: '',
				};
				this.state.cards.push(card);
				this.post({ type: 'add', card });
				break;
			}
			case 'terminal-output': {
				const idx = this.state.cards.findIndex((c) => c.id === `term-${event.id}`);
				if (idx < 0) break;
				const c = this.state.cards[idx];
				const output = ((c.output ?? '') + event.output).slice(-6000);
				this.state.cards[idx] = { ...c, output };
				this.post({ type: 'update', id: c.id, patch: { output } });
				break;
			}
			case 'terminal-exit': {
				const idx = this.state.cards.findIndex((c) => c.id === `term-${event.id}`);
				if (idx < 0) break;
				this.state.cards[idx] = {
					...this.state.cards[idx],
					status: event.exitCode === 0 ? 'done' : 'failed',
					exitCode: event.exitCode,
				};
				this.post({ type: 'update', id: `term-${event.id}`, patch: { status: event.exitCode === 0 ? 'done' : 'failed', exitCode: event.exitCode } });
				break;
			}
			case 'usage':
				this.state.usage = event.totals;
				this.post({ type: 'usage', usage: event.totals });
				break;
			case 'delta': {
				const d = event.delta;
				if (d.type === 'text') {
					this.state.streamText = (this.state.streamText + d.text).slice(-4000);
					this.post({ type: 'stream', text: d.text });
				} else if (d.type === 'provider') {
					const card: ProgressCard = {
						id: `provider-${d.providerId}`,
						kind: 'provider',
						title: `Provider: ${d.displayName ?? d.providerId}`,
					};
					this.state.cards.push(card);
					this.post({ type: 'add', card });
				}
				break;
			}
			case 'done':
				this.state.running = false;
				this.state.summary = event.summary;
				this.post({ type: 'finish', status: 'done', summary: event.summary });
				break;
			case 'error':
				this.state.running = false;
				this.state.error = event.error;
				this.post({ type: 'finish', status: 'failed', error: event.error });
				break;
		}
	}

	/** Mark the run finished (cancelled by the user). */
	end(cancelled = false): void {
		if (!this.state.running && !cancelled) return;
		this.state.running = false;
		this.state.cancelled = cancelled;
		if (cancelled && !this.state.error) {
			this.post({ type: 'finish', status: 'cancelled' });
		}
	}

	/** Clear everything (webview "Clear" button). */
	clear(): void {
		this.state = this.emptyState();
		this.toolSeq = 0;
		// A single snapshot rebuilds the whole UI — no intermediate ops needed.
		this.view?.webview.postMessage({ type: 'snapshot', state: this.state });
	}

	/** Focus the view (used by the title-menu / command). */
	reveal(): void {
		void vscode.commands.executeCommand(`${ProgressWebviewProvider.viewType}.focus`);
	}

	private upsert(card: ProgressCard): void {
		const idx = this.state.cards.findIndex((c) => c.id === card.id);
		if (idx >= 0) {
			this.state.cards[idx] = { ...this.state.cards[idx], ...card };
		} else {
			this.state.cards.push(card);
		}
		this.post({ type: 'update', id: card.id, patch: card });
	}

	private post(op: CardOp): void {
		this.view?.webview.postMessage({ type: 'event', op });
	}

	// ---- WebviewViewProvider ----

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
		};
		webviewView.webview.html = this.getHtml(webviewView.webview);

		// Reveal mid-run (or after): the snapshot rebuilds the whole UI from
		// the extension's authoritative state.
		webviewView.webview.postMessage({ type: 'snapshot', state: this.state });

		webviewView.webview.onDidReceiveMessage((msg) => {
			if (msg?.type === 'cancel') this.callbacks.onCancel?.();
			else if (msg?.type === 'clear') this.callbacks.onClear?.();
		});

		// Re-sync whenever the view becomes visible again (e.g. tab switches).
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				webviewView.webview.postMessage({ type: 'snapshot', state: this.state });
			}
		});
	}

	private getHtml(webview: vscode.Webview): string {
		const media = vscode.Uri.joinPath(this.extensionUri, 'media');
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(media, 'progress.css'));
		const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(media, 'progress.js'));
		const nonce = getNonce();
		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${cssUri}">
<title>Idexal — Live Progress</title>
</head>
<body>
	<header class="hud">
		<div class="hud-row">
			<span id="mode-badge" class="badge">task</span>
			<h1 id="task-title">Idexal Agent</h1>
			<span id="status-pill" class="pill idle">idle</span>
		</div>
		<div id="providers" class="providers"></div>
		<div class="track"><div id="bar" class="bar"></div></div>
	</header>

	<main id="content">
		<section id="plan" class="plan hidden"></section>
		<section id="feed" class="feed"></section>
		<section id="stream-wrap" class="stream-wrap hidden">
			<div class="stream-head">Assistant stream</div>
			<pre id="stream"></pre>
		</section>
		<div id="empty" class="empty">
			<div class="empty-logo">✦</div>
			<p>Ask <strong>@idexal</strong> in the chat to run a task —<br>live progress cards appear here.</p>
		</div>
	</main>

	<footer class="footer">
		<button id="cancel" disabled>⏹ Cancel</button>
		<button id="clear">🗑 Clear</button>
	</footer>
	<script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
	}
}

function getNonce(): string {
	let text = '';
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return text;
}
