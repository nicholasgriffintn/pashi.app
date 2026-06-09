import {
	isRecord,
	isStringArray,
	isStringRecord,
	isStringRecordArray,
} from "../../../../../shared/records";
import type { JsonResult } from "../../types";

type AiPayload = Pick<JsonResult, "meta" | "result">;

export function readAiPayload(output: unknown): AiPayload {
	const payload = parseAiPayload(readAiContent(output), output);
	if (!isAiPayload(payload)) {
		assertAiOutputComplete(output);
		throw new Error("AI returned an invalid structured result.");
	}

	return payload;
}

function assertAiOutputComplete(output: unknown) {
	if (!isChatCompletionOutput(output)) {
		return;
	}

	const finishReason = output.choices[0]?.finish_reason;
	if (finishReason === "length") {
		throw new Error("AI response was cut off before it returned valid data.");
	}
}

function readAiContent(output: unknown) {
	if (isResponseOutput(output)) {
		return output.response;
	}

	if (isChatCompletionOutput(output)) {
		return output.choices[0]?.message.content;
	}

	if (typeof output === "string") {
		return output;
	}

	throw new Error("AI returned an empty result.");
}

function parseAiPayload(value: unknown, output: unknown) {
	if (typeof value !== "string") {
		return value;
	}

	try {
		return JSON.parse(value) as unknown;
	} catch {
		assertAiOutputComplete(output);
		throw new Error("AI returned invalid JSON.");
	}
}

function isAiPayload(value: unknown): value is AiPayload {
	if (
		!isRecord(value) ||
		typeof value.meta !== "string" ||
		!("result" in value)
	) {
		return false;
	}

	return (
		typeof value.result === "string" ||
		isStringArray(value.result) ||
		isStringRecord(value.result) ||
		isStringRecordArray(value.result)
	);
}

function isResponseOutput(value: unknown): value is { response: unknown } {
	return isRecord(value) && "response" in value;
}

function isChatCompletionOutput(
	value: unknown,
): value is { choices: { finish_reason?: unknown; message: { content: unknown } }[] } {
	return (
		isRecord(value) &&
		Array.isArray(value.choices) &&
		value.choices.every(isChatCompletionChoice)
	);
}

function isChatCompletionChoice(
	value: unknown,
): value is { finish_reason?: unknown; message: { content: unknown } } {
	return isRecord(value) && isRecord(value.message) && "content" in value.message;
}
