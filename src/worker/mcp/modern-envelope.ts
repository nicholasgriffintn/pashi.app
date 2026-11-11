import { isRecord } from "../../shared/records";
import { base64Decode } from "../utils/generation";
import { jsonRpcFailure, type JsonRpcRequest } from "./json-rpc";
import type { McpNameParam } from "./methods";
import {
	LEGACY_PROTOCOL_VERSIONS,
	MODERN_PROTOCOL_VERSION,
	SUPPORTED_PROTOCOL_VERSIONS,
} from "./versions";

const META_PARAM = "_meta";
const PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";
const CLIENT_CAPABILITIES_META_KEY = "io.modelcontextprotocol/clientCapabilities";

const PROTOCOL_VERSION_HEADER = "MCP-Protocol-Version";
const METHOD_HEADER = "Mcp-Method";
const NAME_HEADER = "Mcp-Name";
const BASE64_SENTINEL = /^=\?base64\?(.*)\?=$/;

const HEADER_MISMATCH = -32020;
const UNSUPPORTED_PROTOCOL_VERSION = -32022;
const INVALID_PARAMS = -32602;

function readMeta(message: JsonRpcRequest) {
	const meta = message.params?.[META_PARAM];

	return isRecord(meta) ? meta : undefined;
}

function badRequest(message: JsonRpcRequest, code: number, text: string, data?: unknown) {
	return Response.json(jsonRpcFailure(message.id, code, text, data), { status: 400 });
}

function headerMismatch(message: JsonRpcRequest, header: string) {
	return badRequest(
		message,
		HEADER_MISMATCH,
		`Header mismatch: the ${header} header is missing or does not match the request body.`,
	);
}

function missingMeta(message: JsonRpcRequest, key: string) {
	return badRequest(message, INVALID_PARAMS, `Missing required _meta field: ${key}`);
}

function decodeHeaderValue(value: string) {
	const encoded = BASE64_SENTINEL.exec(value)?.[1];

	if (encoded === undefined) {
		return value;
	}

	try {
		return base64Decode(encoded);
	} catch {
		return undefined;
	}
}

export function isModernRequest(request: Request, message: JsonRpcRequest) {
	if (message.method === "initialize") {
		return false;
	}

	if (request.headers.get(PROTOCOL_VERSION_HEADER) === MODERN_PROTOCOL_VERSION) {
		return true;
	}

	const meta = readMeta(message);

	if (meta === undefined) {
		return false;
	}

	const version = meta[PROTOCOL_VERSION_META_KEY];

	if (version === undefined) {
		return meta[CLIENT_CAPABILITIES_META_KEY] !== undefined;
	}

	return typeof version !== "string" || !LEGACY_PROTOCOL_VERSIONS.includes(version);
}

export function rejectModernEnvelope(request: Request, message: JsonRpcRequest) {
	const meta = readMeta(message);
	const version = meta?.[PROTOCOL_VERSION_META_KEY];
	const versionHeader = request.headers.get(PROTOCOL_VERSION_HEADER);

	if (versionHeader === null) {
		return headerMismatch(message, PROTOCOL_VERSION_HEADER);
	}

	if (typeof version !== "string") {
		return missingMeta(message, PROTOCOL_VERSION_META_KEY);
	}

	if (versionHeader !== version) {
		return headerMismatch(message, PROTOCOL_VERSION_HEADER);
	}

	if (version !== MODERN_PROTOCOL_VERSION) {
		return badRequest(message, UNSUPPORTED_PROTOCOL_VERSION, "Unsupported protocol version", {
			requested: version,
			supported: SUPPORTED_PROTOCOL_VERSIONS,
		});
	}

	if (request.headers.get(METHOD_HEADER) !== message.method) {
		return headerMismatch(message, METHOD_HEADER);
	}

	if (!isRecord(meta?.[CLIENT_CAPABILITIES_META_KEY])) {
		return missingMeta(message, CLIENT_CAPABILITIES_META_KEY);
	}

	return undefined;
}

export function rejectModernName(request: Request, message: JsonRpcRequest, param: McpNameParam) {
	const header = request.headers.get(NAME_HEADER);
	const name = header === null ? undefined : decodeHeaderValue(header);

	return name === undefined || name !== message.params?.[param]
		? headerMismatch(message, NAME_HEADER)
		: undefined;
}
