// Idexal — preload bridge
//
// The single, explicit surface the renderer is allowed to touch. Node
// integration stays off in the renderer; everything privileged goes
// through these named channels so the attack surface is enumerable.

import { contextBridge, ipcRenderer } from 'electron';

export interface CoreEvent {
	type: string;
	[key: string]: unknown;
}

contextBridge.exposeInMainWorld('idexal', {
	/**
	 * Run an agent. `mode: 'agent'` uses the multi-agent orchestrator.
	 *
	 * `pin` names the provider (and optionally the model) this one task must
	 * use. Pinning turns fallback off in the core by design — see Pin in
	 * `core/src/providers/mod.rs`. Omit it to keep automatic fallback.
	 */
	runTask(
		task: string,
		onEvent: (event: CoreEvent) => void,
		mode: 'stream' | 'agent' = 'stream',
		sessionId?: string,
		pin?: { provider?: string; model?: string },
	): () => void {
		const channel = `idexal-core-event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const listener = (_: unknown, event: CoreEvent) => onEvent(event);
		ipcRenderer.on(channel, listener);
		ipcRenderer.send('idexal-run-task', { task, channel, mode, sessionId, pin });
		return () => ipcRenderer.removeListener(channel, listener);
	},

	workspace: {
		open: () => ipcRenderer.invoke('workspace:open'),
		current: () => ipcRenderer.invoke('workspace:current'),
		list: (relative: string) => ipcRenderer.invoke('workspace:list', relative),
		read: (relative: string) => ipcRenderer.invoke('workspace:read', relative),
		write: (relative: string, content: string) => ipcRenderer.invoke('workspace:write', relative, content),
		pickFiles: () => ipcRenderer.invoke('workspace:pick-files'),
	},

	/**
	 * Scheduled tasks. They fire only while Idexal is open — a scheduler
	 * that outlives the app has to be the operating system's, and the CLI
	 * exists for that.
	 */
	automations: {
		list: () => ipcRenderer.invoke('automations:list'),
		save: (a: unknown) => ipcRenderer.invoke('automations:save', a),
		remove: (id: string) => ipcRenderer.invoke('automations:delete', id),
		runNow: (id: string) => ipcRenderer.invoke('automations:run-now', id),
		watch(on: (event: string, payload: unknown) => void) {
			const names = ['started', 'finished', 'skipped'];
			const listeners = names.map((name) => {
				const listener = (_: unknown, payload: unknown) => on(name, payload);
				ipcRenderer.on(`automations:${name}`, listener);
				return { name, listener };
			});
			void ipcRenderer.invoke('automations:watch');
			return () => {
				for (const { name, listener } of listeners) ipcRenderer.removeListener(`automations:${name}`, listener);
			};
		},
	},

	/** Saved prompts. Stored as JSON beside the user's config so they can be
	 *  read, edited and backed up without the app. */
	skills: {
		list: () => ipcRenderer.invoke('skills:list'),
		save: (skill: { id?: string; name: string; prompt: string }) => ipcRenderer.invoke('skills:save', skill),
		remove: (id: string) => ipcRenderer.invoke('skills:delete', id),
	},

	terminal: {
		start(
			id: string,
			onData: (data: string) => void,
			onExit: (code: number | null) => void,
			size?: { cols: number; rows: number },
		) {
			const dataChannel = `terminal:data:${id}`;
			const exitChannel = `terminal:exit:${id}`;
			const dataListener = (_: unknown, data: string) => onData(data);
			const exitListener = (_: unknown, code: number | null) => onExit(code);
			ipcRenderer.on(dataChannel, dataListener);
			ipcRenderer.on(exitChannel, exitListener);
			// The PTY is born with a size; getting it right up front spares
			// the shell from drawing its first prompt at the wrong width.
			void ipcRenderer.invoke('terminal:start', id, size?.cols, size?.rows);
			return () => {
				ipcRenderer.removeListener(dataChannel, dataListener);
				ipcRenderer.removeListener(exitChannel, exitListener);
				void ipcRenderer.invoke('terminal:stop', id);
			};
		},
		write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
		resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
	},

	usage: {
		load: () => ipcRenderer.invoke('usage:load'),
	},

	/**
	 * Debugger. `start` returns once the program is attached and running;
	 * everything after that arrives on the event channels, because a
	 * debugger is a stream of pauses, not a request/response.
	 */
	debug: {
		start(
			file: string,
			breakpoints: Array<{ file: string; line: number }>,
			on: (event: string, payload: unknown) => void,
		) {
			const names = ['started', 'paused', 'resumed', 'output', 'terminated', 'breakpoint'];
			const listeners = names.map((name) => {
				const listener = (_: unknown, payload: unknown) => on(name, payload);
				ipcRenderer.on(`debug:${name}`, listener);
				return { name, listener };
			});
			const stop = () => {
				for (const { name, listener } of listeners) ipcRenderer.removeListener(`debug:${name}`, listener);
			};
			return { done: ipcRenderer.invoke('debug:start', file, breakpoints), stop };
		},
		cont: () => ipcRenderer.invoke('debug:continue'),
		stepOver: () => ipcRenderer.invoke('debug:step-over'),
		stepInto: () => ipcRenderer.invoke('debug:step-into'),
		stepOut: () => ipcRenderer.invoke('debug:step-out'),
		setBreakpoint: (file: string, line: number) => ipcRenderer.invoke('debug:set-breakpoint', file, line),
		stop: () => ipcRenderer.invoke('debug:stop'),
	},

	/**
	 * Checkpoints: a snapshot is taken before every write the agent makes.
	 * `restore` consumes the snapshot it restores, so calling it repeatedly
	 * walks back through history one step at a time — it is not a single
	 * "revert to the beginning" button. None of this touches git.
	 */
	undo: {
		list: () => ipcRenderer.invoke('undo:list'),
		restore: (relative?: string) => ipcRenderer.invoke('undo:restore', relative),
		clear: () => ipcRenderer.invoke('undo:clear'),
	},

	sessions: {
		list: () => ipcRenderer.invoke('sessions:list'),
		show: (id: string) => ipcRenderer.invoke('sessions:show', id),
		remove: (id: string) => ipcRenderer.invoke('sessions:delete', id),
	},

	git: {
		status: () => ipcRenderer.invoke('git:status'),
		diff: (file: string) => ipcRenderer.invoke('git:diff', file),
		stage: (file: string) => ipcRenderer.invoke('git:stage', file),
		unstage: (file: string) => ipcRenderer.invoke('git:unstage', file),
		commit: (message: string) => ipcRenderer.invoke('git:commit', message),
	},

	settings: {
		load: () => ipcRenderer.invoke('settings:load'),
		save: (cfg: unknown) => ipcRenderer.invoke('settings:save', cfg),
		testProvider: (id: string) => ipcRenderer.invoke('settings:test-provider', id),
	},
});
