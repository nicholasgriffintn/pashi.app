import { isConverterAvailable } from "./converters/availability";
import { listConverterTools } from "./converters/catalogue";
import { listExportFormats } from "./export-formats";
import type { FeatureEnv } from "./features";
import { listGeneratorTools } from "./generators/catalogue";

const ERROR_SCHEMA = {
	properties: {
		code: { type: "string" },
		error: { type: "string" },
	},
	required: ["code", "error"],
	type: "object",
};

const RESULT_SCHEMA = {
	properties: {
		generatedAt: { format: "date-time", type: "string" },
		input: { type: "string" },
		kind: { enum: ["fields", "palette", "text"], type: "string" },
		label: { type: "string" },
		meta: { type: "string" },
		result: {},
		type: { type: "string" },
	},
	required: ["kind", "label", "meta", "result", "type"],
	type: "object",
};

function errorResponses() {
	return {
		"400": {
			content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			description: "The request could not be understood.",
		},
		"404": {
			content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			description: "No tool with that id or alias.",
		},
		"422": {
			content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			description: "The request asks for more work than the service will spend.",
		},
		"429": {
			content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			description: "Rate limited.",
		},
	};
}

function fieldParameters(fields: readonly { description?: string; id: string }[]) {
	return fields.map((field) => ({
		description: field.description ?? "",
		in: "query",
		name: field.id,
		required: false,
		schema: { type: "string" },
	}));
}

export function createOpenApiDocument(origin: string, env: FeatureEnv) {
	const paths: Record<string, unknown> = {};

	for (const tool of listGeneratorTools()) {
		paths[`/api/v1/${tool.id}`] = {
			get: {
				description: tool.description,
				operationId: `generate_${tool.id.replaceAll("-", "_")}`,
				parameters: [
					{
						description: tool.input.label,
						in: "query",
						name: "input",
						required: tool.input.required,
						schema: { type: "string" },
					},
					...fieldParameters(tool.input.fields ?? []),
				],
				responses: {
					"200": {
						content: { "application/json": { schema: { $ref: "#/components/schemas/Result" } } },
						description: tool.display.actionLabel,
					},
					...errorResponses(),
				},
				summary: tool.label,
				tags: ["generators", tool.display.category],
			},
		};
	}

	for (const tool of listConverterTools().filter((entry) => isConverterAvailable(entry, env))) {
		paths[`/api/v1/${tool.id}`] = {
			post: {
				description: tool.description,
				operationId: `convert_${tool.id.replaceAll("-", "_")}`,
				parameters: fieldParameters(tool.api?.fields ?? []),
				requestBody: {
					content: { "text/plain": { schema: { type: "string" } } },
					required: tool.input.required,
				},
				responses: {
					"200": {
						content: { "application/json": { schema: { $ref: "#/components/schemas/Result" } } },
						description: tool.display.actionLabel,
					},
					...errorResponses(),
				},
				summary: tool.label,
				tags: ["converters", tool.display.category],
			},
		};
	}

	paths["/api/v1/info"] = {
		get: {
			description: "The full tool catalogue, export formats and live feature status.",
			operationId: "info",
			responses: { "200": { description: "Catalogue." } },
			summary: "Catalogue",
			tags: ["meta"],
		},
	};

	paths["/api/v1/health"] = {
		get: {
			description: "Service health, bindings and feature flags.",
			operationId: "health",
			responses: { "200": { description: "Healthy." }, "503": { description: "Degraded." } },
			summary: "Health",
			tags: ["meta"],
		},
	};

	for (const format of listExportFormats()) {
		paths[`/export/{type}/${format}`] = {
			get: {
				description: `Export a generator result as ${format.toUpperCase()}.`,
				operationId: `export_${format}`,
				parameters: [
					{ in: "path", name: "type", required: true, schema: { type: "string" } },
					{ in: "query", name: "input", required: false, schema: { type: "string" } },
				],
				responses: { "200": { description: "File download." }, ...errorResponses() },
				summary: `Export as ${format.toUpperCase()}`,
				tags: ["exports"],
			},
		};
	}

	return {
		components: {
			schemas: { Error: ERROR_SCHEMA, Result: RESULT_SCHEMA },
			securitySchemes: {
				apiKey: { in: "header", name: "X-API-Key", type: "apiKey" },
			},
		},
		info: {
			description:
				"Generators, converters and AI experiments. Text tools are open; media conversion and the AI endpoints need an API key.",
			title: "Pashi",
			version: "1.0.0",
		},
		openapi: "3.1.0",
		paths,
		servers: [{ url: origin }],
	};
}
