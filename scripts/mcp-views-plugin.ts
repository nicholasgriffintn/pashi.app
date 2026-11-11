import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build, type Plugin } from "vite";

const PREFIX = "virtual:mcp-view/";
const RESOLVED_PREFIX = `\0${PREFIX}`;
const VIEWS_ROOT = fileURLToPath(new URL("../src/mcp-views", import.meta.url));
const SHARED_UI_ROOT = fileURLToPath(new URL("../src/shared-ui", import.meta.url));

interface BundledView {
	css: string;
	script: string;
	worker?: string;
}

interface BundledEntry {
	css: string;
	script: string;
}

function listFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);

		return statSync(path).isDirectory() ? listFiles(path) : [path];
	});
}

async function bundleEntry(entry: string): Promise<BundledEntry> {
	const output = await build({
		build: {
			cssCodeSplit: false,
			emptyOutDir: false,
			lib: {
				entry,
				formats: ["iife"],
				name: "PashiView",
			},
			minify: true,
			write: false,
		},
		configFile: false,
		define: { "process.env.NODE_ENV": JSON.stringify("production") },
		logLevel: "warn",
		mode: "production",
		oxc: { jsx: { development: false, runtime: "automatic" } },
	});
	const chunks = (Array.isArray(output) ? output : [output]).flatMap((result) =>
		"output" in result ? result.output : [],
	);
	const script = chunks.find((chunk) => chunk.type === "chunk")?.code;
	const css = chunks
		.flatMap((chunk) => (chunk.type === "asset" && chunk.fileName.endsWith(".css") ? [chunk] : []))
		.map((asset) =>
			typeof asset.source === "string" ? asset.source : new TextDecoder().decode(asset.source),
		)
		.join("\n");

	if (!script) {
		throw new Error(`${entry} did not produce a script.`);
	}

	return { css, script };
}

async function bundleView(name: string): Promise<BundledView> {
	const view = await bundleEntry(join(VIEWS_ROOT, name, "main.tsx"));
	const workerEntry = join(VIEWS_ROOT, name, "worker.ts");

	if (!existsSync(workerEntry)) {
		return view;
	}

	return { ...view, worker: (await bundleEntry(workerEntry)).script };
}

function failedView(name: string, error: unknown): BundledView {
	const message = error instanceof Error ? error.message : String(error);

	return {
		css: "",
		script: `document.getElementById("root").textContent = ${JSON.stringify(`The ${name} view failed to build: ${message}`)};`,
	};
}

export function mcpViews(): Plugin {
	let serving = false;

	return {
		configResolved(config) {
			serving = config.command === "serve";
		},
		load: {
			async handler(id) {
				if (!id.startsWith(RESOLVED_PREFIX)) {
					return undefined;
				}

				const name = id.slice(RESOLVED_PREFIX.length);

				const viewRoot = join(VIEWS_ROOT, name);

				for (const file of [
					...(existsSync(viewRoot) ? listFiles(viewRoot) : []),
					...listFiles(join(VIEWS_ROOT, "shared")),
					...listFiles(SHARED_UI_ROOT),
				]) {
					this.addWatchFile(file);
				}

				try {
					return `export default ${JSON.stringify(await bundleView(name))};`;
				} catch (error) {
					if (!serving) {
						throw error;
					}

					this.warn(`MCP view ${name} failed to build: ${String(error)}`);

					return `export default ${JSON.stringify(failedView(name, error))};`;
				}
			},
		},
		name: "pashi-mcp-views",
		resolveId(id) {
			return id.startsWith(PREFIX) ? `\0${id}` : undefined;
		},
	};
}
