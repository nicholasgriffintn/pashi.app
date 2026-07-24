import { useMemo, useState, type ReactNode } from "react";

import { ApiKeyContext } from "../lib/api-key-context";

export function ApiKeyProvider({ children }: { children: ReactNode }) {
	const [apiKey, setApiKey] = useState("");
	const value = useMemo(() => ({ apiKey, setApiKey }), [apiKey]);

	return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}
