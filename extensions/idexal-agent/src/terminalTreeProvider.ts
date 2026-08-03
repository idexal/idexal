// Idexal Agent extension — Agent Terminal view (tree)
// Shows every background terminal the agents started during a task, with its
// command, live status (running/exited), age, and a tooltip of recent output.
// The provider is fed by the `terminal-start` / `terminal-output` /
// `terminal-exit` events the AI Core streams while a task runs.

import * as vscode from 'vscode';

export interface TerminalEntry {
	id: string;
	command: string;
	status: 'running' | 'exited';
	exitCode: number | null;
	startedAt: number;
	/** Tail of the live output, capped to keep the tree light. */
	output: string;
}

const MAX_TOOLTIP = 3000;

export class TerminalNode extends vscode.TreeItem {
	constructor(public readonly entry: TerminalEntry) {
		super(`${entry.id} — ${entry.command}`, vscode.TreeItemCollapsibleState.None);
		this.iconPath = new vscode.ThemeIcon(entry.status === 'running' ? 'terminal' : 'debug-stop');
		this.description = entry.status === 'running' ? `running (${Math.round((Date.now() - entry.startedAt) / 1000)}s)` : `exited (code ${entry.exitCode ?? 'unknown'})`;
		this.contextValue = 'idexalTerminal';
		this.tooltip = new vscode.MarkdownString(
			`**${entry.id}** — \`${entry.command}\`\n\n` +
				`${entry.status === 'running' ? '🟢 running' : `⛔ exited (code ${entry.exitCode ?? 'unknown'})`}\n\n` +
				'```\n' +
				(entry.output.slice(-MAX_TOOLTIP) || '(no output yet)') +
				'\n```',
		);
	}
}

export class TerminalTreeProvider implements vscode.TreeDataProvider<TerminalNode> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<TerminalNode | undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private terminals = new Map<string, TerminalEntry>();

	/** New task — the previous task's terminals were all killed by the core. */
	reset(): void {
		this.terminals.clear();
		this.refresh();
	}

	start(id: string, command: string): void {
		this.terminals.set(id, { id, command, status: 'running', exitCode: null, startedAt: Date.now(), output: '' });
		this.refresh();
	}

	append(id: string, output: string): void {
		const t = this.terminals.get(id);
		if (!t) return;
		// Keep only the tail so long-running servers don't grow memory forever.
		const next = (t.output + output).slice(-16_000);
		this.terminals.set(id, { ...t, output: next });
		this.refresh();
	}

	exit(id: string, exitCode: number | null): void {
		const t = this.terminals.get(id);
		if (!t) return;
		this.terminals.set(id, { ...t, status: 'exited', exitCode });
		this.refresh();
	}

	getTreeItem(element: TerminalNode): vscode.TreeItem {
		return element;
	}

	getChildren(): TerminalNode[] {
		return [...this.terminals.values()].map((t) => new TerminalNode(t));
	}

	private refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}
}
