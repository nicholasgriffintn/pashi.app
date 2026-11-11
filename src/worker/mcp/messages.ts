import { isRecord } from "../../shared/records";
import { findConverterTool } from "../services/converters/catalogue";
import type { EventFields } from "../services/events";
import { findGenerator } from "../services/generators/catalogue";
import { MCP_MAX_BATCH } from "./protocol";

export type McpCallSummary = Pick<EventFields, "kind" | "toolId" | "toolType">;

export async function readMcpMessages(request: Request): Promise<unknown[]> {
	let body: unknown;

	try {
		body = await request.clone().json();
	} catch {
		return [];
	}

	const messages = Array.isArray(body) ? body : [body];

	return messages.length > MCP_MAX_BATCH ? [] : messages;
}

function catalogueTarget(argumentsValue: unknown): McpCallSummary {
	const toolId =
		isRecord(argumentsValue) && typeof argumentsValue.type === "string" ? argumentsValue.type : "";
	const generator = findGenerator(toolId);

	if (generator) {
		return { toolId: generator.id, toolType: "generator" };
	}

	const converter = findConverterTool(toolId);

	return converter ? { toolId: converter.id, toolType: "converter" } : {};
}

function summariseMessage(message: unknown): McpCallSummary {
	if (!isRecord(message) || typeof message.method !== "string") {
		return {};
	}

	if (message.method !== "tools/call" || !isRecord(message.params)) {
		return { kind: message.method };
	}

	return {
		...catalogueTarget(message.params.arguments),
		kind: typeof message.params.name === "string" ? message.params.name : message.method,
	};
}

export function summariseMcpCalls(messages: readonly unknown[]): McpCallSummary[] {
	return messages.length > 0 ? messages.map(summariseMessage) : [{}];
}
