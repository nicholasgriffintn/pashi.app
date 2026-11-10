import { queryOptions } from "@tanstack/react-query";

import { appViewOrigin, appViewPath, POLYCHAT_APP_META_KEY } from "../../shared/mcp-apps";
import { isRecord } from "../../shared/records";
import { mcpRequest } from "./mcp-client";

export interface McpApp {
	allow: string;
	category: string;
	description: string;
	id: string;
	name: string;
	uses: string;
	viewOrigin: string;
	viewUrl: string;
}

interface McpView {
	allow: string;
	name: string;
}

const PERMISSION_FEATURES: Record<string, string> = {
	camera: "camera",
	clipboardWrite: "clipboard-write",
	microphone: "microphone",
};

function metaOf(value: unknown) {
	return isRecord(value) && isRecord(value._meta) ? value._meta : undefined;
}

function listOf(result: unknown, key: string): unknown[] {
	const list = isRecord(result) ? result[key] : undefined;

	return Array.isArray(list) ? list : [];
}

function toView(resource: unknown): [string, McpView] | undefined {
	if (
		!isRecord(resource) ||
		typeof resource.uri !== "string" ||
		typeof resource.name !== "string"
	) {
		return undefined;
	}

	const ui = metaOf(resource)?.ui;
	const permissions = isRecord(ui) && isRecord(ui.permissions) ? Object.keys(ui.permissions) : [];

	return [
		resource.uri,
		{
			allow: permissions.flatMap((permission) => PERMISSION_FEATURES[permission] ?? []).join("; "),
			name: resource.name,
		},
	];
}

function toApp(tool: unknown, views: Map<string, McpView>): McpApp | undefined {
	const meta = metaOf(tool);
	const app = meta?.[POLYCHAT_APP_META_KEY];
	const view =
		isRecord(meta?.ui) && typeof meta.ui.resourceUri === "string"
			? views.get(meta.ui.resourceUri)
			: undefined;

	if (!isRecord(app) || !view || typeof app.name !== "string") {
		return undefined;
	}

	const viewOrigin = appViewOrigin(window.location.origin);

	return {
		allow: view.allow,
		category: typeof app.category === "string" ? app.category : "",
		description: typeof app.description === "string" ? app.description : "",
		id: view.name,
		name: app.name,
		uses: typeof app.uses === "string" ? app.uses : "",
		viewOrigin,
		viewUrl: `${viewOrigin}${appViewPath(view.name)}`,
	};
}

export function mcpAppsQueryOptions(apiKey: string) {
	return queryOptions({
		queryFn: async ({ signal }) => {
			const [tools, resources] = await Promise.all([
				mcpRequest("tools/list", {}, apiKey, signal),
				mcpRequest("resources/list", {}, apiKey, signal),
			]);
			const views = new Map(
				listOf(resources, "resources").flatMap((resource) => {
					const view = toView(resource);

					return view ? [view] : [];
				}),
			);

			return listOf(tools, "tools").flatMap((tool) => toApp(tool, views) ?? []);
		},
		queryKey: ["mcp-apps", apiKey],
	});
}
