export interface OutputSchema {
	name: string;
	schema: Record<string, unknown>;
}

export const TOOL_ROUTE_SCHEMA: OutputSchema = {
	name: "pashi_tool_route",
	schema: {
		additionalProperties: false,
		properties: {
			confidence: {
				description: "How certain the choice is, between 0 and 1.",
				type: "number",
			},
			fields: {
				description: "Field id and value pairs to prefill, values as strings.",
				items: {
					additionalProperties: false,
					properties: {
						id: { type: "string" },
						value: { type: "string" },
					},
					required: ["id", "value"],
					type: "object",
				},
				maxItems: 8,
				type: "array",
			},
			input: {
				description: "Text to place in the tool's main input, empty when not needed.",
				type: "string",
			},
			reason: {
				description: "One short sentence explaining the choice.",
				type: "string",
			},
			toolId: {
				description: "The id of the chosen tool, exactly as listed.",
				type: "string",
			},
		},
		required: ["confidence", "fields", "input", "reason", "toolId"],
		type: "object",
	},
};

export const EXPLANATION_SCHEMA: OutputSchema = {
	name: "pashi_explanation",
	schema: {
		additionalProperties: false,
		properties: {
			parts: {
				description: "Each meaningful piece of the input and what it does.",
				items: {
					additionalProperties: false,
					properties: {
						detail: { type: "string" },
						piece: { type: "string" },
					},
					required: ["detail", "piece"],
					type: "object",
				},
				maxItems: 12,
				type: "array",
			},
			summary: {
				description: "One sentence saying what the whole thing does.",
				type: "string",
			},
			warnings: {
				description: "Anything risky or surprising, empty when there is nothing.",
				items: { type: "string" },
				maxItems: 4,
				type: "array",
			},
		},
		required: ["parts", "summary", "warnings"],
		type: "object",
	},
};
