export interface GeneratorRequest {
	fields: Record<string, string>;
	input: string;
}

const AI_MODE_VALUES = new Set(["ai", "cloudflare-ai", "workers-ai"]);
const CONTROL_FIELD_IDS = new Set(["ai", "mode"]);

export function createGeneratorRequest(input: string, fields: Record<string, string> = {}) {
	return {
		fields,
		input: input.trim(),
	};
}

export function createGeneratorRequestFromSearchParams(params: URLSearchParams) {
	const input = params.get("input") ?? params.get("data") ?? "";
	const fields = Object.fromEntries(
		[...params.entries()].filter(([key]) => key !== "input" && key !== "data"),
	);

	return createGeneratorRequest(input, fields);
}

export function fieldValue(request: GeneratorRequest, key: string, fallback = "") {
	return (request.fields[key] ?? fallback).trim();
}

export function fieldOrInput(request: GeneratorRequest, key: string, fallback = "") {
	return fieldValue(request, key, request.input || fallback);
}

export function generatorDataFields(request: GeneratorRequest) {
	return Object.fromEntries(
		Object.entries(request.fields).filter(([key]) => !CONTROL_FIELD_IDS.has(key)),
	);
}

export function usesAiMode(request: GeneratorRequest) {
	const mode = fieldValue(request, "mode").toLowerCase();
	const ai = fieldValue(request, "ai").toLowerCase();
	return AI_MODE_VALUES.has(mode) || ai === "true" || ai === "1";
}
