import type { AiClient } from "../ai/run";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { createFeatureStatus } from "../services/features";
import { askPashi } from "../services/labs/ask";
import { EXPLAIN_SUBJECTS, explainInput, isExplainSubject } from "../services/labs/explain";
import { McpToolError } from "./tool-result";

function requireLabsAi(env: ConversionEnv, ai: AiClient | undefined, purpose: string) {
	if (!createFeatureStatus(env).ai.available) {
		throw new McpToolError("AI is not available.", "unavailable");
	}

	if (!ai) {
		throw new McpToolError(
			`This tool runs on Polychat. Connect Pashi through your Polychat link to ${purpose}.`,
			"unauthorised",
		);
	}

	return ai;
}

function readString(argumentsValue: Record<string, unknown>, key: string) {
	const value = argumentsValue[key];

	return typeof value === "string" ? value : "";
}

export function askPashiTool(
	argumentsValue: Record<string, unknown>,
	env: ConversionEnv,
	ai: AiClient | undefined,
) {
	return askPashi(
		requireLabsAi(env, ai, "ask Pashi for a tool"),
		readString(argumentsValue, "request"),
		env,
	);
}

export function explainTool(
	argumentsValue: Record<string, unknown>,
	env: ConversionEnv,
	ai: AiClient | undefined,
) {
	const subject = readString(argumentsValue, "subject");

	if (!isExplainSubject(subject)) {
		throw new McpToolError(
			`Choose a subject from ${EXPLAIN_SUBJECTS.join(", ")}.`,
			"invalid_request",
		);
	}

	return explainInput(
		requireLabsAi(env, ai, "explain technical input"),
		subject,
		readString(argumentsValue, "input"),
	);
}
