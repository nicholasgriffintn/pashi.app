import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/query-client";
import { HubPage } from "./pages/HubPage";
import { LegacyToolRedirect } from "./pages/LegacyToolRedirect";
import { ToolsPage } from "./pages/ToolsPage";

import "./App.css";

const AboutPage = lazy(() =>
	import("./pages/AboutPage").then((module) => ({ default: module.AboutPage })),
);
const ApiDocsPage = lazy(() =>
	import("./pages/ApiDocsPage").then((module) => ({ default: module.ApiDocsPage })),
);
const AskPage = lazy(() =>
	import("./pages/AskPage").then((module) => ({ default: module.AskPage })),
);
const ExplainPage = lazy(() =>
	import("./pages/ExplainPage").then((module) => ({ default: module.ExplainPage })),
);
const LabsPage = lazy(() =>
	import("./pages/LabsPage").then((module) => ({ default: module.LabsPage })),
);

function RouteFallback() {
	return (
		<p className="route-loading" role="status">
			Loading
		</p>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<ErrorBoundary label="Pashi">
					<Suspense fallback={<RouteFallback />}>
						<Routes>
							<Route element={<HubPage />} path="/" />
							<Route element={<ToolsPage mode="generate" />} path="/tools" />
							<Route element={<ToolsPage mode="convert" />} path="/tools/convert/:toolId" />
							<Route element={<ToolsPage mode="generate" />} path="/tools/:toolId" />
							<Route element={<LabsPage />} path="/labs" />
							<Route element={<AskPage />} path="/labs/ask" />
							<Route element={<ExplainPage />} path="/labs/explain" />
							<Route element={<AboutPage />} path="/about" />
							<Route element={<ApiDocsPage />} path="/api" />
							<Route element={<LegacyToolRedirect prefix="convert" />} path="/convert/:toolId" />
							<Route element={<LegacyToolRedirect prefix="generate" />} path="/:toolId" />
							<Route element={<Navigate replace to="/" />} path="*" />
						</Routes>
					</Suspense>
				</ErrorBoundary>
			</BrowserRouter>
		</QueryClientProvider>
	);
}

export default App;
