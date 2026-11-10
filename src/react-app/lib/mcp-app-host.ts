import { MCP_APP_PROTOCOL_VERSION } from "../../shared/mcp-apps";
import { isRecord } from "../../shared/records";
import { mcpRequest } from "./mcp-client";
import type { Theme } from "./use-theme";

export interface ViewMessage {
	id?: number | string;
	method: string;
	params: Record<string, unknown>;
}

export interface ViewSize {
	height: number;
}

interface HostContext {
	apiKey: string;
	theme: Theme;
}

const METHOD_NOT_FOUND = -32601;

export class ViewRequestError extends Error {
	readonly code: number;

	constructor(message: string, code = -32000) {
		super(message);
		this.name = "ViewRequestError";
		this.code = code;
	}
}

export function readViewMessage(data: unknown): ViewMessage | undefined {
	if (!isRecord(data) || data.jsonrpc !== "2.0" || typeof data.method !== "string") {
		return undefined;
	}

	return {
		id: typeof data.id === "number" || typeof data.id === "string" ? data.id : undefined,
		method: data.method,
		params: isRecord(data.params) ? data.params : {},
	};
}

export function readViewSize(message: ViewMessage): ViewSize | undefined {
	const height = message.params.height;

	return message.method === "ui/notifications/size-changed" &&
		typeof height === "number" &&
		Number.isFinite(height) &&
		height > 0
		? { height: Math.ceil(height) }
		: undefined;
}

function openExternalLink(value: unknown) {
	const url = typeof value === "string" ? URL.parse(value) : null;

	if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
		throw new ViewRequestError("Only web links can be opened.");
	}

	window.open(url, "_blank", "noopener,noreferrer");
}

export async function answerViewRequest(message: ViewMessage, context: HostContext) {
	if (message.method === "ui/initialize") {
		return {
			hostCapabilities: { openLinks: {}, serverTools: {} },
			hostContext: { displayMode: "inline", theme: context.theme },
			hostInfo: { name: "pashi", version: "1.0.0" },
			protocolVersion: MCP_APP_PROTOCOL_VERSION,
		};
	}

	if (message.method === "tools/call") {
		return mcpRequest(
			"tools/call",
			{ arguments: message.params.arguments ?? {}, name: message.params.name },
			context.apiKey,
		);
	}

	if (message.method === "ui/open-link") {
		openExternalLink(message.params.url);

		return {};
	}

	if (message.method === "ping") {
		return {};
	}

	throw new ViewRequestError(`Pashi cannot handle ${message.method} here.`, METHOD_NOT_FOUND);
}
