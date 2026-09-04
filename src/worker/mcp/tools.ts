import { listConverterTools } from "../services/converters/catalogue";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { createConverterResponse } from "../services/converters/response";
import { listGeneratorTools } from "../services/generators/catalogue";
import { createGeneratorRequest } from "../services/generators/request";
import { createGeneratorResponse } from "../services/generators/response";

export interface McpToolDefinition {
	annotations: { readOnlyHint: boolean };
	description: string;
	inputSchema: Record<string, unknown>;
	name: string;
}

export const MCP_TOOLS: readonly McpToolDefinition[] = [
	{
		annotations: { readOnlyHint: true },
		description:
			"List the Pashi tools available, optionally filtered by a search term or category. Call this before pashi_generate or pashi_convert to find a tool id.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				kind: {
					description: "Restrict to generators or converters.",
					enum: ["all", "converter", "generator"],
					type: "string",
				},
				search: {
					description: "Match against tool ids, labels, descriptions and categories.",
					type: "string",
				},
			},
			type: "object",
		},
		name: "pashi_list_tools",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Run a Pashi generator, such as uuid, password, dice or colour. Returns the generated result as JSON.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				fields: {
					additionalProperties: { type: "string" },
					description: "Tool specific options, for example count or format.",
					type: "object",
				},
				input: { description: "Optional seed or source text.", type: "string" },
				type: { description: "The generator id, for example uuid.", type: "string" },
			},
			required: ["type"],
			type: "object",
		},
		name: "pashi_generate",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Run a Pashi text converter, such as markdown-to-jira, json-transform or timestamp-transform. Media and document conversion is not available over MCP.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				fields: {
					additionalProperties: { type: "string" },
					description: "Tool specific options, for example outputFormat.",
					type: "object",
				},
				input: { description: "The text to convert.", type: "string" },
				type: { description: "The converter id, for example markdown-to-jira.", type: "string" },
			},
			required: ["input", "type"],
			type: "object",
		},
		name: "pashi_convert",
	},
];

function stringFields(value: unknown): Record<string, string> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, item]) => (typeof item === "string" ? [[key, item]] : [])),
	);
}

function matchesSearch(haystack: string, search: string) {
	const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);

	return tokens.every((token) => haystack.toLowerCase().includes(token));
}

function listTools(argumentsValue: Record<string, unknown>) {
	const kind = typeof argumentsValue.kind === "string" ? argumentsValue.kind : "all";
	const search = typeof argumentsValue.search === "string" ? argumentsValue.search : "";
	const generators =
		kind === "converter"
			? []
			: listGeneratorTools().map((tool) => ({
					category: tool.display.category,
					description: tool.description,
					fields: (tool.input.fields ?? []).map((field) => field.id),
					id: tool.id,
					kind: "generator" as const,
					label: tool.label,
				}));
	const converters =
		kind === "generator"
			? []
			: listConverterTools()
					.filter((tool) => tool.runtime === "worker")
					.map((tool) => ({
						category: tool.display.category,
						description: tool.description,
						fields: (tool.api?.fields ?? []).map((field) => field.id),
						id: tool.id,
						kind: "converter" as const,
						label: tool.label,
					}));

	const tools = [...generators, ...converters].filter((tool) =>
		search
			? matchesSearch(`${tool.id} ${tool.label} ${tool.description} ${tool.category}`, search)
			: true,
	);

	return { count: tools.length, tools };
}

export async function callMcpTool(
	name: string,
	argumentsValue: Record<string, unknown>,
	env: ConversionEnv,
): Promise<unknown> {
	if (name === "pashi_list_tools") {
		return listTools(argumentsValue);
	}

	const type = typeof argumentsValue.type === "string" ? argumentsValue.type : "";
	const input = typeof argumentsValue.input === "string" ? argumentsValue.input : "";
	const fields = stringFields(argumentsValue.fields);

	if (!type) {
		throw new Error("A tool id is required.");
	}

	if (name === "pashi_generate") {
		const response = await createGeneratorResponse(
			type,
			createGeneratorRequest(input, fields),
			new URLSearchParams(),
			env,
		);

		return response.json();
	}

	if (name === "pashi_convert") {
		const converter = listConverterTools().find((tool) => tool.id === type);

		if (converter?.runtime === "container") {
			throw new Error("Media and document conversion is not available over MCP.");
		}

		const response = await createConverterResponse(
			type,
			createGeneratorRequest(input, fields),
			env,
		);

		return response.json();
	}

	throw new Error(`Unknown tool: ${name}`);
}
