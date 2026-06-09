import type { GeneratorInfoTool } from "./generator-info";

export function searchTools(tools: GeneratorInfoTool[], query: string) {
	const tokens = normaliseSearchText(query).split(" ").filter(Boolean);
	if (tokens.length === 0) {
		return tools;
	}

	return tools.filter((tool) => {
		const haystack = normaliseSearchText(buildToolSearchText(tool));
		return tokens.every((token: string) => haystack.includes(token));
	});
}

function buildToolSearchText(tool: GeneratorInfoTool) {
	return `${tool.id} ${tool.label} ${tool.aliases.join(" ")} ${tool.description} ${tool.display.category} ${tool.audience}`;
}

export function normaliseSearchText(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}
