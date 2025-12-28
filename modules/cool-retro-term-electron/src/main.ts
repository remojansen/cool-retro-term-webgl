/**
 * Electron Main Process
 *
 * This file creates the main Electron window and manages the PTY (pseudo-terminal)
 * process that provides a real shell connection. It uses node-pty to spawn the shell
 * and communicates with the renderer process via IPC.
 */

import { spawn } from "node-pty";
import type { IPty } from "node-pty";
import { app, BrowserWindow, ipcMain, screen } from "electron";
import * as path from "node:path";
import * as os from "node:os";

let mainWindow: BrowserWindow | null = null;
let ptyProcess: IPty | null = null;

/**
 * Get the default shell for the current platform
 */
function getDefaultShell(): string {
	if (process.platform === "win32") {
		return process.env.COMSPEC || "cmd.exe";
	}
	return process.env.SHELL || "/bin/bash";
}

/**
 * Create the main browser window
 */
function createWindow(): void {
	// Get the primary display's size
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	mainWindow = new BrowserWindow({
		width,
		height,
		backgroundColor: "#000000",
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: false, // Required for node-pty IPC
		},
		// CRT-style window appearance
		titleBarStyle: "hiddenInset",
		vibrancy: "under-window",
		visualEffectState: "active",
	});

	// Load the renderer HTML
	mainWindow.loadFile(path.join(__dirname, "../public/index.html"));

	// Open DevTools in development
	if (process.env.NODE_ENV === "development") {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
		if (ptyProcess) {
			ptyProcess.kill();
			ptyProcess = null;
		}
	});

	// Handle resize events
	mainWindow.on("resize", () => {
		if (mainWindow) {
			const [width, height] = mainWindow.getContentSize();
			mainWindow.webContents.send("terminal:resize-window", { width, height });
		}
	});
}

/**
 * Initialize the PTY process
 */
function initializePty(cols: number, rows: number): void {
	if (ptyProcess) {
		ptyProcess.kill();
	}

	const shell = getDefaultShell();
	const shellArgs = process.platform === "win32" ? [] : ["--login"];

	ptyProcess = spawn(shell, shellArgs, {
		name: "xterm-256color",
		cols,
		rows,
		cwd: os.homedir(),
		env: process.env as { [key: string]: string },
	});

	// Forward PTY output to the renderer
	ptyProcess.onData((data: string) => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("terminal:data", data);
		}
	});

	// Handle PTY exit
	ptyProcess.onExit(({ exitCode, signal }) => {
		console.log(`PTY exited with code ${exitCode}, signal ${signal}`);
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("terminal:exit", { exitCode, signal });
		}
		// Quit the app when the terminal exits
		ptyProcess = null;
		app.quit();
	});
}

// IPC handlers for terminal communication
ipcMain.handle("terminal:init", (_event, { cols, rows }) => {
	initializePty(cols, rows);
	return { success: true };
});

ipcMain.on("terminal:input", (_event, data: string) => {
	if (ptyProcess) {
		ptyProcess.write(data);
	}
});

ipcMain.on("terminal:resize", (_event, { cols, rows }) => {
	if (ptyProcess) {
		try {
			ptyProcess.resize(cols, rows);
		} catch (err) {
			console.error("Failed to resize PTY:", err);
		}
	}
});

ipcMain.handle("terminal:get-process-id", () => {
	return ptyProcess?.pid ?? null;
});

// App lifecycle events
app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("before-quit", () => {
	if (ptyProcess) {
		ptyProcess.kill();
		ptyProcess = null;
	}
});

export { createWindow, getDefaultShell };
