export interface SearchableTool {
	aliases: readonly string[];
	audience: string;
	description: string;
	display: {
		category: string;
	};
	id: string;
	label: string;
}

export function searchTools<Tool extends SearchableTool>(tools: Tool[], query: string) {
	const tokens = normaliseSearchText(query).split(" ").filter(Boolean);
	if (tokens.length === 0) {
		return tools;
	}

	return tools.filter((tool) => {
		const haystack = normaliseSearchText(buildToolSearchText(tool));
		return tokens.every((token: string) => haystack.includes(token));
	});
}

function buildToolSearchText(tool: SearchableTool) {
	return `${tool.id} ${tool.label} ${tool.aliases.join(" ")} ${tool.description} ${tool.display.category} ${tool.audience}`;
}

export function normaliseSearchText(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}
