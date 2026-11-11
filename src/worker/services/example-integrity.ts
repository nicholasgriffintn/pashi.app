import {
	type FieldVisibility,
	isFieldVisible,
	type ToolExample,
} from "../../shared/tool-examples.ts";
import { listConverterTools } from "./converters/catalogue";
import type { ConverterTool } from "./converters/types";
import { listGeneratorTools } from "./generators/catalogue";
import type { GeneratorTool } from "./generators/types";

const MODE_FIELD_ID = "outputFormat";

interface ExampleField {
	allowed?: readonly string[];
	defaultValue?: string;
	id: string;
	visibleWhen?: FieldVisibility;
}

interface ExampleSubject {
	acceptsInput: boolean;
	examples: readonly ToolExample[];
	fields: readonly ExampleField[];
	modes: readonly string[];
	name: string;
	needsExamples: boolean;
	requiresMode: boolean;
}

function converterSubject(tool: ConverterTool): ExampleSubject {
	const apiFields = tool.api?.fields ?? [];
	const modeField = apiFields.find((field) => field.id === MODE_FIELD_ID);

	return {
		acceptsInput: tool.input.kind === "text",
		examples: tool.display.examples,
		fields: apiFields.map((field) => ({
			allowed: field.values,
			defaultValue:
				field.id === MODE_FIELD_ID ? tool.outputs[0] : (field.defaultValue ?? field.values?.[0]),
			id: field.id,
			visibleWhen: field.visibleWhen,
		})),
		modes: tool.runtime === "worker" ? (modeField?.values ?? []) : [],
		name: `converter ${tool.id}`,
		needsExamples: true,
		requiresMode: Boolean(modeField?.values?.length),
	};
}

function generatorSubject(tool: GeneratorTool): ExampleSubject {
	const inputFields = tool.input.fields ?? [];

	return {
		acceptsInput: inputFields.length === 0 && tool.input.mode !== "none",
		examples: tool.display.examples,
		fields: inputFields.map((field) => ({
			allowed: field.options,
			defaultValue: field.placeholder,
			id: field.id,
			visibleWhen: field.visibleWhen,
		})),
		modes: [],
		name: `generator ${tool.id}`,
		needsExamples: tool.input.mode !== "none" || inputFields.length > 0,
		requiresMode: false,
	};
}

function resolvedValues(subject: ExampleSubject, example: ToolExample) {
	const defaults: Record<string, string> = {};

	for (const field of subject.fields) {
		if (field.defaultValue !== undefined) {
			defaults[field.id] = field.defaultValue;
		}
	}

	return { ...defaults, ...example.fields };
}

function exampleProblems(subject: ExampleSubject, example: ToolExample) {
	const problems: string[] = [];
	const where = `${subject.name} example "${example.label}"`;
	const values = resolvedValues(subject, example);
	const exampleFields = example.fields ?? {};

	if (example.input !== undefined && !subject.acceptsInput) {
		problems.push(`${where} sets input, but the tool takes its values from fields`);
	}

	if (subject.requiresMode && exampleFields[MODE_FIELD_ID] === undefined) {
		problems.push(`${where} does not set ${MODE_FIELD_ID}`);
	}

	for (const [id, value] of Object.entries(exampleFields)) {
		const field = subject.fields.find((item) => item.id === id);

		if (!field) {
			problems.push(`${where} sets undeclared field ${id}`);

			continue;
		}

		if (field.allowed?.length && !field.allowed.includes(value)) {
			problems.push(`${where} sets ${id} to ${value}, which is not one of its values`);
		}

		if (!isFieldVisible(field.visibleWhen, values)) {
			problems.push(`${where} sets ${id}, which is hidden for this example`);
		}
	}

	return problems;
}

function subjectProblems(subject: ExampleSubject) {
	const problems = subject.examples.flatMap((example) => exampleProblems(subject, example));

	if (subject.needsExamples && subject.examples.length === 0) {
		problems.push(`${subject.name} takes input but has no examples`);
	}

	for (const field of subject.fields) {
		if (field.visibleWhen && !subject.fields.some((item) => item.id === field.visibleWhen?.field)) {
			problems.push(`${subject.name} field ${field.id} depends on undeclared field`);
		}
	}

	for (const mode of subject.modes) {
		const isCovered = subject.examples.some(
			(example) => resolvedValues(subject, example)[MODE_FIELD_ID] === mode,
		);

		if (!isCovered) {
			problems.push(`${subject.name} mode ${mode} has no example`);
		}
	}

	return problems;
}

export function findToolExampleProblems() {
	return [
		...listGeneratorTools().map(generatorSubject),
		...listConverterTools().map(converterSubject),
	].flatMap(subjectProblems);
}

export function assertValidToolExamples() {
	const problems = findToolExampleProblems();

	if (problems.length > 0) {
		throw new Error(`Invalid tool examples: ${problems.join("; ")}`);
	}
}
