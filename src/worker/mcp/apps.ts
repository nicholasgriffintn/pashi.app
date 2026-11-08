export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";
export const MCP_APP_STANDALONE_META_KEY = "app.polychat/standalone";
export const PASHI_SITE_URL = "https://pashi.app";

export const MCP_VIEW_URIS = {
	charades: "ui://pashi/charades",
	converter: "ui://pashi/converter",
	generator: "ui://pashi/generator",
	photoSorter: "ui://pashi/photo-sorter",
	twentyQuestions: "ui://pashi/twenty-questions",
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
