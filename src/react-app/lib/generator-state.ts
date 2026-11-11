import { isFieldVisible, type ToolExample } from "../../shared/tool-examples";
import type { GeneratorInfoTool, GeneratorInputField } from "./generator-info";
import { pushAppPath } from "./navigation";
import { readFieldParams, type ToolValueField, visibleFieldValues } from "./tool-values";

export interface GeneratorValues {
	fields: Record<string, string>;
	input: string;
}

export interface ImageResult {
	alt: string;
	downloadName?: string;
	generatedAt?: string;
	kind: "image";
	sourceUrl?: string;
	src: string;
}

export function createImageResult(
	tool: GeneratorInfoTool,
	input: string,
	fields: Record<string, string>,
	generateId: number,
	generatedAt = new Date().toISOString(),
): ImageResult {
	const params = new URLSearchParams({
		generate: `${generateId}`,
	});

	if (input) {
		params.set("input", input);
	}

	for (const [key, value] of Object.entries(fields)) {
		if (value) {
			params.set(key, value);
		}
	}

	return {
		alt: `${tool.label} result`,
		generatedAt,
		kind: "image",
		src: `${tool.endpoint}?${params.toString()}`,
	};
}

function toValueField(field: GeneratorInputField): ToolValueField {
	return { allowed: field.options, id: field.id, visibleWhen: field.visibleWhen };
}

function generatorFields(tool: GeneratorInfoTool) {
	return tool.input.fields ?? [];
}

export function hasPrimaryInput(tool: GeneratorInfoTool) {
	return tool.input.mode !== "none" && generatorFields(tool).length === 0;
}

function defaultFieldValues(tool: GeneratorInfoTool) {
	return Object.fromEntries(generatorFields(tool).map((field) => [field.id, field.placeholder]));
}

export function generatorValuesFromExample(
	tool: GeneratorInfoTool,
	example: ToolExample | undefined,
): GeneratorValues {
	const fallbackInput = tool.input.required ? tool.placeholder : "";

	return {
		fields: { ...defaultFieldValues(tool), ...example?.fields },
		input: hasPrimaryInput(tool) ? (example?.input ?? fallbackInput) : "",
	};
}

export function getDefaultGeneratorValues(tool: GeneratorInfoTool) {
	return generatorValuesFromExample(tool, tool.display.examples[0]);
}

export function getInitialValues(tool: GeneratorInfoTool): GeneratorValues {
	const params = new URLSearchParams(window.location.search);
	const values = getDefaultGeneratorValues(tool);

	return {
		fields: {
			...values.fields,
			...readFieldParams(params, generatorFields(tool).map(toValueField)),
		},
		input: params.get("input") ?? values.input,
	};
}

export function visibleGeneratorFields(tool: GeneratorInfoTool, fields: Record<string, string>) {
	return generatorFields(tool).filter((field) => isFieldVisible(field.visibleWhen, fields));
}

export function generatorRequestFields(tool: GeneratorInfoTool, fields: Record<string, string>) {
	return visibleFieldValues(generatorFields(tool).map(toValueField), fields);
}

export function getRouteToolId() {
	const [toolId] = window.location.pathname.split("/").filter(Boolean);

	return toolId && toolId !== "api" && toolId !== "convert" ? toolId : undefined;
}

export function findToolByRoute(
	tools: readonly GeneratorInfoTool[],
	routeToolId: string | undefined,
) {
	const normalisedRouteToolId = routeToolId?.trim().toLowerCase();

	if (!normalisedRouteToolId) {
		return undefined;
	}

	return tools.find(
		(tool) => tool.id === normalisedRouteToolId || tool.aliases.includes(normalisedRouteToolId),
	);
}

export function pushGeneratorRoute(toolId: string) {
	pushAppPath(`/${toolId}`);
}
