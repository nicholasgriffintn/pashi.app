import { isRecord } from "../../shared/records";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { listMcpResources, readMcpResource } from "./resources";
import { errorToolResult } from "./tool-result";
import { callMcpTool, canReadMcpResource, listMcpTools, type McpCaller } from "./tools";

export const MCP_SERVER_INFO = { name: "pashi", version: "1.0.0" };

export const MCP_SERVER_CAPABILITIES = {
	resources: { listChanged: false, subscribe: false },
	tools: { listChanged: false },
};

export type McpCacheScope = "private" | "public";

export type McpNameParam = "name" | "uri";

interface McpMethodContext {
	caller: McpCaller;
	env: ConversionEnv;
	params: Record<string, unknown> | undefined;
}

type McpMethodOutcome =
	| { cacheScope?: McpCacheScope; result: object }
	| { missingResource: string };

interface McpMethod {
	nameParam?: McpNameParam;
	run: (context: McpMethodContext) => McpMethodOutcome | Promise<McpMethodOutcome>;
}

function stringParam(params: Record<string, unknown> | undefined, key: McpNameParam) {
	const value = params?.[key];

	return typeof value === "string" ? value : "";
}

const MCP_METHODS = new Map<string, McpMethod>([
	[
		"tools/list",
		{ run: ({ caller }) => ({ cacheScope: "private", result: { tools: listMcpTools(caller) } }) },
	],
	[
		"resources/list",
		{
			run: ({ caller }) => ({
				cacheScope: "private",
				result: {
					resources: listMcpResources().filter((resource) =>
						canReadMcpResource(resource.uri, caller),
					),
				},
			}),
		},
	],
	[
		"resources/templates/list",
		{ run: () => ({ cacheScope: "public", result: { resourceTemplates: [] } }) },
	],
	[
		"resources/read",
		{
			nameParam: "uri",
			run: ({ caller, params }) => {
				const uri = stringParam(params, "uri");
				const resource = canReadMcpResource(uri, caller)
					? readMcpResource(uri, caller.origin)
					: undefined;

				return resource ? { cacheScope: "private", result: resource } : { missingResource: uri };
			},
		},
	],
	[
		"tools/call",
		{
			nameParam: "name",
			run: async ({ caller, env, params }) => {
				const argumentsValue = isRecord(params?.arguments) ? params.arguments : {};

				try {
					return {
						result: await callMcpTool(stringParam(params, "name"), argumentsValue, env, caller),
					};
				} catch (error) {
					return { result: errorToolResult(error) };
				}
			},
		},
	],
]);

export function findMcpMethod(name: string) {
	return MCP_METHODS.get(name);
}
