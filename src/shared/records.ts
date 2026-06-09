export type StringRecord = Record<string, string>;

export function isRecordArray(value: unknown[]): value is StringRecord[] {
	return value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item));
}

export function isStringArray(value: unknown[]): value is string[] {
	return value.every((item) => typeof item === "string");
}

export function recordToText(record: StringRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
}

export function uniqueKeys(records: readonly StringRecord[]) {
	return [...new Set(records.flatMap((record) => Object.keys(record)))];
}
