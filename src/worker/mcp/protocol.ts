import { isRecord } from "../../shared/records";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { listMcpResources, readMcpResource } from "./resources";
import { errorToolResult } from "./tool-result";
import { callMcpTool, listMcpTools, type McpCaller } from "./tools";

const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

export const MCP_MAX_BATCH = 20;

interface JsonRpcRequest {
	id?: number | string | null;
	method: string;
	params?: Record<string, unknown>;
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as JsonRpcRequest).method === "string"
	);
}

function result(id: JsonRpcRequest["id"], value: unknown) {
	return { id: id ?? null, jsonrpc: "2.0" as const, result: value };
}

function failure(id: JsonRpcRequest["id"], code: number, message: string) {
	return { error: { code, message }, id: id ?? null, jsonrpc: "2.0" as const };
}

function negotiateVersion(params: Record<string, unknown> | undefined) {
	const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : "";

	return SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : DEFAULT_PROTOCOL_VERSION;
}

async function handleRequest(request: JsonRpcRequest, env: ConversionEnv, caller: McpCaller) {
	if (request.method === "initialize") {
		return result(request.id, {
			capabilities: {
				resources: { listChanged: false, subscribe: false },
				tools: { listChanged: false },
			},
			protocolVersion: negotiateVersion(request.params),
			serverInfo: { name: "pashi", version: "1.0.0" },
		});
	}

	if (request.method === "tools/list") {
		return result(request.id, { tools: listMcpTools() });
	}

	if (request.method === "resources/list") {
		return result(request.id, { resources: listMcpResources() });
	}

	if (request.method === "resources/templates/list") {
		return result(request.id, { resourceTemplates: [] });
	}

	if (request.method === "resources/read") {
		const uri = typeof request.params?.uri === "string" ? request.params.uri : "";
		const resource = readMcpResource(uri, caller.origin);

		return resource
			? result(request.id, resource)
			: failure(request.id, -32002, `Resource not found: ${uri}`);
	}

	if (request.method === "tools/call") {
		const name = typeof request.params?.name === "string" ? request.params.name : "";
		const argumentsValue = isRecord(request.params?.arguments) ? request.params.arguments : {};

		try {
			return result(request.id, await callMcpTool(name, argumentsValue, env, caller));
		} catch (error) {
			return result(request.id, errorToolResult(error));
		}
	}

	if (request.method === "ping") {
		return result(request.id, {});
	}

	return failure(request.id, -32601, `Unknown method: ${request.method}`);
}

export async function createMcpResponse(request: Request, env: ConversionEnv, caller: McpCaller) {
	if (request.method !== "POST") {
		return Response.json(failure(null, -32600, "Use POST for MCP requests."), { status: 405 });
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json(failure(null, -32700, "Invalid JSON."), { status: 400 });
	}

	if (Array.isArray(body) && body.length > MCP_MAX_BATCH) {
		return Response.json(
			failure(null, -32600, `Send at most ${MCP_MAX_BATCH} messages in one batch.`),
			{ status: 422 },
		);
	}

	if (Array.isArray(body)) {
		const responses = await Promise.all(
			body.filter(isJsonRpcRequest).map((entry) => handleRequest(entry, env, caller)),
		);

		return Response.json(responses);
	}

	if (!isJsonRpcRequest(body)) {
		return Response.json(failure(null, -32600, "Invalid request."), { status: 400 });
	}

	const response = await handleRequest(body, env, caller);

	if (body.id === undefined) {
		return new Response(null, { status: 202 });
	}

	return Response.json(response);
}
