import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { AppPreviewCard } from "../components/AppPreviewCard";
import { McpAccessNotice } from "../components/McpAccessNotice";
import { McpAppFrame } from "../components/McpAppFrame";
import { useApiKey } from "../lib/api-key-context";
import { appPreviewsQueryOptions, isAccessDenied } from "../lib/app-previews";
import { mcpAppsQueryOptions } from "../lib/mcp-apps";
import { useDocumentMetadata } from "../lib/use-document-metadata";

export function AppPage() {
	const { appId } = useParams();
	const { apiKey } = useApiKey();
	const apps = useQuery(mcpAppsQueryOptions(apiKey));
	const app = apps.data?.find((entry) => entry.id === appId);
	const signedOut = isAccessDenied(apps.error);
	const previews = useQuery({ ...appPreviewsQueryOptions, enabled: signedOut });
	const preview = signedOut ? previews.data?.apps.find((entry) => entry.id === appId) : undefined;

	useDocumentMetadata(
		app?.name ?? preview?.name ?? "Apps",
		app?.description ?? preview?.description,
	);

	return (
		<main className="page app-page">
			<p className="app-page-back">
				<Link to="/labs/apps">
					<span aria-hidden="true">←</span> All apps
				</Link>
			</p>
			{apps.error ? <McpAccessNotice error={apps.error} /> : null}
			{apps.isPending ? (
				<p className="route-loading" role="status">
					Loading
				</p>
			) : null}
			{(apps.data && !app) || (signedOut && previews.data && !preview) ? (
				<p className="page-lede">There is no app called {appId}.</p>
			) : null}
			{app ? <McpAppFrame app={app} key={app.id} /> : null}
			{preview ? (
				<div className="project-grid">
					<AppPreviewCard full preview={preview} />
				</div>
			) : null}
		</main>
	);
}
