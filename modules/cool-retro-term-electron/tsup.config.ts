import { defineConfig } from "tsup";

export default defineConfig([
	// Main process
	{
		entry: { main: "src/main.ts" },
		format: ["cjs"],
		platform: "node",
		target: "node20",
		outDir: "dist",
		clean: true,
		sourcemap: true,
		external: ["electron", "node-pty"],
		outExtension: () => ({ js: ".cjs" }),
	},
	// Preload script
	{
		entry: { preload: "src/preload.ts" },
		format: ["cjs"],
		platform: "node",
		target: "node20",
		outDir: "dist",
		sourcemap: true,
		external: ["electron"],
		outExtension: () => ({ js: ".cjs" }),
	},
	// Renderer process
	{
		entry: { renderer: "src/renderer.ts" },
		format: ["esm"],
		platform: "browser",
		target: "es2022",
		outDir: "dist",
		sourcemap: true,
		external: [],
		noExternal: ["cool-retro-term-renderer", "@xterm/xterm", "three"],
		// Bundle everything for the renderer
		bundle: true,
		minify: false,
		splitting: false,
	},
]);
