export type ToolFieldValues = Readonly<Record<string, string>>;

export interface ToolExample {
	fields?: ToolFieldValues;
	input?: string;
	label: string;
}

export interface FieldVisibility {
	field: string;
	values: readonly string[];
}

export function isFieldVisible(
	visibleWhen: FieldVisibility | undefined,
	values: ToolFieldValues,
): boolean {
	return !visibleWhen || visibleWhen.values.includes(values[visibleWhen.field] ?? "");
}
