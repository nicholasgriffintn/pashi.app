import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ApiKeyContext } from "../lib/api-key-context";

const STORAGE_KEY = "pashi:api-key";

function readStoredKey() {
	try {
		return window.localStorage.getItem(STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

function writeStoredKey(value: string) {
	try {
		if (value) {
			window.localStorage.setItem(STORAGE_KEY, value);
		} else {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		return;
	}
}

export function ApiKeyProvider({ children }: { children: ReactNode }) {
	const [apiKey, setApiKeyState] = useState(readStoredKey);

	const setApiKey = useCallback((value: string) => {
		setApiKeyState(value);
		writeStoredKey(value.trim());
	}, []);

	const value = useMemo(() => ({ apiKey, setApiKey }), [apiKey, setApiKey]);

	return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}
