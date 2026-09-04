import { modelForTier } from "./models";
import { policyFor, type AiFeature } from "./policy";
import type { OutputSchema } from "./schemas";

export interface AiEnv {
	AI?: Ai;
	AI_GATEWAY_ID?: string;
}

export interface AiMessage {
	content: string;
	role: "assistant" | "system" | "user";
}

export class AiUnavailableError extends Error {
	constructor() {
		super("AI is not configured for this deployment.");
		this.name = "AiUnavailableError";
	}
}

export class AiResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AiResponseError";
	}
}

function responseFormat(schema: OutputSchema | undefined) {
	if (!schema) {
		return undefined;
	}

	return {
		type: "json_schema" as const,
		json_schema: {
			name: schema.name,
			schema: schema.schema,
			strict: true,
		},
	};
}

function gatewayOptions(env: AiEnv, feature: AiFeature, cacheSeconds: number) {
	if (!env.AI_GATEWAY_ID) {
		return undefined;
	}

	return {
		gateway: {
			id: env.AI_GATEWAY_ID,
			metadata: { feature },
			skipCache: cacheSeconds === 0,
			...(cacheSeconds > 0 ? { cacheTtl: cacheSeconds } : {}),
		},
	};
}

function readTextOutput(output: unknown): string {
	if (typeof output === "string") {
		return output;
	}

	if (typeof output !== "object" || output === null) {
		throw new AiResponseError("The model returned an unexpected response.");
	}

	if ("response" in output && typeof output.response === "string") {
		return output.response;
	}

	if ("choices" in output && Array.isArray(output.choices)) {
		const [choice] = output.choices;

		if (
			typeof choice === "object" &&
			choice !== null &&
			"message" in choice &&
			typeof choice.message === "object" &&
			choice.message !== null &&
			"content" in choice.message &&
			typeof choice.message.content === "string"
		) {
			return choice.message.content;
		}
	}

	throw new AiResponseError("The model returned an unexpected response.");
}

export async function runAiText(env: AiEnv, feature: AiFeature, messages: AiMessage[]) {
	if (!env.AI) {
		throw new AiUnavailableError();
	}

	const policy = policyFor(feature);
	const output = await env.AI.run(
		modelForTier(policy.tier),
		{
			max_completion_tokens: policy.maxTokens,
			messages,
			temperature: policy.temperature,
			...(responseFormat(policy.schema) ? { response_format: responseFormat(policy.schema) } : {}),
		},
		gatewayOptions(env, feature, policy.cacheSeconds),
	);

	return readTextOutput(output);
}

export async function runAiObject<T>(
	env: AiEnv,
	feature: AiFeature,
	messages: AiMessage[],
	parse: (value: unknown) => T | undefined,
): Promise<T> {
	const text = await runAiText(env, feature, messages);
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
