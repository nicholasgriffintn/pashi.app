import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { siteOriginOfAppView } from "../shared/mcp-apps.ts";

import "./index.css";
import App from "./App.tsx";
import { ApiKeyProvider } from "./components/ApiKeyProvider.tsx";
import { applyTheme, initialTheme } from "./lib/use-theme.ts";

const siteOrigin = siteOriginOfAppView(window.location.href);

if (siteOrigin) {
	window.location.replace(`${siteOrigin}${window.location.pathname}`);
} else {
	applyTheme(initialTheme());

	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<ApiKeyProvider>
				<App />
			</ApiKeyProvider>
		</StrictMode>,
	);
}
