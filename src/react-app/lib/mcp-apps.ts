import { queryOptions } from "@tanstack/react-query";

import { POLYCHAT_APP_META_KEY } from "../../shared/mcp-apps";
import { isRecord } from "../../shared/records";
import { mcpRequest } from "./mcp-client";

export interface McpApp {
	category: string;
	description: string;
	id: string;
	name: string;
	resourceUri: string;
	uses: string;
}

export interface McpAppDocument {
	allow: string;
	html: string;
}

const PERMISSION_FEATURES: Record<string, string> = {
	camera: "camera",
	clipboardWrite: "clipboard-write",
	microphone: "microphone",
};

function toApp(tool: unknown): McpApp | undefined {
	const meta = isRecord(tool) && isRecord(tool._meta) ? tool._meta : undefined;
	const app = meta?.[POLYCHAT_APP_META_KEY];
	const resourceUri = isRecord(meta?.ui) ? meta.ui.resourceUri : undefined;

	if (!isRecord(app) || typeof resourceUri !== "string" || typeof app.name !== "string") {
		return undefined;
	}

	return {
		category: typeof app.category === "string" ? app.category : "",
		description: typeof app.description === "string" ? app.description : "",
		id: resourceUri.slice(resourceUri.lastIndexOf("/") + 1),
		name: app.name,
		resourceUri,
		uses: typeof app.uses === "string" ? app.uses : "",
	};
}

function toDocument(result: unknown): McpAppDocument {
	const content =
		isRecord(result) && Array.isArray(result.contents) ? result.contents[0] : undefined;

	if (!isRecord(content) || typeof content.text !== "string") {
		throw new Error("This app was served without its view.");
	}

	const ui = isRecord(content._meta) && isRecord(content._meta.ui) ? content._meta.ui : undefined;
	const permissions = isRecord(ui?.permissions) ? Object.keys(ui.permissions) : [];

	return {
		allow: permissions.flatMap((permission) => PERMISSION_FEATURES[permission] ?? []).join("; "),
		html: content.text,
	};
}

export function mcpAppsQueryOptions(apiKey: string) {
	return queryOptions({
		queryFn: async ({ signal }) => {
			const result = await mcpRequest("tools/list", {}, apiKey, signal);
			const tools = isRecord(result) && Array.isArray(result.tools) ? result.tools : [];

			return tools.flatMap((tool) => toApp(tool) ?? []);
		},
		queryKey: ["mcp-apps", apiKey],
	});
}

export function mcpAppDocumentQueryOptions(resourceUri: string, apiKey: string) {
	return queryOptions({
		queryFn: async ({ signal }) =>
			toDocument(await mcpRequest("resources/read", { uri: resourceUri }, apiKey, signal)),
		queryKey: ["mcp-app-document", resourceUri, apiKey],
		staleTime: Infinity,
	});
}
