import { isFieldVisible, type ToolExample } from "../../shared/tool-examples";
import type { ConverterApiField, ConverterInfoTool } from "./converter-api";
import { pushAppPath } from "./navigation";
import { readFieldParams, type ToolValueField, visibleFieldValues } from "./tool-values";

const MODE_FIELD_ID = "outputFormat";

export interface ConverterValues {
	fields: Record<string, string>;
	input: string;
	outputFormat: string;
}

function toValueField(field: ConverterApiField): ToolValueField {
	return { allowed: field.values, id: field.id, visibleWhen: field.visibleWhen };
}

export function converterModeField(tool: ConverterInfoTool) {
	return tool.api?.fields.find((field) => field.id === MODE_FIELD_ID && field.values?.length);
}

export function converterOptionFields(tool: ConverterInfoTool) {
	return (tool.api?.fields ?? []).filter((field) => field.id !== MODE_FIELD_ID);
}

function defaultConverterFields(tool: ConverterInfoTool) {
	const fields: Record<string, string> = {};

	for (const field of converterOptionFields(tool)) {
		if (field.defaultValue !== undefined) {
			fields[field.id] = field.defaultValue;
		} else if (field.values?.length) {
			fields[field.id] = field.values[0] ?? "";
		}
	}

	return fields;
}

export function converterValuesFromExample(
	tool: ConverterInfoTool,
	example: ToolExample | undefined,
): ConverterValues {
	const { [MODE_FIELD_ID]: exampleMode, ...exampleFields } = example?.fields ?? {};
	const fallbackInput = tool.input.kind === "text" && tool.input.required ? tool.placeholder : "";

	return {
		fields: { ...defaultConverterFields(tool), ...exampleFields },
		input: tool.input.kind === "text" ? (example?.input ?? fallbackInput) : "",
		outputFormat: exampleMode ?? tool.outputs[0] ?? "",
	};
}

export function getDefaultConverterValues(tool: ConverterInfoTool) {
	return converterValuesFromExample(tool, tool.display.examples[0]);
}

export function getInitialConverterValues(tool: ConverterInfoTool): ConverterValues {
	const params = new URLSearchParams(window.location.search);
	const requestedMode = params.get(MODE_FIELD_ID);
	const mode = requestedMode !== null && tool.outputs.includes(requestedMode) ? requestedMode : "";
	const example =
		(mode && tool.display.examples.find((item) => item.fields?.[MODE_FIELD_ID] === mode)) ||
		tool.display.examples[0];
	const values = converterValuesFromExample(tool, example);

	return {
		fields: {
			...values.fields,
			...readFieldParams(params, converterOptionFields(tool).map(toValueField)),
		},
		input: params.get("input") ?? values.input,
		outputFormat: mode || values.outputFormat,
	};
}

function fieldContext(values: ConverterValues) {
	return { ...values.fields, [MODE_FIELD_ID]: values.outputFormat };
}

export function visibleConverterFields(tool: ConverterInfoTool, values: ConverterValues) {
	const context = fieldContext(values);

	return converterOptionFields(tool).filter((field) => isFieldVisible(field.visibleWhen, context));
}

export function converterRequestFields(tool: ConverterInfoTool, values: ConverterValues) {
	const visible = visibleFieldValues(
		converterOptionFields(tool).map(toValueField),
		values.fields,
		fieldContext(values),
	);
	const fields = Object.fromEntries(Object.entries(visible).filter(([, value]) => value !== ""));

	return values.outputFormat ? { ...fields, [MODE_FIELD_ID]: values.outputFormat } : fields;
}

export function converterShareFields(tool: ConverterInfoTool, values: ConverterValues) {
	const sensitiveIds = new Set(
		converterOptionFields(tool)
			.filter((field) => field.sensitive)
			.map((field) => field.id),
	);

	return Object.fromEntries(
		Object.entries(converterRequestFields(tool, values)).filter(([id]) => !sensitiveIds.has(id)),
	);
}

export function converterExamplesForMode(tool: ConverterInfoTool, outputFormat: string) {
	if (tool.input.kind !== "text" || !converterModeField(tool)) {
		return tool.display.examples;
	}

	return tool.display.examples.filter(
		(example) => example.fields?.[MODE_FIELD_ID] === outputFormat,
	);
}

export function getRouteConverterId() {
	const [, converterId] = window.location.pathname.split("/").filter(Boolean);

	return window.location.pathname.startsWith("/convert/") ? converterId : undefined;
}

export function findConverterByRoute(
	tools: readonly ConverterInfoTool[],
	routeConverterId: string | undefined,
) {
	const normalisedRouteConverterId = routeConverterId?.trim().toLowerCase();

	if (!normalisedRouteConverterId) {
		return undefined;
	}

	return tools.find(
		(tool) =>
			tool.id === normalisedRouteConverterId || tool.aliases.includes(normalisedRouteConverterId),
	);
}

export function pushConverterRoute(toolId: string) {
	pushAppPath(`/convert/${toolId}`);
}
