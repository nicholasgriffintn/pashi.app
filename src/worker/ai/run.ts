import { createCompletion, type PolychatEnv } from "../services/polychat/client";
import { policyFor, type AiFeature } from "./policy";
import type { OutputSchema } from "./schemas";

export interface AiClient {
	apiKey: string;
	env: PolychatEnv;
}

export interface AiMessage {
	content: string;
	role: "assistant" | "system" | "user";
}

export interface AiResponseFormat {
	json_schema: OutputSchema & { strict: boolean };
	type: "json_schema";
}

export class AiResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AiResponseError";
	}
}

function responseFormat(schema: OutputSchema | undefined): AiResponseFormat | undefined {
	return schema
		? {
				json_schema: { name: schema.name, schema: schema.schema, strict: true },
				type: "json_schema",
			}
		: undefined;
}

export async function runAiText(
	ai: AiClient,
	feature: AiFeature,
	messages: AiMessage[],
	format?: AiResponseFormat,
) {
	const policy = policyFor(feature);

	return createCompletion(ai.env, ai.apiKey, {
		maxTokens: policy.maxTokens,
		messages,
		responseFormat: format ?? responseFormat(policy.schema),
		temperature: policy.temperature,
		tier: policy.tier,
		timeoutMs: policy.timeoutMs,
	});
}

export async function runAiObject<T>(
	ai: AiClient,
	feature: AiFeature,
	messages: AiMessage[],
	parse: (value: unknown) => T | undefined,
	format?: AiResponseFormat,
): Promise<T> {
	const text = await runAiText(ai, feature, messages, format);
	let payload: unknown;

	try {
		payload = JSON.parse(text);
	} catch {
		throw new AiResponseError("The model did not return valid JSON.");
	}

	const parsed = parse(payload);

	if (!parsed) {
		throw new AiResponseError("The model returned JSON in an unexpected shape.");
	}

	return parsed;
}
