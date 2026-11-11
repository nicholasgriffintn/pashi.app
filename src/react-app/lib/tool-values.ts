import { type FieldVisibility, isFieldVisible } from "../../shared/tool-examples";

export interface ToolValueField {
	allowed?: readonly string[];
	id: string;
	visibleWhen?: FieldVisibility;
}

export function readFieldParams(params: URLSearchParams, fields: readonly ToolValueField[]) {
	const values: Record<string, string> = {};

	for (const field of fields) {
		const value = params.get(field.id);

		if (value !== null && (!field.allowed?.length || field.allowed.includes(value))) {
			values[field.id] = value;
		}
	}

	return values;
}

export function visibleFieldValues(
	fields: readonly ToolValueField[],
	values: Readonly<Record<string, string>>,
	context: Readonly<Record<string, string>> = values,
) {
	const visible: Record<string, string> = {};

	for (const field of fields) {
		const value = values[field.id];

		if (value !== undefined && isFieldVisible(field.visibleWhen, context)) {
			visible[field.id] = value;
		}
	}

	return visible;
}
