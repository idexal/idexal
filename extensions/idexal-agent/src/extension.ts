// Idexal Agent extension — entry point
// Registers a ChatParticipant (`@idexal`) independent of GitHub Copilot,
// a visual task list view, and commands. Tasks are executed by the Idexal
// AI Core (spawned as a child process in `stream` mode). The participant
// renders a rich live transcript inside the conversation: streaming text,
// the plan checklist, each agent's tool calls and outcomes, usage & cost,
// and clickable file references for every file the agents touch.
//
// Editor integration:
//   • Files/selections referenced in the prompt (`#file:…`, `#selection:…`)
//     are inlined into the task context so the agents can act on them.
//   • Files written/read by tools become clickable references in the chat.
//   • A "Show Task List" button is appended to each finished response.

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveNodePath, resolveCliPath, runTask, type ResolvedRuntime } from './aiCoreClient';
import { TaskTreeProvider } from './taskTreeProvider';
import { TerminalTreeProvider } from './terminalTreeProvider';
import { ProgressWebviewProvider } from './progressWebview';
import type { StreamDelta, StreamEvent, TaskStep } from './types';

const PARTICIPANT_ID = 'idexal.agent';
const MAX_INLINE_FILE = 6000; // chars of a referenced file inlined into the task

/**
 * Detect the workspace's test command from package.json scripts + lockfiles
 * so follow-up suggestions offer the real command (npm/pnpm/yarn/bun) that
 * actually verifies the changes — e.g. "npm test" or "pnpm run test:unit".
 */
function detectTestCommand(cwd: string): string | undefined {
	try {
		const pkgPath = path.join(cwd, 'package.json');
		if (!fs.existsSync(pkgPath)) return undefined;
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> };
		const scripts = pkg.scripts ?? {};
		// Prefer the exact `test` script, else the first `test:*` variant.
		const testKey = Object.keys(scripts).find((s) => s === 'test' || s.startsWith('test:'));
		if (!testKey) return undefined;
		const runner = fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))
			? 'pnpm'
			: fs.existsSync(path.join(cwd, 'yarn.lock'))
				? 'yarn'
				: fs.existsSync(path.join(cwd, 'bun.lockb'))
					? 'bun'
					: 'npm';
		return testKey === 'test' ? `${runner} test` : `${runner} run ${testKey}`;
	} catch {
		return undefined;
	}
}

export function activate(context: vscode.ExtensionContext): void {
	const taskTree = new TaskTreeProvider();
	// The view is contributed in package.json (views.idexal) — createTreeView
	// wires the provider to it. Do NOT also call registerTreeDataProvider for
	// the same id (that throws "view already registered").
	context.subscriptions.push(vscode.window.createTreeView('idexal.tasks', { treeDataProvider: taskTree }));
	// Agent Terminal view: every background process the agents start shows up
	// here with live status + output tail.
	const terminalTree = new TerminalTreeProvider();
	context.subscriptions.push(vscode.window.createTreeView('idexal.terminals', { treeDataProvider: terminalTree }));

	let activeRun: { cancel: () => void } | undefined;

	// Live-progress WebView: animated cards for the plan, steps, tools, and
	// review. The provider owns the run snapshot; its Cancel button aborts
	// the active run exactly like the title-bar cancel command.
	const progress = new ProgressWebviewProvider(context.extensionUri, {
		onCancel: () => activeRun?.cancel(),
		onClear: () => progress.clear(),
	});
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(ProgressWebviewProvider.viewType, progress));

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('idexal.openChat', () => {
			void vscode.commands.executeCommand('workbench.action.chat.open', { query: '@idexal ' });
		}),
		vscode.commands.registerCommand('idexal.clearTasks', () => {
			taskTree.clear();
			progress.clear();
		}),
		vscode.commands.registerCommand('idexal.cancelTask', () => {
			activeRun?.cancel();
		}),
		vscode.commands.registerCommand('idexal.showProgress', () => {
			progress.reveal();
		}),
	);

	// Keep the context key in sync so the cancel button only shows while running.
	function updateRunningContext(): void {
		void vscode.commands.executeCommand('setContext', 'idexal.taskRunning', taskTree.isRunning());
	}

	// Chat participant
	const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, async (request, _context, response, token) => {
		const rawPrompt = request.prompt.trim();
		if (!rawPrompt) {
			response.markdown('Please describe a task — for example: "Refactor the settings module and update its tests".');
			return;
		}

		// Custom Idexal chat commands (/idexal:plan | /idexal:review |
		// /idexal:fix) are detected by their prefix. The remainder after the
		// command becomes the task text; each mode shapes how it runs.
		const commandMatch = rawPrompt.match(/^\/idexal:(plan|review|fix)\b(?:\s+(.*))?$/is);
		const command = (commandMatch?.[1]?.toLowerCase() ?? undefined) as 'plan' | 'review' | 'fix' | undefined;
		const commandArg = (commandMatch?.[2] ?? '').trim();
		if (command && !commandArg) {
			const usage: Record<'plan' | 'review' | 'fix', string> = {
				plan: '/idexal:plan <task> — produce a step-by-step plan without executing anything',
				review: '/idexal:review <target> — review code for issues without modifying files',
				fix: '/idexal:fix <issue> — fix a described problem and verify it works',
			};
			response.markdown(`**\`/${command}\` needs a description**\n\nExample: \`${usage[command]}\``);
			return;
		}

		// Resolve the AI Core runtime up front so misconfiguration is visible.
		let runtime: ResolvedRuntime;
		try {
			runtime = {
				nodePath: resolveNodePath(),
				cliPath: resolveCliPath(context.extensionUri),
			};
		} catch (err) {
			response.markdown(`**Idexal could not start.** ${err instanceof Error ? err.message : String(err)}`);
			return;
		}

		// Work in the first workspace folder (falls back to the extension host cwd).
		const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
		const showEvents = vscode.workspace.getConfiguration('idexal').get<boolean>('showAgentEvents', true);
		// Used by the follow-up suggestions: the real test command (if any).
		const testCommand = detectTestCommand(cwd);

		// ---- Editor context: inline files & selections the user referenced ----
		const contextParts: string[] = [];
		// Dedupe by file URI so a file referenced both as a #file and via a
		// #selection (or the active editor) is only inlined once.
		const seenFiles = new Set<string>();
		for (const ref of request.references) {
			const value = ref.value;
			try {
				if (value instanceof vscode.Uri && value.scheme === 'file') {
					if (seenFiles.has(value.toString())) continue;
					seenFiles.add(value.toString());
					const doc = await vscode.workspace.openTextDocument(value);
					const text = doc.getText();
					const snippet = text.length > MAX_INLINE_FILE ? text.slice(0, MAX_INLINE_FILE) + '\n… [truncated]' : text;
					contextParts.push(`<file path="${value.fsPath}">\n${snippet}\n</file>`);
				} else if (value instanceof vscode.Location && value.uri.scheme === 'file') {
					if (seenFiles.has(value.uri.toString())) continue;
					seenFiles.add(value.uri.toString());
					const doc = await vscode.workspace.openTextDocument(value.uri);
					const snippet = doc.getText(value.range);
					contextParts.push(`<selection file="${value.uri.fsPath}">\n${snippet}\n</selection>`);
				}
			} catch {
				// binary or unreadable file — skip silently
			}
		}
		// Also inline the active editor's selection so "fix this" works on what
		// the user is looking at, without requiring an explicit #selection.
		const activeEditor = vscode.window.activeTextEditor;
		if (
			activeEditor &&
			!activeEditor.selection.isEmpty &&
			activeEditor.document.uri.scheme === 'file' &&
			!seenFiles.has(activeEditor.document.uri.toString())
		) {
			const selText = activeEditor.document.getText(activeEditor.selection);
			if (selText.trim()) {
				contextParts.push(`<selection file="${activeEditor.document.uri.fsPath}">\n${selText}\n</selection>`);
			}
		}
		const contextBlock = contextParts.length
			? `\n\nEditor context provided by the user:\n${contextParts.join('\n\n')}`
			: '';

		// Shape the effective task by command mode:
		//   plan   → plan-only stream: the plan is emitted, nothing executes
		//   review → analysis-only prompt; agents must not modify files
		//   fix    → targeted fix prompt
		//   (none) → the raw prompt as-is
		let planOnly = false;
		let readOnly = false;
		let mode: 'task' | 'plan' | 'review' | 'fix' = 'task';
		let taskText = rawPrompt;
		if (command === 'plan') {
			planOnly = true;
			mode = 'plan';
			taskText = commandArg;
		} else if (command === 'review') {
			// Review is enforced read-only in the AI Core: the executors only
			// get inspection tools, so "don't modify files" is guaranteed.
			mode = 'review';
			readOnly = true;
			taskText = [
				'You are reviewing code for a human. Do NOT modify any files — analysis only.',
				`Review target: ${commandArg}`,
				'Report: what you reviewed, issues found (with file:line), and concrete fix suggestions.',
			].join('\n');
		} else if (command === 'fix') {
			mode = 'fix';
			taskText = [`Fix the following issue, verify your fix works, and report what you changed:`, commandArg].join('\n');
		}
		const fullTask = taskText + contextBlock;

		const taskLabel = mode === 'task' ? rawPrompt : `/${command} ${commandArg}`;
		taskTree.begin(taskLabel);
		progress.begin(taskLabel, mode);
		updateRunningContext();
		response.progress(mode === 'plan' ? 'Planning…' : 'Running multi-agent task…');

		// ---- In-conversation live transcript ----
		// `markdown()` is append-only in chat, so the transcript is a growing
		// log: plan checklist once, then one compact line per event. Streamed
		// text is buffered and flushed on line breaks / size so it renders
		// progressively instead of one part per token.
		let textBuffer = '';
		const flushText = () => {
			if (textBuffer) {
				response.markdown(textBuffer);
				textBuffer = '';
			}
		};
		const markdownChunk = (text: string) => {
			textBuffer += text;
			if (textBuffer.includes('\n')) flushText();
			else if (textBuffer.length > 160) flushText();
		};
		const say = (md: string) => {
			flushText();
			response.markdown(md);
		};

		// Files the agents touched — deduped, become clickable chat references.
		// Store absolute paths directly (no URI round-trip: paths with `#` or
		// `?` would be mangled by toString()/parse()).
		const touchedFiles = new Set<string>();
		const addFileReference = (relPath: string) => {
			const abs = path.isAbsolute(relPath) ? relPath : path.resolve(cwd, relPath);
			if (touchedFiles.has(abs)) return;
			touchedFiles.add(abs);
			response.reference(vscode.Uri.file(abs), new vscode.ThemeIcon('file-code'));
		};

		let provider: string | undefined;
		let steps = 0;
		let stepCount = 0;
		let summary = '';
		const errors: string[] = [];
		// Set when the reviewer agent returns a `fix` verdict — drives the
		// follow-up suggestions ("re-review after the fixes").
		let reviewFixRequested = false;

		const summarizeArgs = (args: Record<string, unknown>): string =>
			Object.entries(args)
				.slice(0, 3)
				.map(([k, v]) => {
					const s = (typeof v === 'string' ? v : JSON.stringify(v)) ?? '';
					return `${k}=${s.length > 40 ? s.slice(0, 40) + '…' : s}`;
				})
				.join(', ');
		const summarizeOutput = (output: string): string => {
			const firstLine = output.split('\n')[0] ?? '';
			return firstLine.length > 90 ? firstLine.slice(0, 90) + '…' : firstLine;
		};

		const controller = new AbortController();
		const tokenListener = token.onCancellationRequested(() => controller.abort());
		activeRun = { cancel: () => controller.abort() };		const onEvent = (event: StreamEvent) => {
		// Mirror every stream event into the live-progress WebView. The
		// provider keeps its own snapshot, so this is safe whether or not the
		// view is open (events are replayed from the snapshot on reveal).
		progress.handleEvent(event);
		switch (event.type) {
			case 'start':
				terminalTree.reset();
				if (showEvents) response.progress(`Providers: ${event.providers.join(', ')}`);
				break;
				case 'plan':
					steps = event.steps.length;
					stepCount = steps;
					taskTree.setSteps(event.steps);
					if (showEvents) {
						const checklist = event.steps.map((s: TaskStep) => `- [ ] Step ${s.id}: ${s.description}`).join('\n');
						say(`### 📋 Plan (${steps} steps)\n${checklist}`);
					}
					break;
				case 'step-status':
					taskTree.updateStep(event.step);
					if (showEvents) {
						if (event.step.status === 'done') say(`- ✅ Step ${event.step.id} done`);
						else if (event.step.status === 'failed')
							say(`- ❌ Step ${event.step.id} failed: ${summarizeOutput(event.step.result ?? '')}`);
						else response.progress(`▶ Step ${event.step.id}: ${event.step.description}`);
					}
					break;
				case 'agent-start':
					if (showEvents) say(`**🤖 ${event.name}** working…`);
					break;
				case 'agent-end':
					if (showEvents) say(`**✓ ${event.name}** done`);
					break;
				case 'tool-call': {
					if (showEvents) say(`⚙️ \`${event.name}(${summarizeArgs(event.args)})\``);
					// Files written/read by tools become clickable references.
					const fileArg = event.args['path'];
					if (typeof fileArg === 'string' && fileArg) addFileReference(fileArg);
					break;
				}
				case 'tool-result':
					if (showEvents) say(`  ${event.ok ? '✓' : '✗'} ${summarizeOutput(event.output)}`);
					break;
			case 'review':
				if (event.verdict === 'fix') reviewFixRequested = true;
				if (showEvents && event.verdict === 'fix') response.progress('↻ Reviewer requested fixes — reapplying…');
				break;
			case 'terminal-start':
				terminalTree.start(event.id, event.command);
				if (showEvents) say(`🖥️ Terminal **${event.id}** started: \`${event.command}\``);
				break;
			case 'terminal-output':
				terminalTree.append(event.id, event.output);
				// Live stream: show the newest lines of long-running command
				// output (e.g. a dev server) right inside the conversation.
				if (showEvents) {
					const lines = event.output.trimEnd().split('\n').filter((l) => l.trim());
					for (const line of lines.slice(-3)) {
						say(`  \`${line.length > 100 ? line.slice(0, 100) + '…' : line}\``);
					}
				}
				break;
			case 'terminal-exit':
				terminalTree.exit(event.id, event.exitCode);
				if (showEvents) say(`🖥️ Terminal **${event.id}** exited (code ${event.exitCode ?? 'unknown'})`);
				break;
				case 'delta':
					onDelta(event.delta);
					break;
				case 'usage':
					if (showEvents) {
						const perProvider = event.perProvider
							.map(
								(p) =>
									`${p.providerId}: ${p.calls} calls · ${p.inputTokens}/${p.outputTokens} tokens · $${p.costUsd.toFixed(4)} · avg ${p.avgLatencyMs}ms`,
							)
							.join('  ');
						say(
							`### 📊 Usage\n\`${event.totals.calls} calls · ${event.totals.inputTokens}/${event.totals.outputTokens} tokens · $${event.totals.costUsd.toFixed(4)} · avg ${event.totals.avgLatencyMs}ms\`${
								perProvider ? `\n\n${perProvider}` : ''
							}`,
						);
					}
					break;
				case 'done':
					summary = event.summary;
					steps = event.steps.length;
					taskTree.finish();
					break;
				case 'error':
					errors.push(event.error);
					taskTree.finish();
					break;
			}
		};

		const onDelta = (delta: StreamDelta) => {
			switch (delta.type) {
				case 'text':
					markdownChunk(delta.text);
					break;
				case 'provider':
					provider = delta.providerId;
					if (showEvents) response.progress(`⇄ ${delta.displayName ?? delta.providerId}`);
					break;
				case 'toolCall':
					// Tool calls are surfaced as first-class `tool-call`/`tool-result`
					// events (with args + outcome); echoing the raw delta here
					// would show every tool twice in the chat.
					break;
				case 'usage':
					// Shown once in aggregate by the `usage` event.
					break;
				case 'error':
					errors.push(delta.error);
					break;
				case 'done':
					break;
			}
		};

		try {
			await runTask(runtime, {
				task: fullTask,
				cwd,
				planOnly,
				readOnly,
				signal: controller.signal,
				onEvent,
				onError: (message) => {
					errors.push(message);
					flushText();
					say(`> ⚠️ ${message}`);
				},
				onExit: () => {
					flushText();
					taskTree.finish();
					updateRunningContext();
				},
				token,
			});
			flushText();

			if (controller.signal.aborted) {
				say(`_⚠️ Task cancelled by the user._`);
			} else if (summary) {
				say(`---\n\n**✅ ${summary}**`);
			} else if (errors.length > 0) {
				say(`---\n\n_⚠️ ${errors[errors.length - 1]}_`);
			}

			// Show the touched files as clickable references + a compact list.
			if (touchedFiles.size > 0) {
				const names = [...touchedFiles].map((abs) => path.basename(abs)).join(', ');
				say(`**Files touched:** \`${names}\``);
			}

			// Editor-UI action button for every finished run.
			response.button({
				title: 'Show Task List',
				command: 'idexal.tasks.focus',
			});

			return {
				metadata: {
					steps,
					stepCount,
					provider,
					completed: !!summary,
					cancelled: controller.signal.aborted,
					filesTouched: touchedFiles.size,
					mode,
					planOnly,
					hadErrors: errors.length > 0,
					reviewFixRequested,
					testCommand: testCommand ?? null,
				},
			} satisfies vscode.ChatResult;
		} finally {
			// On cancellation there is no done/error event, so tell the WebView
			// explicitly; on normal completion the done/error event already
			// updated the snapshot (end() is then a no-op).
			progress.end(controller.signal.aborted);
			tokenListener.dispose();
			activeRun = undefined;
			updateRunningContext();
		}
	});

	participant.iconPath = new vscode.ThemeIcon('sparkle');
	// The follow-ups are driven by the last run's result metadata, so they
	// reflect what actually happened: a plan-only run suggests executing the
	// plan; a run that touched files suggests running the real test command;
	// a run with errors or reviewer-fix verdicts suggests fixing / re-review.
	participant.followupProvider = {
		provideFollowups(result) {
			const meta = result.metadata as
				| {
						cancelled?: boolean;
						mode?: string;
						planOnly?: boolean;
						completed?: boolean;
						filesTouched?: number;
						hadErrors?: boolean;
						reviewFixRequested?: boolean;
						testCommand?: string | null;
				  }
				| undefined;
			if (meta?.cancelled) {
				return [];
			}

			const followups: vscode.ChatFollowup[] = [];

			if (meta?.mode === 'plan') {
				// Plan-only run: the plan is the deliverable — offer to run it.
				followups.push({ prompt: 'Execute this plan', label: '▶ Execute this plan', participant: PARTICIPANT_ID });
				followups.push({ prompt: 'Refine the plan and reconsider the approach', label: 'Refine the plan', participant: PARTICIPANT_ID });
				return followups;
			}

			// Files were changed → verifying with the workspace's real test
			// command is the highest-value next step.
			if ((meta?.filesTouched ?? 0) > 0) {
				if (meta?.testCommand) {
					followups.push({ prompt: `Run \`${meta.testCommand}\` to verify the changes`, participant: PARTICIPANT_ID });
				} else {
					followups.push({ prompt: 'Run the tests to verify the changes', participant: PARTICIPANT_ID });
				}
			}

			// The reviewer asked for fixes → re-reviewing is a natural next step.
			if (meta?.reviewFixRequested) {
				followups.push({ prompt: 'Re-review the changes after the fixes', participant: PARTICIPANT_ID });
			}

			// The run errored out → offer to fix what went wrong.
			if (meta?.hadErrors) {
				followups.push({ prompt: 'Fix the errors from the last run', participant: PARTICIPANT_ID });
			}

			// Baseline continuations for every successful run.
			if (meta?.completed) {
				followups.push({ prompt: 'Explain what you did and why', participant: PARTICIPANT_ID });
			}
			followups.push({ prompt: 'Review the changes for issues', participant: PARTICIPANT_ID });
			followups.push({ prompt: 'Write tests for what you changed', participant: PARTICIPANT_ID });
			return followups;
		},
	};

	context.subscriptions.push(participant);

	// Show the tasks view when the extension activates via chat.
	void vscode.commands.executeCommand('idexal.tasks.focus').then(undefined, () => {
		// The view may not be visible yet — that's fine, it activates on demand.
	});
}

export function deactivate(): void {
	// Child processes are killed when their cancellation token fires.
}

// Re-export for consumers that import types.
export { TaskTreeProvider } from './taskTreeProvider';
export type { ResolvedRuntime } from './aiCoreClient';
