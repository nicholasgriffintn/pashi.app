import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { McpAccessNotice } from "../components/McpAccessNotice";
import { useApiKey } from "../lib/api-key-context";
import { mcpAppsQueryOptions } from "../lib/mcp-apps";
import { useStaticPageMetadata } from "../lib/use-document-metadata";

export function AppsPage() {
	const { apiKey } = useApiKey();
	const apps = useQuery(mcpAppsQueryOptions(apiKey));

	useStaticPageMetadata("/labs/apps");

	return (
		<main className="page">
			<h1>Apps</h1>
			<p className="page-lede">
				The games and studios Pashi serves over MCP, running here against the same server.
			</p>
			{apps.error ? <McpAccessNotice error={apps.error} /> : null}
			{apps.isPending ? (
				<p className="route-loading" role="status">
					Loading
				</p>
			) : null}
			<div className="project-grid app-grid">
				{apps.data?.map((app) => (
					<Link className="project-card" key={app.id} to={`/labs/apps/${app.id}`}>
						<span className="project-card-status" data-status="lab">
							{app.category}
						</span>
						<h2>{app.name}</h2>
						<p>{app.description}</p>
						<p className="app-card-uses">{app.uses}</p>
						<span className="card-action">
							Open <span aria-hidden="true">→</span>
						</span>
					</Link>
				))}
			</div>
		</main>
	);
}
