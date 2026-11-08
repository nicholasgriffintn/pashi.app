export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";
export const POLYCHAT_APP_META_KEY = "app.polychat/app";
export const PASHI_SITE_URL = "https://pashi.app";

export const MCP_VIEW_URIS = {
	charades: "ui://pashi/charades",
	converter: "ui://pashi/converter",
	generator: "ui://pashi/generator",
} as const;

export type McpViewUri = (typeof MCP_VIEW_URIS)[keyof typeof MCP_VIEW_URIS];

type McpAppPermission = Record<string, never>;

export interface McpAppUiMeta {
	csp: {
		connectDomains: string[];
		resourceDomains: string[];
	};
	permissions?: {
		camera?: McpAppPermission;
		clipboardWrite?: McpAppPermission;
		microphone?: McpAppPermission;
	};
	prefersBorder: boolean;
}

export interface McpToolUiMeta {
	resourceUri: McpViewUri;
}

export interface PolychatAppMeta {
	category?: string;
	description?: string;
	layout?: "contained" | "workspace";
	name?: string;
}
