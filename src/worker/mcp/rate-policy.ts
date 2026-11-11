import { isRecord } from "../../shared/records";
import type { PolicyName } from "../security/policies";
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

export function mcpCallPolicies(messages: readonly unknown[], isAnonymous: boolean): PolicyName[] {
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
