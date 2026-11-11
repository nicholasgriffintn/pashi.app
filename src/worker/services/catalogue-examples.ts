import { type FieldVisibility, isFieldVisible, type ToolExample } from "../../shared/tool-examples";
import { listConverterTools } from "./converters/catalogue";
import type { ConverterTool } from "./converters/types";
import { listGeneratorTools } from "./generators/catalogue";
import type { GeneratorTool } from "./generators/types";

const MODE_FIELD_ID = "outputFormat";

interface CheckedField {
	allowed?: readonly string[];
	defaultValue?: string;
	id: string;
	visibleWhen?: FieldVisibility;
}

interface CheckedTool {
	examples: readonly ToolExample[];
	fields: readonly CheckedField[];
	kind: "converter" | "generator";
	requiredModes: readonly string[];
	takesInput: boolean;
	toolId: string;
	undemonstratedModes: readonly string[];
}

function fromGenerator(tool: GeneratorTool): CheckedTool {
	const fields = tool.input.fields ?? [];

	return {
		examples: tool.display.examples,
		fields: fields.map((field) => ({
			allowed: field.options,
			defaultValue: field.placeholder,
			id: field.id,
			visibleWhen: field.visibleWhen,
		})),
		kind: "generator",
		requiredModes: [],
		takesInput: tool.input.mode !== "none" || fields.length > 0,
		toolId: tool.id,
		undemonstratedModes: [],
	};
}

function fromConverter(tool: ConverterTool): CheckedTool {
	const fields = tool.api?.fields ?? [];
	const modeField = fields.find((field) => field.id === MODE_FIELD_ID);

	return {
		examples: tool.display.examples,
		fields: fields.map((field) => ({
			allowed: field.values,
			defaultValue:
				field.id === MODE_FIELD_ID ? tool.outputs[0] : (field.defaultValue ?? field.values?.[0]),
			id: field.id,
			visibleWhen: field.visibleWhen,
		})),
		kind: "converter",
		requiredModes: tool.runtime === "worker" ? (modeField?.values ?? []) : [],
		takesInput: true,
		toolId: tool.id,
		undemonstratedModes: tool.undemonstratedModes ?? [],
	};
}

function exampleContext(tool: CheckedTool, example: ToolExample) {
	const context: Record<string, string> = {};

	for (const field of tool.fields) {
		if (field.defaultValue !== undefined) {
			context[field.id] = field.defaultValue;
		}
	}

	return { ...context, ...example.fields };
}

function exampleProblems(tool: CheckedTool, example: ToolExample) {
	const name = `${tool.kind} ${tool.toolId} example "${example.label}"`;
	const context = exampleContext(tool, example);
	const problems: string[] = [];

	for (const [id, value] of Object.entries(example.fields ?? {})) {
		const field = tool.fields.find((item) => item.id === id);

		if (!field) {
			problems.push(`${name} sets undeclared field ${id}`);
		} else if (field.allowed?.length && !field.allowed.includes(value)) {
			problems.push(`${name} sets ${id} to ${JSON.stringify(value)}, outside its values`);
		} else if (!isFieldVisible(field.visibleWhen, context)) {
			problems.push(`${name} sets ${id}, which its own values hide`);
		}
	}

	return problems;
}

function toolProblems(tool: CheckedTool) {
	const name = `${tool.kind} ${tool.toolId}`;
	const problems = tool.examples.flatMap((example) => exampleProblems(tool, example));
	const labels = tool.examples.map((example) => example.label);
	const demonstrated = new Set(tool.examples.map((example) => example.fields?.[MODE_FIELD_ID]));

	if (tool.takesInput && tool.examples.length === 0) {
		problems.push(`${name} takes input but has no examples`);
	}

	for (const label of new Set(labels.filter((item, index) => labels.indexOf(item) !== index))) {
		problems.push(`${name} repeats the example label "${label}"`);
	}

	for (const mode of tool.requiredModes) {
		if (!demonstrated.has(mode) && !tool.undemonstratedModes.includes(mode)) {
			problems.push(`${name} has no example for ${MODE_FIELD_ID} ${mode}`);
		}
	}

	for (const mode of tool.undemonstratedModes) {
		if (!tool.requiredModes.includes(mode) || demonstrated.has(mode)) {
			problems.push(`${name} lists ${mode} as undemonstrated, but it is not a missing mode`);
		}
	}

	return problems;
}

export function findCatalogueExampleProblems() {
	return [
		...listGeneratorTools().map(fromGenerator),
		...listConverterTools().map(fromConverter),
	].flatMap(toolProblems);
}

export function assertCatalogueExamples() {
	const problems = findCatalogueExampleProblems();

	if (problems.length > 0) {
		throw new Error(`Catalogue example problems: ${problems.join("; ")}`);
	}
}
