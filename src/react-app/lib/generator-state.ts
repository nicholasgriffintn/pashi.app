import type { GeneratorInfoTool } from "./generator-info";
import { pushAppPath } from "./navigation";

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

export function getDefaultInput(tool: GeneratorInfoTool) {
	if (tool.input.mode === "none" || tool.input.fields?.length) {
		return "";
	}

	return tool.input.required ? (tool.display.examples[0] ?? tool.placeholder) : "";
}

export function getDefaultFieldValues(tool: GeneratorInfoTool) {
	return Object.fromEntries(
		(tool.input.fields ?? []).map((field) => [field.id, field.placeholder]),
	);
}

export function getInitialValues(tool: GeneratorInfoTool): GeneratorValues {
	const params = new URLSearchParams(window.location.search);
	const input = params.get("input") ?? getDefaultInput(tool);
	const fields = {
		...getDefaultFieldValues(tool),
		...Object.fromEntries(
			(tool.input.fields ?? []).flatMap((field) => {
				const value = params.get(field.id);
				return value === null ? [] : [[field.id, value]];
			}),
		),
	};

	return { fields, input };
}

export function getRouteToolId() {
	const [toolId] = window.location.pathname.split("/").filter(Boolean);
	return toolId && toolId !== "api" && toolId !== "convert" ? toolId : undefined;
}

export function findToolByRoute(tools: readonly GeneratorInfoTool[], routeToolId: string | undefined) {
	const normalisedRouteToolId = routeToolId?.trim().toLowerCase();
	if (!normalisedRouteToolId) {
		return undefined;
	}

	return tools.find((tool) =>
		tool.id === normalisedRouteToolId || tool.aliases.includes(normalisedRouteToolId),
	);
}

export function pushGeneratorRoute(toolId: string) {
	pushAppPath(`/${toolId}`);
}
