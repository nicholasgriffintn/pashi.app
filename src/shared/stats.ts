export interface EventTotal {
	count: number;
	name: string;
}

export interface ToolUsage {
	errors: number;
	id: string;
	label: string;
	runs: number;
	toolType: "converter" | "generator";
}

export interface McpKindUsage {
	calls: number;
	errors: number;
	kind: string;
}

export interface UsageStats {
	conversions: { completed: number; failed: number };
	events: EventTotal[];
	from: string;
	mcpKinds: McpKindUsage[];
	to: string;
	tools: ToolUsage[];
}

export function toolPagePath(tool: Pick<ToolUsage, "id" | "toolType">) {
	const prefix = tool.toolType === "converter" ? "/tools/convert/" : "/tools/";

	return `${prefix}${encodeURIComponent(tool.id)}`;
}
