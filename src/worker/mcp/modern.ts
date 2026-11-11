import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { buildMcpInstructions } from "./instructions";
import { jsonRpcFailure, jsonRpcResult, type JsonRpcRequest } from "./json-rpc";
import {
	findMcpMethod,
	MCP_SERVER_CAPABILITIES,
	MCP_SERVER_INFO,
	type McpCacheScope,
} from "./methods";
import { rejectModernEnvelope, rejectModernName } from "./modern-envelope";
import type { McpCaller } from "./tools";
import { SUPPORTED_PROTOCOL_VERSIONS } from "./versions";

const SERVER_INFO_META_KEY = "io.modelcontextprotocol/serverInfo";
const CACHE_TTL_MS = 300_000;

function complete(message: JsonRpcRequest, value: object, cacheScope?: McpCacheScope) {
	return Response.json(
		jsonRpcResult(message.id, {
			...value,
			...(cacheScope ? { cacheScope, ttlMs: CACHE_TTL_MS } : {}),
			_meta: { [SERVER_INFO_META_KEY]: MCP_SERVER_INFO },
			resultType: "complete",
		}),
	);
}

export async function createModernMcpResponse(
	request: Request,
	message: JsonRpcRequest,
	env: ConversionEnv,
	caller: McpCaller,
) {
	if (message.id === undefined) {
		return new Response(null, { status: 202 });
	}

	const rejected = rejectModernEnvelope(request, message);

	if (rejected) {
		return rejected;
	}

	if (message.method === "server/discover") {
		return complete(
			message,
			{
				capabilities: MCP_SERVER_CAPABILITIES,
				instructions: buildMcpInstructions(caller),
				supportedVersions: SUPPORTED_PROTOCOL_VERSIONS,
			},
			"private",
		);
	}

	const method = findMcpMethod(message.method);

	if (!method) {
		return Response.json(jsonRpcFailure(message.id, -32601, `Unknown method: ${message.method}`), {
			status: 404,
		});
	}

	const misnamed = method.nameParam
		? rejectModernName(request, message, method.nameParam)
		: undefined;

	if (misnamed) {
		return misnamed;
	}

	const outcome = await method.run({ caller, env, params: message.params });

	return "missingResource" in outcome
		? Response.json(
				jsonRpcFailure(message.id, -32602, "Resource not found", { uri: outcome.missingResource }),
			)
		: complete(message, outcome.result, outcome.cacheScope);
}
