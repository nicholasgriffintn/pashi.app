import { isRecord } from "../../shared/records";
import { policyFor, type AiFeature } from "./policy";
import {
	AiResponseError,
	runAiObject,
	runAiText,
	type AiClient,
	type AiMessage,
	type AiResponseFormat,
} from "./run";

const WORKERS_AI_TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export interface WorkersAiEnv {
	AI: Ai;
}

export async function runWorkersAiText(
	env: WorkersAiEnv,
	messages: AiMessage[],
	{ maxTokens, temperature }: { maxTokens: number; temperature: number },
) {
	const output: unknown = await env.AI.run(WORKERS_AI_TEXT_MODEL, {
		max_tokens: maxTokens,
		messages,
		temperature,
	});
	const text = isRecord(output) ? output.response : undefined;

	if (typeof text !== "string" || !text.trim()) {
		throw new AiResponseError("Workers AI returned no text.");
	}

	return text;
}

export async function runWorkersAiObject(
	env: WorkersAiEnv,
	messages: AiMessage[],
	format: AiResponseFormat,
	{ maxTokens, temperature }: { maxTokens: number; temperature: number },
): Promise<unknown> {
	const output: unknown = await env.AI.run(WORKERS_AI_TEXT_MODEL, {
		max_tokens: maxTokens,
		messages,
		response_format: { json_schema: format.json_schema.schema, type: "json_schema" },
		temperature,
	});
	const response = isRecord(output) ? output.response : undefined;

	if (isRecord(response) || Array.isArray(response)) {
		return response;
	}

	if (typeof response !== "string") {
		throw new AiResponseError("Workers AI returned no JSON.");
	}

	try {
		return JSON.parse(response);
	} catch {
		throw new AiResponseError("Workers AI did not return valid JSON.");
	}
}

export async function runAiObjectWithFallback<T>(
	ai: AiClient | undefined,
	env: WorkersAiEnv,
	feature: AiFeature,
	messages: AiMessage[],
	format: AiResponseFormat,
	parse: (value: unknown) => T | undefined,
): Promise<T> {
	if (ai) {
		return runAiObject(ai, feature, messages, parse, format);
	}

	const policy = policyFor(feature);
	const parsed = parse(
		await runWorkersAiObject(env, messages, format, {
			maxTokens: policy.maxTokens,
			temperature: policy.temperature,
		}),
	);

	if (parsed === undefined) {
		throw new AiResponseError("The model returned JSON in an unexpected shape.");
	}

	return parsed;
}

export async function runAiTextWithFallback(
	ai: AiClient | undefined,
	env: WorkersAiEnv,
	feature: AiFeature,
	messages: AiMessage[],
) {
	if (ai) {
		return runAiText(ai, feature, messages);
	}

	const policy = policyFor(feature);

	return runWorkersAiText(env, messages, {
		maxTokens: policy.maxTokens,
		temperature: policy.temperature,
	});
}
