import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { buildMcpInstructions } from "./instructions";
import { isJsonRpcRequest, jsonRpcFailure, jsonRpcResult, type JsonRpcRequest } from "./json-rpc";
import { findMcpMethod, MCP_SERVER_CAPABILITIES, MCP_SERVER_INFO } from "./methods";
import { createModernMcpResponse } from "./modern";
import { isModernRequest } from "./modern-envelope";
import type { McpCaller } from "./tools";
import {
	DEFAULT_LEGACY_PROTOCOL_VERSION,
	LEGACY_PROTOCOL_VERSIONS,
	MODERN_PROTOCOL_VERSION,
} from "./versions";

export const MCP_MAX_BATCH = 20;

function negotiateVersion(params: Record<string, unknown> | undefined) {
	const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : "";

	return LEGACY_PROTOCOL_VERSIONS.includes(requested) ? requested : DEFAULT_LEGACY_PROTOCOL_VERSION;
}

async function handleRequest(request: JsonRpcRequest, env: ConversionEnv, caller: McpCaller) {
	if (request.method === "initialize") {
		return jsonRpcResult(request.id, {
			capabilities: MCP_SERVER_CAPABILITIES,
			instructions: buildMcpInstructions(caller),
			protocolVersion: negotiateVersion(request.params),
			serverInfo: MCP_SERVER_INFO,
		});
	}

	if (request.method === "ping") {
		return jsonRpcResult(request.id, {});
	}

	const method = findMcpMethod(request.method);

	if (!method) {
		return jsonRpcFailure(request.id, -32601, `Unknown method: ${request.method}`);
	}

	const outcome = await method.run({ caller, env, params: request.params });

	return "missingResource" in outcome
		? jsonRpcFailure(request.id, -32002, `Resource not found: ${outcome.missingResource}`)
		: jsonRpcResult(request.id, outcome.result);
}

export async function createMcpResponse(request: Request, env: ConversionEnv, caller: McpCaller) {
	if (request.method !== "POST") {
		return Response.json(jsonRpcFailure(null, -32600, "Use POST for MCP requests."), {
			status: 405,
		});
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json(jsonRpcFailure(null, -32700, "Invalid JSON."), { status: 400 });
	}

	if (Array.isArray(body) && body.length > MCP_MAX_BATCH) {
		return Response.json(
			jsonRpcFailure(null, -32600, `Send at most ${MCP_MAX_BATCH} messages in one batch.`),
			{ status: 422 },
		);
	}

	if (Array.isArray(body)) {
		const messages = body.filter(isJsonRpcRequest);

		if (messages.some((entry) => isModernRequest(request, entry))) {
			return Response.json(
				jsonRpcFailure(
					null,
					-32600,
					`Send each ${MODERN_PROTOCOL_VERSION} request in its own POST.`,
				),
				{ status: 400 },
			);
		}

		const responses = await Promise.all(messages.map((entry) => handleRequest(entry, env, caller)));

		return Response.json(responses);
	}

	if (!isJsonRpcRequest(body)) {
		return Response.json(jsonRpcFailure(null, -32600, "Invalid request."), { status: 400 });
	}

	if (isModernRequest(request, body)) {
		return createModernMcpResponse(request, body, env, caller);
	}

	const response = await handleRequest(body, env, caller);

	if (body.id === undefined) {
		return new Response(null, { status: 202 });
	}

	return Response.json(response);
}
