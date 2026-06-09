import type { ConverterInfoTool } from "./converter-api";

export interface ConverterValues {
	input: string;
}

export function getDefaultConverterInput(tool: ConverterInfoTool) {
	return tool.input.kind === "text" && tool.input.required
		? (tool.display.examples[0] ?? tool.placeholder)
		: "";
}

export function getInitialConverterValues(tool: ConverterInfoTool): ConverterValues {
	const params = new URLSearchParams(window.location.search);
	return {
		input: params.get("input") ?? getDefaultConverterInput(tool),
	};
}

export function getRouteConverterId() {
	const [, converterId] = window.location.pathname.split("/").filter(Boolean);
	return window.location.pathname.startsWith("/convert/") ? converterId : undefined;
}

export function findConverterByRoute(
	tools: readonly ConverterInfoTool[],
	routeConverterId: string | undefined,
) {
	const normalisedRouteConverterId = routeConverterId?.trim().toLowerCase();
	if (!normalisedRouteConverterId) {
		return undefined;
	}

	return tools.find((tool) =>
		tool.id === normalisedRouteConverterId || tool.aliases.includes(normalisedRouteConverterId),
	);
}

export function pushConverterRoute(toolId: string) {
	const nextPath = `/convert/${toolId}`;
	if (window.location.pathname !== nextPath) {
		window.history.pushState(null, "", nextPath);
	}
}
