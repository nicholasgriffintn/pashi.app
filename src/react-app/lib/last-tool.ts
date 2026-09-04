export type ToolMode = "convert" | "generate";

const STORAGE_PREFIX = "pashi:last-tool:";

export const DEFAULT_CONVERTER_PATH = "/tools/convert/markdown-to-jira";
export const DEFAULT_GENERATOR_PATH = "/tools";

function storageKey(mode: ToolMode) {
	return `${STORAGE_PREFIX}${mode}`;
}

export function rememberLastToolPath(mode: ToolMode, path: string) {
	try {
		window.localStorage.setItem(storageKey(mode), path);
	} catch {
		return;
	}
}

export function lastToolPath(mode: ToolMode) {
	let stored: string | null = null;

	try {
		stored = window.localStorage.getItem(storageKey(mode));
	} catch {
		stored = null;
	}

	if (mode === "convert") {
		return stored?.startsWith("/tools/convert/") ? stored : DEFAULT_CONVERTER_PATH;
	}

	return stored?.startsWith("/tools") && !stored.startsWith("/tools/convert")
		? stored
		: DEFAULT_GENERATOR_PATH;
}
