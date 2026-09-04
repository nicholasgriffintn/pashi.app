import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";
import { ApiKeyProvider } from "./components/ApiKeyProvider.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ApiKeyProvider>
			<App />
		</ApiKeyProvider>
	</StrictMode>,
);
