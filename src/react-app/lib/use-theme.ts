import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pashi:theme";

function readStoredTheme(): Theme | undefined {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);

		return stored === "dark" || stored === "light" ? stored : undefined;
	} catch {
		return undefined;
	}
}

function preferredTheme(): Theme {
	return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
}

function readAppliedTheme(): Theme {
	return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribeToAppliedTheme(onChange: () => void) {
	const observer = new MutationObserver(onChange);

	observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });

	return () => observer.disconnect();
}

export function useAppliedTheme() {
	return useSyncExternalStore(subscribeToAppliedTheme, readAppliedTheme);
}

export function initialTheme(): Theme {
	return readStoredTheme() ?? preferredTheme();
}

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(initialTheme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((current) => {
			const next = current === "dark" ? "light" : "dark";

			try {
				window.localStorage.setItem(STORAGE_KEY, next);
			} catch {
				return next;
			}

			return next;
		});
	}, []);

	return { theme, toggleTheme };
}
