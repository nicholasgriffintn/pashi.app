import { isRecord } from "../../shared/records";
import type { PolicyName } from "../security/policies";
import { MCP_MAX_BATCH } from "./protocol";
import { mcpToolRatePolicy } from "./tools";

function toolCallName(message: unknown) {
	if (!isRecord(message) || message.method !== "tools/call" || !isRecord(message.params)) {
		return undefined;
	}

	return typeof message.params.name === "string" ? message.params.name : "";
}

export async function readMcpCallPolicies(request: Request): Promise<PolicyName[]> {
	let body: unknown;

	try {
		body = await request.clone().json();
	} catch {
		return [];
	}

	const messages = Array.isArray(body) ? body : [body];

	if (messages.length > MCP_MAX_BATCH) {
		return [];
	}

	return messages.flatMap((message) => {
		const name = toolCallName(message);

		return name === undefined ? [] : [mcpToolRatePolicy(name)];
	});
}
