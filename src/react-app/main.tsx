import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";
import { ApiKeyProvider } from "./components/ApiKeyProvider.tsx";
import { applyTheme, initialTheme } from "./lib/use-theme.ts";

applyTheme(initialTheme());

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ApiKeyProvider>
			<App />
		</ApiKeyProvider>
	</StrictMode>,
);
