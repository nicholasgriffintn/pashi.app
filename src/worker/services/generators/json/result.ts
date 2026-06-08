import type { GeneratorTool, JsonResult } from "../types";

export function fieldsResult(
	generator: GeneratorTool,
	input: string,
	result: Record<string, string>,
): JsonResult {
	return {
		input,
		kind: "fields",
		label: generator.label,
		meta: "Structured",
		result,
		type: generator.id,
	};
}

export function paletteResult(
	generator: GeneratorTool,
	input: string,
	result: string[],
): JsonResult {
	return {
		input,
		kind: "palette",
		label: generator.label,
		meta: `${result.length} ${result.length === 1 ? "colour" : "colours"}`,
		result,
		type: generator.id,
	};
}

export function textResult(
	generator: GeneratorTool,
	input: string,
	result: string | string[],
): JsonResult {
	return {
		input,
		kind: "text",
		label: generator.label,
		meta: "Ready",
		result,
		type: generator.id,
	};
}
