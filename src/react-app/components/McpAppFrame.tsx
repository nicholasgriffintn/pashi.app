import { useApiKey } from "../lib/api-key-context";
import type { McpApp } from "../lib/mcp-apps";
import { useMcpAppHost } from "../lib/use-mcp-app-host";

export function McpAppFrame({ app }: { app: McpApp }) {
	const { apiKey } = useApiKey();
	const { frameRef, height } = useMcpAppHost(apiKey, app.viewOrigin);

	return (
		<iframe
			allow={app.allow}
			className="app-frame"
			ref={frameRef}
			sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
			src={app.viewUrl}
			style={height ? { height } : undefined}
			title={app.name}
		/>
	);
}
