import { createContext, useContext } from "react";

export interface ApiKeyContextValue {
	apiKey: string;
	setApiKey: (value: string) => void;
}

export const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

export function useApiKey() {
	const context = useContext(ApiKeyContext);

	if (!context) {
		throw new Error("useApiKey must be used within ApiKeyProvider.");
	}

	return context;
}
