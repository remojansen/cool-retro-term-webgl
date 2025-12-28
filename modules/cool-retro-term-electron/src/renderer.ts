/**
 * Electron Renderer Process
 *
 * This file runs in the browser context and sets up:
 * 1. XTerm.js terminal instance
 * 2. TerminalText and TerminalFrame renderers (matching the web app)
 * 3. Connection between XTerm and the PTY via IPC
 */

import { Terminal } from "@xterm/xterm";
import * as THREE from "three";
import {
	TerminalFrame,
	TerminalText,
	XTermConnector,
} from "cool-retro-term-renderer";

// Declare the terminal API from preload
declare global {
	interface Window {
		terminalAPI: {
			init: (cols: number, rows: number) => Promise<{ success: boolean }>;
			write: (data: string) => void;
			resize: (cols: number, rows: number) => void;
			getProcessId: () => Promise<number | null>;
			onData: (callback: (data: string) => void) => () => void;
			onExit: (
				callback: (info: { exitCode: number; signal?: number }) => void,
			) => () => void;
			onWindowResize: (
				callback: (size: { width: number; height: number }) => void,
			) => () => void;
		};
	}
}

/**
 * CRT Terminal Application
 *
 * Manages the XTerm.js terminal, CRT renderer, and PTY connection.
 * Uses TerminalText and TerminalFrame directly (like the web app) to preserve
 * the internally calculated mixed background color for authentic CRT appearance.
 */
class CRTTerminalApp {
	private xterm: Terminal;
	private container: HTMLElement;
	private cleanupFunctions: (() => void)[] = [];

	// Three.js components
	private scene: THREE.Scene;
	private camera: THREE.OrthographicCamera;
	private renderer: THREE.WebGLRenderer;
	private terminalText: TerminalText;
	private terminalFrame: TerminalFrame;
	private connector: XTermConnector | null = null;
	private animationFrameId: number | null = null;

	constructor(container: HTMLElement) {
		this.container = container;

		// Create the Three.js scene
		this.scene = new THREE.Scene();

		// Create orthographic camera for 2D rendering
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		this.camera.position.z = 1;

		// Create the WebGL renderer (use window dimensions like web app)
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setClearColor(0x000000);
		this.container.appendChild(this.renderer.domElement);

		// Create the terminal text renderer (use window dimensions like web app)
		this.terminalText = new TerminalText(
			window.innerWidth,
			window.innerHeight,
		);
		this.terminalText.mesh.position.z = 0;
		this.scene.add(this.terminalText.mesh);

		// Create the terminal frame (use window dimensions like web app)
		this.terminalFrame = new TerminalFrame(
			window.innerWidth,
			window.innerHeight,
		);
		this.terminalFrame.mesh.position.z = 0.1;
		this.scene.add(this.terminalFrame.mesh);

		// Create XTerm.js terminal (hidden, used only for buffer/input management)
		this.xterm = new Terminal({
			cursorBlink: true,
			cursorStyle: "block",
			fontFamily: "monospace",
			fontSize: 16,
			allowProposedApi: true,
		});

		// Open XTerm in a hidden container (required for buffer initialization)
		// Use off-screen positioning instead of visibility:hidden so XTerm can still receive focus
		const hiddenContainer = document.createElement("div");
		hiddenContainer.style.cssText =
			"position: absolute; left: -9999px; top: -9999px; width: 800px; height: 600px;";
		document.body.appendChild(hiddenContainer);
		this.xterm.open(hiddenContainer);

		// Resize XTerm to match the terminal grid size
		const gridSize = this.terminalText.getGridSize();
		if (gridSize.cols > 0 && gridSize.rows > 0) {
			this.xterm.resize(gridSize.cols, gridSize.rows);
		}

		// Create the connector between XTerm and TerminalText
		this.connector = new XTermConnector(this.xterm, this.terminalText);
		this.connector.setupMouseSelection(this.container);

		// Listen for grid size changes and resize XTerm accordingly
		this.terminalText.onGridSizeChange((cols, rows) => {
			if (cols > 0 && rows > 0 && this.connector) {
				this.xterm.resize(cols, rows);
				this.connector.sync();
			}
		});

		// Initial sync
		this.connector.sync();

		// Handle window resize
		window.addEventListener("resize", this.handleResize);

		// Start the animation loop
		this.animate();
	}

	/**
	 * Handle window resize events (use window dimensions like web app)
	 */
	private handleResize = (): void => {
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.terminalText.updateSize(window.innerWidth, window.innerHeight);
		this.terminalFrame.updateSize(window.innerWidth, window.innerHeight);

		// Resize XTerm to match the new grid size
		if (this.connector) {
			const gridSize = this.terminalText.getGridSize();
			if (gridSize.cols > 0 && gridSize.rows > 0) {
				this.xterm.resize(gridSize.cols, gridSize.rows);
				this.connector.sync();
			}
		}
	};

	/**
	 * Animation loop (matching web app order exactly)
	 */
	private animate = (): void => {
		// Update time for dynamic shader effects
		this.terminalText.updateTime(performance.now());

		// Render static pass first (to render target)
		this.terminalText.renderStaticPass(this.renderer);

		// Request next frame
		this.animationFrameId = requestAnimationFrame(this.animate);

		// Render the main scene
		this.renderer.render(this.scene, this.camera);
	};

	/**
	 * Initialize the terminal and connect to PTY
	 */
	async init(): Promise<void> {
		// Get the grid size from terminal text
		const gridSize = this.terminalText.getGridSize();
		const cols = gridSize.cols > 0 ? gridSize.cols : 80;
		const rows = gridSize.rows > 0 ? gridSize.rows : 24;

		// Resize XTerm to match
		this.xterm.resize(cols, rows);

		// Initialize the PTY process
		await window.terminalAPI.init(cols, rows);

		// Set up data flow from PTY to XTerm
		const removeDataListener = window.terminalAPI.onData((data) => {
			this.xterm.write(data);
		});
		this.cleanupFunctions.push(removeDataListener);

		// Set up data flow from XTerm to PTY (keyboard input)
		const onDataDisposable = this.xterm.onData((data) => {
			window.terminalAPI.write(data);
		});
		this.cleanupFunctions.push(() => onDataDisposable.dispose());

		// Handle PTY exit
		const removeExitListener = window.terminalAPI.onExit((info) => {
			console.log(`Terminal exited with code ${info.exitCode}`);
			this.xterm.write(
				`\r\n\x1b[90m[Process exited with code ${info.exitCode}]\x1b[0m\r\n`,
			);
		});
		this.cleanupFunctions.push(removeExitListener);

		// Handle window resize from main process
		const removeResizeListener = window.terminalAPI.onWindowResize(() => {
			// Trigger resize handling
			this.handleResize();
			// Sync the PTY size
			const newGridSize = this.terminalText.getGridSize();
			if (newGridSize.cols > 0 && newGridSize.rows > 0) {
				window.terminalAPI.resize(newGridSize.cols, newGridSize.rows);
			}
		});
		this.cleanupFunctions.push(removeResizeListener);

		// Focus the terminal
		this.xterm.focus();
	}

	/**
	 * Get the XTerm instance
	 */
	getXTerm(): Terminal {
		return this.xterm;
	}

	/**
	 * Get the TerminalText renderer
	 */
	getTerminalText(): TerminalText {
		return this.terminalText;
	}

	/**
	 * Get the TerminalFrame renderer
	 */
	getTerminalFrame(): TerminalFrame {
		return this.terminalFrame;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		// Stop animation loop
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Remove event listeners
		window.removeEventListener("resize", this.handleResize);

		// Run cleanup functions
		for (const cleanup of this.cleanupFunctions) {
			cleanup();
		}
		this.cleanupFunctions = [];

		// Dispose connector
		if (this.connector) {
			this.connector.dispose();
			this.connector = null;
		}

		// Dispose Three.js resources
		this.terminalText.dispose();
		this.terminalFrame.dispose();
		this.renderer.dispose();

		// Remove renderer from DOM
		if (this.renderer.domElement.parentNode) {
			this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
		}

		// Dispose XTerm
		this.xterm.dispose();
	}
}

// Initialize the application when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
	const container = document.getElementById("terminal");
	if (!container) {
		console.error("Terminal container not found");
		return;
	}

	const app = new CRTTerminalApp(container);
	await app.init();

	// Force a resize after initialization to ensure correct dimensions
	// This fixes issues where window.innerWidth/Height aren't accurate on first load in Electron
	requestAnimationFrame(() => {
		window.dispatchEvent(new Event("resize"));
	});

	// Expose app for debugging
	(window as unknown as { app: CRTTerminalApp }).app = app;
});

export { CRTTerminalApp };
