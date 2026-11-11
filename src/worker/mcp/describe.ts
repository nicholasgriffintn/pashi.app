import type { ToolExample } from "../../shared/tool-examples";
import { findConverterTool } from "../services/converters/catalogue";
import type { ConverterApiField, ConverterTool } from "../services/converters/types";
import { findGenerator } from "../services/generators/catalogue";
import type { GeneratorInputField, GeneratorTool } from "../services/generators/types";

interface DescribedField {
	control: "select" | "text" | "textarea";
	defaultValue?: string;
	hint?: string;
	id: string;
	label: string;
	options?: readonly string[];
	required: boolean;
}

interface DescribedTool {
	actionLabel: string;
	description: string;
	examples: readonly ToolExample[];
	fields: DescribedField[];
	id: string;
	input: { label: string; placeholder: string; required: boolean; used: boolean };
	kind: "converter" | "generator";
	label: string;
}

export const DESCRIBED_TOOL_OUTPUT_SCHEMA = {
	additionalProperties: false,
	properties: {
		actionLabel: { type: "string" },
		description: { type: "string" },
		examples: {
			items: {
				additionalProperties: false,
				properties: {
					fields: { additionalProperties: { type: "string" }, type: "object" },
					input: { type: "string" },
					label: { type: "string" },
				},
				required: ["label"],
				type: "object",
			},
			type: "array",
		},
		fields: {
			items: {
				additionalProperties: false,
				properties: {
					control: { enum: ["select", "text", "textarea"], type: "string" },
					defaultValue: { type: "string" },
					hint: { type: "string" },
					id: { type: "string" },
					label: { type: "string" },
					options: { items: { type: "string" }, type: "array" },
					required: { type: "boolean" },
				},
				required: ["control", "id", "label", "required"],
				type: "object",
			},
			type: "array",
		},
		id: { type: "string" },
		input: {
			additionalProperties: false,
			properties: {
				label: { type: "string" },
				placeholder: { type: "string" },
				required: { type: "boolean" },
				used: { type: "boolean" },
			},
			required: ["label", "placeholder", "required", "used"],
			type: "object",
		},
		kind: { enum: ["converter", "generator"], type: "string" },
		label: { type: "string" },
	},
	required: ["actionLabel", "description", "examples", "fields", "id", "input", "kind", "label"],
	type: "object",
};

function describeGeneratorField(field: GeneratorInputField): DescribedField {
	return {
		control: field.type ?? (field.options ? "select" : "text"),
		hint: field.placeholder || undefined,
		id: field.id,
		label: field.label,
		options: field.options,
		required: field.required,
	};
}

function describeConverterField(field: ConverterApiField): DescribedField {
	const control = field.values?.length ? "select" : "text";

	return {
		control,
		defaultValue: field.defaultValue,
		hint: field.description,
		id: field.id,
		label: field.id,
		options: field.values,
		required: Boolean(field.required),
	};
}

function describeGenerator(tool: GeneratorTool): DescribedTool {
	return {
		actionLabel: tool.display.actionLabel,
		description: tool.description,
		examples: tool.display.examples,
		fields: (tool.input.fields ?? []).map(describeGeneratorField),
		id: tool.id,
		input: {
			label: tool.input.label,
			placeholder: tool.placeholder,
			required: tool.input.required,
			used: tool.input.mode !== "none",
		},
		kind: "generator",
		label: tool.label,
	};
}

function describeConverter(tool: ConverterTool): DescribedTool {
	return {
		actionLabel: tool.display.actionLabel,
		description: tool.description,
		examples: tool.display.examples,
		fields: (tool.api?.fields ?? []).map(describeConverterField),
		id: tool.id,
		input: {
			label: tool.input.label,
			placeholder: tool.placeholder,
			required: tool.input.required,
			used: true,
		},
		kind: "converter",
		label: tool.label,
	};
}

export function describeTool(type: string): DescribedTool {
	const generator = findGenerator(type);

	if (generator) {
		return describeGenerator(generator);
	}

	const converter = findConverterTool(type);

	if (converter?.runtime === "worker") {
		return describeConverter(converter);
	}

	throw new Error(`No generator or text converter is called ${type}.`);
}
