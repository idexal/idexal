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
	/** Run an agent. `mode: 'agent'` uses the multi-agent orchestrator. */
	runTask(
		task: string,
		onEvent: (event: CoreEvent) => void,
		mode: 'stream' | 'agent' = 'stream',
	): () => void {
		const channel = `idexal-core-event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const listener = (_: unknown, event: CoreEvent) => onEvent(event);
		ipcRenderer.on(channel, listener);
		ipcRenderer.send('idexal-run-task', { task, channel, mode });
		return () => ipcRenderer.removeListener(channel, listener);
	},

	workspace: {
		open: () => ipcRenderer.invoke('workspace:open'),
		current: () => ipcRenderer.invoke('workspace:current'),
		list: (relative: string) => ipcRenderer.invoke('workspace:list', relative),
		read: (relative: string) => ipcRenderer.invoke('workspace:read', relative),
		write: (relative: string, content: string) => ipcRenderer.invoke('workspace:write', relative, content),
	},

	terminal: {
		start(id: string, onData: (data: string) => void, onExit: (code: number | null) => void) {
			const dataChannel = `terminal:data:${id}`;
			const exitChannel = `terminal:exit:${id}`;
			const dataListener = (_: unknown, data: string) => onData(data);
			const exitListener = (_: unknown, code: number | null) => onExit(code);
			ipcRenderer.on(dataChannel, dataListener);
			ipcRenderer.on(exitChannel, exitListener);
			void ipcRenderer.invoke('terminal:start', id);
			return () => {
				ipcRenderer.removeListener(dataChannel, dataListener);
				ipcRenderer.removeListener(exitChannel, exitListener);
				void ipcRenderer.invoke('terminal:stop', id);
			};
		},
		write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
	},

	git: {
		status: () => ipcRenderer.invoke('git:status'),
		diff: (file: string) => ipcRenderer.invoke('git:diff', file),
	},

	settings: {
		load: () => ipcRenderer.invoke('settings:load'),
		save: (cfg: unknown) => ipcRenderer.invoke('settings:save', cfg),
		testProvider: (id: string) => ipcRenderer.invoke('settings:test-provider', id),
	},
});
