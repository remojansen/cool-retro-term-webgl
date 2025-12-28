import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	outDir: "dist",
	dts: true,
	bundle: true,
	external: ["three", "@xterm/xterm"],
	platform: "browser",
	clean: true,
	treeshake: true,
	sourcemap: true,
});
