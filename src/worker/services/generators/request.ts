export interface GeneratorRequest {
	fields: Record<string, string>;
	input: string;
}

export function createGeneratorRequest(input: string, fields: Record<string, string> = {}) {
	return {
		fields,
		input: input.trim(),
	};
}

export function fieldValue(request: GeneratorRequest, key: string, fallback = "") {
	return (request.fields[key] ?? fallback).trim();
}

export function fieldOrInput(request: GeneratorRequest, key: string, fallback = "") {
	return fieldValue(request, key, request.input || fallback);
}
