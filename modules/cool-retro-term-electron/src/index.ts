/**
 * cool-retro-term-electron
 *
 * An Electron-based CRT terminal application using cool-retro-term-renderer.
 * This module provides a native desktop terminal with authentic CRT visual effects.
 *
 * @example
 * Run the electron app:
 * ```bash
 * npm run build
 * npm start
 * ```
 *
 * @packageDocumentation
 */

export { CRTTerminalApp } from "./renderer";
export type { TerminalAPI } from "./preload";
