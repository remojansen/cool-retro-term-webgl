/**
 * Electron Preload Script
 *
 * This script runs in the renderer process before web content loads.
 * It provides a secure bridge between the renderer and main processes
 * using contextBridge to expose a limited API for terminal communication.
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * Terminal API exposed to the renderer process
 */
export interface TerminalAPI {
	/**
	 * Initialize the PTY process with the specified terminal size
	 */
	init: (cols: number, rows: number) => Promise<{ success: boolean }>;

	/**
	 * Send input data to the PTY process
	 */
	write: (data: string) => void;

	/**
	 * Resize the PTY process
	 */
	resize: (cols: number, rows: number) => void;

	/**
	 * Get the PTY process ID
	 */
	getProcessId: () => Promise<number | null>;

	/**
	 * Listen for data from the PTY process
	 */
	onData: (callback: (data: string) => void) => () => void;

	/**
	 * Listen for PTY process exit
	 */
	onExit: (
		callback: (info: { exitCode: number; signal?: number }) => void,
	) => () => void;

	/**
	 * Listen for window resize events
	 */
	onWindowResize: (
		callback: (size: { width: number; height: number }) => void,
	) => () => void;
}

// Expose the terminal API to the renderer
contextBridge.exposeInMainWorld("terminalAPI", {
	init: (cols: number, rows: number) => {
		return ipcRenderer.invoke("terminal:init", { cols, rows });
	},

	write: (data: string) => {
		ipcRenderer.send("terminal:input", data);
	},

	resize: (cols: number, rows: number) => {
		ipcRenderer.send("terminal:resize", { cols, rows });
	},

	getProcessId: () => {
		return ipcRenderer.invoke("terminal:get-process-id");
	},

	onData: (callback: (data: string) => void) => {
		const listener = (_event: Electron.IpcRendererEvent, data: string) => {
			callback(data);
		};
		ipcRenderer.on("terminal:data", listener);
		return () => {
			ipcRenderer.removeListener("terminal:data", listener);
		};
	},

	onExit: (
		callback: (info: { exitCode: number; signal?: number }) => void,
	) => {
		const listener = (
			_event: Electron.IpcRendererEvent,
			info: { exitCode: number; signal?: number },
		) => {
			callback(info);
		};
		ipcRenderer.on("terminal:exit", listener);
		return () => {
			ipcRenderer.removeListener("terminal:exit", listener);
		};
	},

	onWindowResize: (
		callback: (size: { width: number; height: number }) => void,
	) => {
		const listener = (
			_event: Electron.IpcRendererEvent,
			size: { width: number; height: number },
		) => {
			callback(size);
		};
		ipcRenderer.on("terminal:resize-window", listener);
		return () => {
			ipcRenderer.removeListener("terminal:resize-window", listener);
		};
	},
} satisfies TerminalAPI);

// Type declaration for the renderer
declare global {
	interface Window {
		terminalAPI: TerminalAPI;
	}
}
