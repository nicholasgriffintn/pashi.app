import type { ResultKind } from "../../types";

const MAX_FIELD_COUNT = 12;

export type AiSupportedResultKind = Exclude<ResultKind, "image">;
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

export function isAiSupportedResultKind(kind: ResultKind): kind is AiSupportedResultKind {
	return kind !== "image";
}

export function schemaFor(kind: AiSupportedResultKind) {
	switch (kind) {
		case "fields":
			return FIELDS_RESULT_SCHEMA;
		case "palette":
			return PALETTE_RESULT_SCHEMA;
		case "text":
			return TEXT_RESULT_SCHEMA;
	}
}

export function responseFormatFor(kind: AiSupportedResultKind) {
	return {
		type: "json_schema",
		json_schema: {
			name: `pashi_${kind}_result`,
			schema: schemaFor(kind),
			strict: true,
		},
	};
}
