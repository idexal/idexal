import { contextBridge, ipcRenderer } from 'electron';

export interface CoreEvent {
	type: 'start' | 'delta' | 'done' | 'error';
	text?: string;
	summary?: string;
	error?: string;
}

contextBridge.exposeInMainWorld('idexal', {
	runTask: (task: string, onEvent: (event: CoreEvent) => void): (() => void) => {
		const channel = `idexal-core-event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const listener = (_: unknown, event: CoreEvent) => onEvent(event);
		ipcRenderer.on(channel, listener);
		ipcRenderer.send('idexal-run-task', { task, channel });
		return () => ipcRenderer.removeListener(channel, listener);
	},
});
