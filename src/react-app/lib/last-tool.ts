import type { AppMode } from "../components/AppModeTabs";

const STORAGE_PREFIX = "pashi:last-tool:";

export const DEFAULT_CONVERTER_PATH = "/convert/markdown-to-jira";

function storageKey(mode: AppMode) {
	return `${STORAGE_PREFIX}${mode}`;
}

export function rememberLastToolPath(mode: AppMode, path: string) {
	try {
		window.localStorage.setItem(storageKey(mode), path);
	} catch {
		return;
	}
}

export function lastToolPath(mode: AppMode) {
	let stored: string | null = null;

	try {
		stored = window.localStorage.getItem(storageKey(mode));
	} catch {
		stored = null;
	}

	if (mode === "convert") {
		return stored?.startsWith("/convert/") ? stored : DEFAULT_CONVERTER_PATH;
	}

	return stored && stored.startsWith("/") && !stored.startsWith("/convert/") ? stored : "/";
}
