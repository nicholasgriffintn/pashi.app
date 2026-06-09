import {
	isStringArray,
	isStringRecord,
	isStringRecordArray,
} from "../../../../shared/records";
import type { GeneratorTool, JsonResult, ResultKind } from "../types";
import {
	type GeneratorRequest,
	generatorDataFields,
	usesAiMode,
} from "../request";

const AI_MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_FIELD_COUNT = 12;
const SYSTEM_PROMPT = [
	"You generate concise fake data for Pashi.",
	"Return only data that matches the supplied JSON schema.",
	"Every object value must be a string.",
	"Do not include markdown, commentary, secrets, or real personal data.",
].join(" ");

type AiSupportedResultKind = Exclude<ResultKind, "image">;
type JsonSchema =
	| { type: "string"; description?: string; pattern?: string }
	| {
		type: "array";
		description?: string;
		items: JsonSchema;
		minItems?: number;
		maxItems?: number;
	}
	| {
		type: "object";
		additionalProperties?: boolean | JsonSchema;
		description?: string;
		properties?: Record<string, JsonSchema>;
		required?: string[];
	};

const TEXT_RESULT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		meta: { type: "string", description: "Short status or count summary." },
		result: { type: "string", description: "Generated text output." },
	},
	required: ["meta", "result"],
} satisfies JsonSchema;

const FIELDS_RESULT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		meta: { type: "string", description: "Short record count summary." },
		result: {
			type: "array",
			description: "Generated records with string values only.",
			minItems: 1,
			maxItems: MAX_FIELD_COUNT,
			items: {
				type: "object",
				additionalProperties: { type: "string" },
			},
		},
	},
	required: ["meta", "result"],
} satisfies JsonSchema;

const PALETTE_RESULT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		meta: { type: "string", description: "Short colour count summary." },
		result: {
			type: "array",
			description: "CSS hex colours.",
			minItems: 1,
			maxItems: 12,
			items: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
		},
	},
	required: ["meta", "result"],
} satisfies JsonSchema;

export async function createAiResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
	ai: Ai | undefined,
): Promise<JsonResult | undefined> {
	if (!usesAiMode(request)) {
		return undefined;
	}

	if (!isAiSupportedResultKind(generator.result.kind)) {
		throw new Error("AI mode is not available for image generators.");
	}

	if (!ai) {
		throw new Error("AI mode is not configured.");
	}

	const output = await ai.run(AI_MODEL, {
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: createPrompt(generator, request) },
		],
		max_completion_tokens: 900,
		response_format: {
			type: "json_schema",
			json_schema: schemaFor(generator.result.kind),
		},
		temperature: 0.7,
	});
	const payload = parseAiPayload(readAiContent(output));

	return {
		input: request.input,
		kind: generator.result.kind,
		label: generator.label,
		meta: payload.meta,
		result: payload.result,
		type: generator.id,
	};
}

function createPrompt(generator: GeneratorTool, request: GeneratorRequest) {
	return JSON.stringify({
		fields: generatorDataFields(request),
		generator: {
			description: generator.description,
			id: generator.id,
			label: generator.label,
			resultKind: generator.result.kind,
		},
		input: request.input,
	});
}

function isAiSupportedResultKind(kind: ResultKind): kind is AiSupportedResultKind {
	return kind !== "image";
}

function schemaFor(kind: AiSupportedResultKind) {
	switch (kind) {
		case "fields":
			return FIELDS_RESULT_SCHEMA;
		case "palette":
			return PALETTE_RESULT_SCHEMA;
		case "text":
			return TEXT_RESULT_SCHEMA;
	}
}

function parseAiPayload(value: unknown) {
	const payload = typeof value === "string" ? parseJson(value) : value;
	if (!isAiPayload(payload)) {
		throw new Error("AI returned an invalid payload.");
	}

	return payload;
}

function readAiContent(output: unknown) {
	if (isResponseOutput(output)) {
		return output.response;
	}

	if (isChatCompletionOutput(output)) {
		return output.choices[0]?.message.content;
	}

	if (typeof output === "string") {
		return output;
	}

	throw new Error("AI returned an empty result.");
}

function parseJson(value: string) {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		throw new Error("AI returned invalid JSON.");
	}
}

function isAiPayload(value: unknown): value is Pick<JsonResult, "meta" | "result"> {
	if (
		typeof value !== "object" ||
		value === null ||
		Array.isArray(value) ||
		!("meta" in value) ||
		!("result" in value) ||
		typeof value.meta !== "string"
	) {
		return false;
	}

	return (
		typeof value.result === "string" ||
		isStringArray(value.result) ||
		isStringRecord(value.result) ||
		isStringRecordArray(value.result)
	);
}

function isResponseOutput(value: unknown): value is { response: unknown } {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		"response" in value
	);
}

function isChatCompletionOutput(
	value: unknown,
): value is { choices: { message: { content: unknown } }[] } {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		"choices" in value &&
		Array.isArray(value.choices)
	);
}
