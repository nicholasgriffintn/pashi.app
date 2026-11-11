import { isRecord } from "../../shared/records";
import type { PolicyName } from "../security/policies";
import { MCP_MAX_BATCH } from "./protocol";
import { mcpToolRatePolicy } from "./tools";

function toolCallPolicy(message: unknown) {
	if (!isRecord(message) || message.method !== "tools/call" || !isRecord(message.params)) {
		return undefined;
	}

	return mcpToolRatePolicy(
		typeof message.params.name === "string" ? message.params.name : "",
		isRecord(message.params.arguments) ? message.params.arguments : {},
	);
}

async function readMessages(request: Request): Promise<unknown[]> {
	let body: unknown;

	try {
		body = await request.clone().json();
	} catch {
		return [];
	}

	const messages = Array.isArray(body) ? body : [body];

	return messages.length > MCP_MAX_BATCH ? [] : messages;
}

export async function readMcpCallPolicies(
	request: Request,
	isAnonymous: boolean,
): Promise<PolicyName[]> {
	const messages = await readMessages(request);

	if (isAnonymous) {
		return messages.length > 0
			? messages.map((message) => toolCallPolicy(message) ?? "read")
			: ["read"];
	}

	return messages.flatMap((message) => {
		const policy = toolCallPolicy(message);

		return policy === undefined ? [] : [policy];
	});
}
