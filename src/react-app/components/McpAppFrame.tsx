import { useQuery } from "@tanstack/react-query";

import { useApiKey } from "../lib/api-key-context";
import { mcpAppDocumentQueryOptions, type McpApp } from "../lib/mcp-apps";
import { useMcpAppHost } from "../lib/use-mcp-app-host";
import { McpAccessNotice } from "./McpAccessNotice";

export function McpAppFrame({ app }: { app: McpApp }) {
	const { apiKey } = useApiKey();
	const view = useQuery(mcpAppDocumentQueryOptions(app.resourceUri, apiKey));
	const { frameRef, height } = useMcpAppHost(apiKey);

	if (view.error) {
		return <McpAccessNotice error={view.error} />;
	}

	if (!view.data) {
		return (
			<p className="route-loading" role="status">
				Opening {app.name}
			</p>
		);
	}

	return (
		<iframe
			allow={view.data.allow}
			className="app-frame"
			ref={frameRef}
			sandbox="allow-scripts allow-forms allow-downloads"
			srcDoc={view.data.html}
			style={height ? { height } : undefined}
			title={app.name}
		/>
	);
}
